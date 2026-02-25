const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Hotel = require('../models/Hotel');
const { verifyToken, requireRole } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

const validate = (req, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join('. ');
    next(new AppError(errorMessages, 400));
    return false;
  }
  return true;
};

const getOwnerId = (hotel) => {
  if (!hotel) return '';
  if (hotel.createdBy && hotel.createdBy._id) return String(hotel.createdBy._id);
  return String(hotel.createdBy || '');
};

const canAccessHotel = (req, hotel) => {
  if (req.user.role === 'admin') return true;
  return getOwnerId(hotel) === String(req.user.id);
};

const normalizeStringArray = (arr) => {
  if (!Array.isArray(arr)) return [];
  return Array.from(
    new Set(
      arr.map(v => (typeof v === 'string' ? v.trim() : '')).filter(Boolean)
    )
  );
};

const normalizeImages = (arr) => {
  if (!Array.isArray(arr)) return [];
  return arr.map(v => (typeof v === 'string' ? v.trim() : '')).filter(Boolean);
};

const normalizeCancelPolicy = (value) => {
  if (typeof value !== 'string') return 'free_cancellation';
  const v = value.trim();

  // 兼容中文/旧值写法
  const aliasMap = {
    free: 'free_cancellation',
    free_cancel: 'free_cancellation',
    free_cancellation: 'free_cancellation',
    '免费取消': 'free_cancellation',

    non_refundable: 'non_refundable',
    no_refund: 'non_refundable',
    '不可取消': 'non_refundable'
  };

  return aliasMap[v] || 'free_cancellation';
};

const normalizeRoomTypes = (arr) => {
  if (!Array.isArray(arr)) return [];

  return arr
    .map(rt => {
      const type = typeof rt?.type === 'string' ? rt.type.trim() : '';
      const price = Number(rt?.price);
      const bedType = typeof rt?.bedType === 'string' ? rt.bedType.trim() : '';
      const breakfastIncluded = !!rt?.breakfastIncluded;
      const cancelPolicy = normalizeCancelPolicy(rt?.cancelPolicy);

      const maxGuestsRaw = Number(rt?.maxGuests);
      const maxGuests = Number.isFinite(maxGuestsRaw) && maxGuestsRaw >= 1
        ? Math.min(Math.floor(maxGuestsRaw), 10)
        : 2;

      const inventoryRaw = Number(rt?.inventory);
      const inventory = Number.isFinite(inventoryRaw) && inventoryRaw >= 0
        ? Math.floor(inventoryRaw)
        : 10;

      const payload = {
        type,
        price,
        bedType,
        breakfastIncluded,
        cancelPolicy,
        maxGuests,
        inventory
      };

      // 编辑场景保留子文档 _id
      if (rt && rt._id) payload._id = rt._id;

      return payload;
    })
    .filter(rt => rt.type && Number.isFinite(rt.price) && rt.price >= 0);
};

const buildHotelPayload = (body) => {
  const payload = {
    nameCn: String(body.nameCn || '').trim(),
    nameEn: String(body.nameEn || '').trim(),
    address: String(body.address || '').trim(),
    city: String(body.city || '').trim(),
    starRating: Number(body.starRating),
    openingDate: body.openingDate ? new Date(body.openingDate) : null,
    roomTypes: normalizeRoomTypes(body.roomTypes),

    // 移动端展示字段
    bannerImage: typeof body.bannerImage === 'string' ? body.bannerImage.trim() : '',
    images: normalizeImages(body.images),
    tags: normalizeStringArray(body.tags),
    amenities: normalizeStringArray(body.amenities),
    featured: !!body.featured
  };

  // 可选坐标
  const hasGeo =
    body.geo &&
    Array.isArray(body.geo.coordinates) &&
    body.geo.coordinates.length === 2;

  if (hasGeo) {
    const lng = Number(body.geo.coordinates[0]);
    const lat = Number(body.geo.coordinates[1]);
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      payload.geo = {
        type: 'Point',
        coordinates: [lng, lat]
      };
    }
  } else {
    payload.geo = undefined;
  }

  return payload;
};

