const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');

const Hotel = require('../models/Hotel');
const Order = require('../models/Order');
const { AppError } = require('../middleware/errorHandler');

function validate(req, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const msg = errors.array().map(e => e.msg).join('. ');
        next(new AppError(msg, 400));
        return false;
    }
    return true;
}

function calcNights(checkInDate, checkOutDate) {
    const inTime = new Date(checkInDate).setHours(0, 0, 0, 0);
    const outTime = new Date(checkOutDate).setHours(0, 0, 0, 0);
    const diff = outTime - inTime;
    const nights = Math.ceil(diff / (24 * 3600 * 1000));
    return nights;
}

function genOrderNo() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ts =
        d.getFullYear() +
        pad(d.getMonth() + 1) +
        pad(d.getDate()) +
        pad(d.getHours()) +
        pad(d.getMinutes()) +
        pad(d.getSeconds());
    const rand = Math.floor(Math.random() * 9000 + 1000);
    return `TT${ts}${rand}`;
}

function normalizeCancelPolicy(v) {
    if (!v) return 'free_cancellation';
    if (['free_cancellation', '免费取消', 'free', 'free_cancel'].includes(v)) return 'free_cancellation';
    if (['non_refundable', '不可取消', 'no_refund'].includes(v)) return 'non_refundable';
    return String(v);
}

function buildOrderResponse(orderDoc) {
    return {
        id: String(orderDoc._id),
        orderNo: orderDoc.orderNo,
        status: orderDoc.status,
        hotelId: String(orderDoc.hotelId),
        hotelName: orderDoc.hotelNameSnapshot,
        roomTypeId: String(orderDoc.roomTypeId),
        roomTypeName: orderDoc.roomTypeNameSnapshot,
        checkInDate: orderDoc.checkInDate,
        checkOutDate: orderDoc.checkOutDate,
        nights: orderDoc.nights,
        roomCount: orderDoc.roomCount,
        guestName: orderDoc.guestName,
        phone: orderDoc.phone,
        priceSnapshot: orderDoc.priceSnapshot,
        totalPrice: orderDoc.totalPrice,
        cancelPolicy: orderDoc.cancelPolicySnapshot,
        breakfastIncluded: orderDoc.breakfastIncludedSnapshot,
        maxGuests: orderDoc.maxGuestsSnapshot,
        createdAt: orderDoc.createdAt,
        remarks: orderDoc.remarks || ''
    };
}

