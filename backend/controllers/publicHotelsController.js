// backend/controllers/publicHotelsController.js
const Hotel = require('../models/Hotel')

// GET /api/public/hotels/meta
exports.getMeta = async (req, res, next) => {
    try {
        const filter = { status: 'approved' }

        // cities/tags 从已发布酒店做 distinct
        const [cities, tags] = await Promise.all([
            Hotel.distinct('city', filter),
            Hotel.distinct('tags', filter)
        ])

        // 星级固定 3-5（与现有 schema 一致）
        const starRatings = [3, 4, 5]

        // 价格范围：简单做法：从 roomTypes.price 拉出所有价格求 min/max
        // 注意：数据量大时不建议全表扫；后续可引入聚合 + 索引 / 或持久化 minPrice
        const hotels = await Hotel.find(filter).select('roomTypes.price')
        const prices = hotels.flatMap(h => (h.roomTypes || []).map(rt => rt.price))
        const min = prices.length ? Math.min(...prices) : 0
        const max = prices.length ? Math.max(...prices) : 2000

        res.json({
            cities: (cities || []).filter(Boolean),
            tags: (tags || []).filter(Boolean),
            starRatings,
            priceRange: { min, max }
        })
    } catch (err) {
        next(err)
    }
}

// GET /api/public/hotels/banners?limit=5
exports.getBanners = async (req, res, next) => {
    try {
        const limit = Math.min(Number(req.query.limit || 5), 10)
        const hotels = await Hotel.find({ status: 'approved', featured: true })
            .limit(limit)
            .select('nameCn bannerImage starRating address roomTypes')

        const items = hotels.map(h => {
            const prices = (h.roomTypes || []).map(rt => rt.price)
            const minPrice = prices.length ? Math.min(...prices) : 0
            return {
                hotelId: String(h._id),
                title: h.nameCn,
                imageUrl: h.bannerImage || '',
                starRating: h.starRating,
                address: h.address,
                minPrice
            }
        })

        res.json({ items })
    } catch (err) {
        next(err)
    }
}