const roomTypeValidators = [
  body('type', 'Room type is required').notEmpty(),
  body('price', 'Room price must be a positive number').isFloat({ min: 0 }),
  body('bedType').optional().isString().withMessage('Bed type must be a string'),
  body('breakfastIncluded').optional().isBoolean().withMessage('BreakfastIncluded must be boolean'),
  body('cancelPolicy')
    .optional()
    .isIn(['free_cancellation', 'non_refundable', '免费取消', '不可取消', 'free', 'free_cancel', 'no_refund'])
    .withMessage('Invalid cancel policy'),
  body('maxGuests').optional().isInt({ min: 1, max: 10 }).withMessage('Max guests must be 1-10'),
  body('inventory').optional().isInt({ min: 0 }).withMessage('Inventory must be >= 0')
];

const hotelValidators = [
  body('nameCn', 'Chinese name is required').notEmpty(),
  body('nameEn', 'English name is required').notEmpty(),
  body('address', 'Address is required').notEmpty(),
  body('city', 'City is required').notEmpty(),
  body('starRating', 'Star rating must be between 3 and 5').isInt({ min: 3, max: 5 }),
  body('openingDate', 'Opening date is required').isISO8601(),

  body('roomTypes', 'Room types are required').isArray({ min: 1 }),
  body('roomTypes.*.type', 'Room type is required').notEmpty(),
  body('roomTypes.*.price', 'Room price must be a positive number').isFloat({ min: 0 }),
  body('roomTypes.*.bedType').optional().isString().withMessage('Room bed type must be a string'),
  body('roomTypes.*.breakfastIncluded').optional().isBoolean().withMessage('BreakfastIncluded must be boolean'),
  body('roomTypes.*.cancelPolicy')
    .optional()
    .isIn(['free_cancellation', 'non_refundable', '免费取消', '不可取消', 'free', 'free_cancel', 'no_refund'])
    .withMessage('Invalid room cancel policy'),
  body('roomTypes.*.maxGuests').optional().isInt({ min: 1, max: 10 }).withMessage('Room max guests must be 1-10'),
  body('roomTypes.*.inventory').optional().isInt({ min: 0 }).withMessage('Room inventory must be >= 0'),

  body('images').optional().isArray().withMessage('Images must be an array'),
  body('images.*').optional().isString().withMessage('Each image must be a string URL'),

  body('bannerImage').optional().isString().withMessage('Banner image must be a string URL'),

  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('tags.*').optional().isString().withMessage('Each tag must be a string'),

  body('amenities').optional().isArray().withMessage('Amenities must be an array'),
  body('amenities.*').optional().isString().withMessage('Each amenity must be a string'),

  body('featured').optional().isBoolean().withMessage('Featured must be boolean'),

  body('geo').optional().isObject().withMessage('Geo must be an object'),
  body('geo.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 })
    .withMessage('Geo coordinates must be [lng, lat]'),
  body('geo.coordinates.*').optional().isFloat().withMessage('Geo coordinate must be number')
];

// 创建酒店（商户）
router.post(
  '/',
  [verifyToken, requireRole(['merchant']), ...hotelValidators],
  async (req, res, next) => {
    if (!validate(req, next)) return;

    try {
      const payload = buildHotelPayload(req.body);
      const newHotel = new Hotel({
        ...payload,
        createdBy: req.user.id,
        status: 'pending',
        reason: ''
      });

      await newHotel.save();
      res.status(201).json(newHotel);
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }
);

// 获取酒店列表（管理员看全部，商户看自己的）
router.get('/', verifyToken, async (req, res, next) => {
  try {
    let hotels;
    if (req.user.role === 'admin') {
      hotels = await Hotel.find().populate('createdBy', 'username role').sort({ updatedAt: -1 });
    } else {
      hotels = await Hotel.find({ createdBy: req.user.id }).sort({ updatedAt: -1 });
    }
    res.json(hotels);
  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

// 获取单个酒店详情
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.id).populate('createdBy', 'username role');
    if (!hotel) return next(new AppError('Hotel not found', 404));

    if (!canAccessHotel(req, hotel)) {
      return next(new AppError('Access denied', 403));
    }

    res.json(hotel);
  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

// 更新酒店基础信息/移动端展示字段（商户/管理员）
router.put(
  '/:id',
  [verifyToken, ...hotelValidators],
  async (req, res, next) => {
    if (!validate(req, next)) return;

    try {
      const hotel = await Hotel.findById(req.params.id);
      if (!hotel) return next(new AppError('Hotel not found', 404));

      if (!canAccessHotel(req, hotel)) {
        return next(new AppError('Access denied', 403));
      }

      const payload = buildHotelPayload(req.body);
      Object.assign(hotel, payload);

      // 商户编辑后重新待审核
      if (req.user.role === 'merchant') {
        hotel.status = 'pending';
        hotel.reason = '';
      }

      await hotel.save();
      res.json(hotel);
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }
);

// 更新酒店状态（仅管理员）
router.put(
  '/:id/status',
  [
    verifyToken,
    requireRole(['admin']),
    body('status', 'Status is required').isIn(['pending', 'approved', 'rejected', 'offline']),
    body('reason', 'Reason is required for rejected status')
      .if(body('status').equals('rejected'))
      .notEmpty()
  ],
  async (req, res, next) => {
    if (!validate(req, next)) return;

    const { status, reason } = req.body;

    try {
      const hotel = await Hotel.findById(req.params.id);
      if (!hotel) return next(new AppError('Hotel not found', 404));

      hotel.status = status;
      hotel.reason = status === 'rejected' ? String(reason || '').trim() : '';
      await hotel.save();

      res.json(hotel);
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }
);

// 删除酒店
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel) return next(new AppError('Hotel not found', 404));

    if (!canAccessHotel(req, hotel)) {
      return next(new AppError('Access denied', 403));
    }

    await hotel.deleteOne();
    res.json({ message: 'Hotel deleted successfully' });
  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

// 添加房间类型（增强版字段）
router.post(
  '/:hotelId/room-types',
  [verifyToken, ...roomTypeValidators],
  async (req, res, next) => {
    if (!validate(req, next)) return;

    try {
      const hotel = await Hotel.findById(req.params.hotelId);
      if (!hotel) return next(new AppError('Hotel not found', 404));
      if (!canAccessHotel(req, hotel)) return next(new AppError('Access denied', 403));

      const roomTypePayload = normalizeRoomTypes([req.body])[0];
      if (!roomTypePayload) {
        return next(new AppError('Invalid room type payload', 400));
      }

      hotel.roomTypes.push(roomTypePayload);

      if (req.user.role === 'merchant') {
        hotel.status = 'pending';
        hotel.reason = '';
      }

      await hotel.save();
      res.status(201).json(hotel.roomTypes[hotel.roomTypes.length - 1]);
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }
);

// 更新房间类型（增强版字段）
router.put(
  '/:hotelId/room-types/:roomTypeId',
  [verifyToken, ...roomTypeValidators],
  async (req, res, next) => {
    if (!validate(req, next)) return;

    try {
      const hotel = await Hotel.findById(req.params.hotelId);
      if (!hotel) return next(new AppError('Hotel not found', 404));
      if (!canAccessHotel(req, hotel)) return next(new AppError('Access denied', 403));

      const roomType = hotel.roomTypes.id(req.params.roomTypeId);
      if (!roomType) return next(new AppError('Room type not found', 404));

      const normalized = normalizeRoomTypes([{ ...req.body, _id: roomType._id }])[0];
      if (!normalized) {
        return next(new AppError('Invalid room type payload', 400));
      }

      roomType.type = normalized.type;
      roomType.price = normalized.price;
      roomType.bedType = normalized.bedType;
      roomType.breakfastIncluded = normalized.breakfastIncluded;
      roomType.cancelPolicy = normalized.cancelPolicy;
      roomType.maxGuests = normalized.maxGuests;
      roomType.inventory = normalized.inventory;

      if (req.user.role === 'merchant') {
        hotel.status = 'pending';
        hotel.reason = '';
      }

      await hotel.save();
      res.json(roomType);
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }
);

// 删除房间类型
router.delete('/:hotelId/room-types/:roomTypeId', verifyToken, async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.hotelId);
    if (!hotel) return next(new AppError('Hotel not found', 404));
    if (!canAccessHotel(req, hotel)) return next(new AppError('Access denied', 403));

    const roomType = hotel.roomTypes.id(req.params.roomTypeId);
    if (!roomType) return next(new AppError('Room type not found', 404));

    roomType.deleteOne();

    if (req.user.role === 'merchant') {
      hotel.status = 'pending';
      hotel.reason = '';
    }

    await hotel.save();
    res.json({ message: 'Room type deleted successfully' });
  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

module.exports = router;