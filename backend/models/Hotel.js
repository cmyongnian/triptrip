// backend/models/Hotel.js
const mongoose = require('mongoose')

const RoomTypeSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    price: { type: Number, required: true, min: 0 }
  },
  { _id: true }
)

const GeoSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: undefined } // [lng, lat]
  },
  { _id: false }
)

const HotelSchema = new mongoose.Schema(
  {
    nameCn: { type: String, required: true, trim: true },
    nameEn: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    starRating: { type: Number, required: true, min: 3, max: 5 },
    openingDate: { type: Date, required: true },

    // 发布状态：你已有 enum，可直接用 approved 作为“已发布”
    status: {
      type: String,
      required: true,
      enum: ['pending', 'approved', 'rejected', 'offline'],
      default: 'pending'
    },
    reason: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    roomTypes: [RoomTypeSchema],

    // ===== 新增：移动端展示字段（可选）=====
    city: { type: String, trim: true },
    images: [{ type: String }],
    bannerImage: { type: String },
    tags: [{ type: String, trim: true }],
    amenities: [{ type: String, trim: true }],
    geo: GeoSchema,

    // 首页 Banner 是否展示（建议）
    featured: { type: Boolean, default: false }
  },
  { timestamps: true }
)

// 可选：如果你未来要做“附近酒店”，建议建 2dsphere 索引
// HotelSchema.index({ geo: '2dsphere' })

module.exports = mongoose.model('Hotel', HotelSchema)
