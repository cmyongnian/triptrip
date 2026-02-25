const mongoose = require('mongoose');

const RoomTypeSchema = new mongoose.Schema(
  {
    // 房型名称：标准间 / 大床房 / 豪华套房
    type: {
      type: String,
      required: true,
      trim: true
    },

    // 价格（基础价）
    price: {
      type: Number,
      required: true,
      min: 0
    },

    // 床型：大床 / 双床 / 多床 / 套房床型说明
    bedType: {
      type: String,
      trim: true,
      default: ''
    },

    // 是否含早
    breakfastIncluded: {
      type: Boolean,
      default: false
    },

    // 取消政策（建议枚举值，前端显示中文）
    cancelPolicy: {
      type: String,
      enum: ['free_cancellation', 'non_refundable'],
      default: 'free_cancellation'
    },

    // 最大入住人数
    maxGuests: {
      type: Number,
      min: 1,
      max: 10,
      default: 2
    },

    // 总库存（先做简化版，不做按日期库存）
    inventory: {
      type: Number,
      min: 0,
      default: 10
    }
  },
  { _id: true }
);

const HotelSchema = new mongoose.Schema(
  {
    nameCn: {
      type: String,
      required: true,
      trim: true
    },
    nameEn: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    starRating: {
      type: Number,
      required: true,
      enum: [3, 4, 5]
    },
    openingDate: {
      type: Date,
      required: true
    },

    // ✅ 增强房型
    roomTypes: {
      type: [RoomTypeSchema],
      default: []
    },

    // 移动端展示字段
    bannerImage: {
      type: String,
      trim: true,
      default: ''
    },
    images: {
      type: [String],
      default: []
    },
    tags: {
      type: [String],
      default: []
    },
    amenities: {
      type: [String],
      default: []
    },

    // 地理位置（可选）
    geo: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: undefined
      }
    },

    // 运营字段
    featured: {
      type: Boolean,
      default: false
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'offline'],
      default: 'pending'
    },
    reason: {
      type: String,
      default: ''
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// 常用索引（列表查询会更快）
HotelSchema.index({ status: 1 });
HotelSchema.index({ city: 1 });
HotelSchema.index({ createdBy: 1 });
HotelSchema.index({ featured: 1 });

module.exports = mongoose.model('Hotel', HotelSchema);