// 创建订单（移动端游客版）
router.post(
    '/',
    [
        body('hotelId', 'hotelId is required').notEmpty(),
        body('roomTypeId', 'roomTypeId is required').notEmpty(),
        body('checkInDate', 'checkInDate must be ISO date').isISO8601(),
        body('checkOutDate', 'checkOutDate must be ISO date').isISO8601(),
        body('roomCount', 'roomCount must be 1-5').optional().isInt({ min: 1, max: 5 }),
        body('guestName', 'guestName is required').notEmpty(),
        body('phone', 'phone is required').notEmpty(),
        body('remarks').optional().isString()
    ],
    async (req, res, next) => {
        if (!validate(req, next)) return;

        try {
            const {
                hotelId,
                roomTypeId,
                checkInDate,
                checkOutDate,
                roomCount = 1,
                guestName,
                phone,
                remarks = ''
            } = req.body;

            const nights = calcNights(checkInDate, checkOutDate);
            if (nights <= 0) {
                return next(new AppError('checkOutDate must be later than checkInDate', 400));
            }

            // 仅允许预订已审核通过的酒店（如果你测试需要，可去掉 status 条件）
            const hotel = await Hotel.findOne({ _id: hotelId, status: 'approved' });
            if (!hotel) {
                return next(new AppError('Hotel not found or not available', 404));
            }

            const roomType = hotel.roomTypes.id(roomTypeId);
            if (!roomType) {
                return next(new AppError('Room type not found', 404));
            }

            if (Number(roomType.inventory || 0) <= 0) {
                return next(new AppError('This room type is sold out', 400));
            }

            const count = Number(roomCount);
            if (count < 1 || count > 5) {
                return next(new AppError('roomCount must be between 1 and 5', 400));
            }

            // 简化版：不做真实库存扣减，只做下单校验
            const unitPrice = Number(roomType.price || 0);
            const totalPrice = unitPrice * nights * count;

            // 防止 orderNo 极低概率碰撞
            let orderNo = genOrderNo();
            // eslint-disable-next-line no-await-in-loop
            while (await Order.exists({ orderNo })) {
                orderNo = genOrderNo();
            }

            const order = new Order({
                orderNo,
                status: 'pending',
                source: 'mobile',

                hotelId: hotel._id,
                merchantId: hotel.createdBy || undefined,
                roomTypeId: roomType._id,

                checkInDate: new Date(checkInDate),
                checkOutDate: new Date(checkOutDate),
                nights,
                roomCount: count,

                guestName: String(guestName).trim(),
                phone: String(phone).trim(),
                remarks: String(remarks || '').trim(),

                // 酒店快照
                hotelNameSnapshot: hotel.nameCn || hotel.nameEn || '未命名酒店',
                hotelCitySnapshot: hotel.city || '',
                hotelAddressSnapshot: hotel.address || '',
                starRatingSnapshot: Number(hotel.starRating || 0),

                // 房型快照
                roomTypeNameSnapshot: roomType.type || '未命名房型',
                bedTypeSnapshot: roomType.bedType || '',
                breakfastIncludedSnapshot: !!roomType.breakfastIncluded,
                cancelPolicySnapshot: normalizeCancelPolicy(roomType.cancelPolicy),
                maxGuestsSnapshot: Number(roomType.maxGuests || 2),

                // 价格快照
                priceSnapshot: unitPrice,
                totalPrice
            });

            await order.save();

            res.status(201).json(buildOrderResponse(order));
        } catch (error) {
            console.error(error.message);
            next(error);
        }
    }
);

// 按手机号查询订单（简化版“我的订单”）
router.get(
    '/query',
    [query('phone', 'phone is required').notEmpty()],
    async (req, res, next) => {
        if (!validate(req, next)) return;

        try {
            const phone = String(req.query.phone || '').trim();

            const orders = await Order.find({ phone })
                .sort({ createdAt: -1 })
                .limit(50);

            res.json(orders.map(buildOrderResponse));
        } catch (error) {
            console.error(error.message);
            next(error);
        }
    }
);

// 取消订单（简化版，按手机号校验）
router.post(
    '/:id/cancel',
    [
        body('phone', 'phone is required').notEmpty(),
        body('reason').optional().isString()
    ],
    async (req, res, next) => {
        if (!validate(req, next)) return;

        try {
            const { id } = req.params;
            const phone = String(req.body.phone || '').trim();
            const reason = String(req.body.reason || '用户取消').trim();

            const order = await Order.findById(id);
            if (!order) return next(new AppError('Order not found', 404));

            if (String(order.phone) !== phone) {
                return next(new AppError('Phone verification failed', 403));
            }

            if (order.status === 'cancelled') {
                return next(new AppError('Order already cancelled', 400));
            }

            if (order.status === 'completed') {
                return next(new AppError('Completed order cannot be cancelled', 400));
            }

            const policy = normalizeCancelPolicy(order.cancelPolicySnapshot);
            if (policy === 'non_refundable') {
                return next(new AppError('This order is non-refundable and cannot be cancelled', 400));
            }

            order.status = 'cancelled';
            order.cancelReason = reason;
            order.cancelledAt = new Date();

            await order.save();

            res.json(buildOrderResponse(order));
        } catch (error) {
            console.error(error.message);
            next(error);
        }
    }
);

module.exports = router;