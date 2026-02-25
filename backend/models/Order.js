const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
    {
        orderNo: {
            type: String,
            required: true,
            unique: true,
            index: true
        },

        // 订单状态（简化版）
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'cancelled', 'completed'],
            default: 'pending',
            index: true
        },

        // 来源（便于后续扩展）
        source: {
            type: String,
            enum: ['mobile', 'pc', 'manual'],
            default: 'mobile'
        },

        // 酒店与商户关联
        hotelId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hotel',
            required: true,
            index: true
        },
        merchantId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false,
            index: true
        },

        // 房型（子文档ID）
        roomTypeId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        // 入住信息
        checkInDate: {
            type: Date,
            required: true
        },
        checkOutDate: {
            type: Date,
            required: true
        },
        nights: {
            type: Number,
            required: true,
            min: 1
        },
        roomCount: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        },

        // 联系人
        guestName: {
            type: String,
            required: true,
            trim: true
        },
        phone: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        remarks: {
            type: String,
            default: '',
            trim: true
        },

        // ===== 快照字段（重点）=====
        hotelNameSnapshot: {
            type: String,
            required: true
        },
        hotelCitySnapshot: {
            type: String,
            default: ''
        },
        hotelAddressSnapshot: {
            type: String,
            default: ''
        },
        starRatingSnapshot: {
            type: Number,
            default: 0
        },

        roomTypeNameSnapshot: {
            type: String,
            required: true
        },
        bedTypeSnapshot: {
            type: String,
            default: ''
        },
        breakfastIncludedSnapshot: {
            type: Boolean,
            default: false
        },
        cancelPolicySnapshot: {
            type: String,
            default: 'free_cancellation'
        },
        maxGuestsSnapshot: {
            type: Number,
            default: 2
        },

        priceSnapshot: {
            type: Number,
            required: true,
            min: 0
        },
        totalPrice: {
            type: Number,
            required: true,
            min: 0
        },

        // 取消信息
        cancelReason: {
            type: String,
            default: ''
        },
        cancelledAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ phone: 1, createdAt: -1 });
OrderSchema.index({ merchantId: 1, createdAt: -1 });
OrderSchema.index({ hotelId: 1, createdAt: -1 });

module.exports = mongoose.model('Order', OrderSchema);