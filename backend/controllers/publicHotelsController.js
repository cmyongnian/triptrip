const Hotel = require('../models/Hotel');

const calcMinPrice = (roomTypes = []) => {
    const prices = (roomTypes || [])
        .map(rt => Number(rt?.price))
        .filter(v => Number.isFinite(v));
    return prices.length ? Math.min(...prices) : 0;
};

const sortRoomTypesByPriceAsc = (roomTypes = []) => {
    return [...(roomTypes || [])].sort((a, b) => {
        const pa = Number.isFinite(Number(a?.price)) ? Number(a.price) : Number.MAX_SAFE_INTEGER;
        const pb = Number.isFinite(Number(b?.price)) ? Number(b.price) : Number.MAX_SAFE_INTEGER;
        return pa - pb;
    });
};

// GET /api/public/hotels/meta
exports.getMeta = async (req, res, next) => {
    try {
        const hotels = await Hotel.find({ status: 'approved' }).select('city tags starRating roomTypes');

        const citySet = new Set();
        const tagSet = new Set();

        let minPrice = Infinity;
        let maxPrice = 0;

        for (const h of hotels) {
            if (h.city) citySet.add(h.city);

            if (Array.isArray(h.tags)) {
                h.tags.forEach(tag => {
                    if (tag) tagSet.add(tag);
                });
            }

            if (Array.isArray(h.roomTypes)) {
                h.roomTypes.forEach(rt => {
                    const p = Number(rt?.price);
                    if (Number.isFinite(p)) {
                        minPrice = Math.min(minPrice, p);
                        maxPrice = Math.max(maxPrice, p);
                    }
                });
            }
        }

        if (!Number.isFinite(minPrice)) minPrice = 0;
        if (!maxPrice) maxPrice = 2000;

        return res.json({
            cities: Array.from(citySet),
            tags: Array.from(tagSet),
            starRatings: [3, 4, 5],
            priceRange: { min: minPrice, max: maxPrice }
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/public/hotels/banners
exports.getBanners = async (req, res, next) => {
    try {
        const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 10);

        const hotels = await Hotel.find({ status: 'approved', featured: true })
            .select('nameCn nameEn city bannerImage images')
            .limit(limit);

        const items = hotels.map(h => {
            const id = String(h._id);
            return {
                id,
                hotelId: id, // 兼容一些前端写法
                title: h.nameCn || h.nameEn || '精选酒店',
                subtitle: h.city || '',
                imageUrl: h.bannerImage || (Array.isArray(h.images) ? h.images[0] : '') || ''
            };
        });

        return res.json({ items });
    } catch (err) {
        next(err);
    }
};

// GET /api/public/hotels
exports.listHotels = async (req, res, next) => {
    try {
        const {
            city,
            keyword,
            star,
            tags,
            page = 1,
            pageSize = 10,
            sort = 'recommended' // recommended | priceAsc | priceDesc
        } = req.query;

        const filter = { status: 'approved' };

        if (city) filter.city = city;
        if (star) filter.starRating = Number(star);

        if (keyword) {
            filter.$or = [
                { nameCn: { $regex: keyword, $options: 'i' } },
                { nameEn: { $regex: keyword, $options: 'i' } },
                { address: { $regex: keyword, $options: 'i' } },
                { city: { $regex: keyword, $options: 'i' } }
            ];
        }

        if (tags) {
            const tagList = String(tags)
                .split(',')
                .map(t => t.trim())
                .filter(Boolean);
            if (tagList.length) {
                filter.tags = { $all: tagList };
            }
        }

        const p = Math.max(Number(page) || 1, 1);
        const ps = Math.min(Math.max(Number(pageSize) || 10, 1), 50);
        const skip = (p - 1) * ps;

        const [total, hotels] = await Promise.all([
            Hotel.countDocuments(filter),
            Hotel.find(filter)
                .select('nameCn nameEn city address starRating images bannerImage roomTypes tags amenities featured')
                .skip(skip)
                .limit(ps)
        ]);

        let items = hotels.map(h => {
            const id = String(h._id);
            const minPrice = calcMinPrice(h.roomTypes || []);
            return {
                id,
                hotelId: id,
                name: h.nameCn || h.nameEn || '未命名酒店',
                city: h.city || '',
                address: h.address || '',
                starRating: h.starRating || 0,
                tags: h.tags || [],
                amenities: h.amenities || [],
                imageUrl: h.bannerImage || (h.images && h.images[0]) || '',
                minPrice,
                featured: !!h.featured
            };
        });

        if (sort === 'priceAsc') items.sort((a, b) => a.minPrice - b.minPrice);
        if (sort === 'priceDesc') items.sort((a, b) => b.minPrice - a.minPrice);
        if (sort === 'recommended') {
            items.sort((a, b) => {
                if (Number(b.featured) !== Number(a.featured)) return Number(b.featured) - Number(a.featured);
                if (b.starRating !== a.starRating) return b.starRating - a.starRating;
                return a.minPrice - b.minPrice;
            });
        }

        return res.json({
            items,
            pagination: {
                page: p,
                pageSize: ps,
                total,
                totalPages: Math.ceil(total / ps)
            }
        });
    } catch (err) {
        next(err);
    }
};

// GET /api/public/hotels/:id
exports.getHotelDetail = async (req, res, next) => {
    try {
        const hotel = await Hotel.findOne({ _id: req.params.id, status: 'approved' }).select(
            'nameCn nameEn city address starRating openingDate images bannerImage roomTypes tags amenities geo featured'
        );

        if (!hotel) {
            return res.status(404).json({ message: 'Hotel not found' });
        }

        const id = String(hotel._id);
        const roomTypesSorted = sortRoomTypesByPriceAsc(hotel.roomTypes || []);
        const minPrice = calcMinPrice(roomTypesSorted);

        return res.json({
            id,
            hotelId: id,
            name: hotel.nameCn || hotel.nameEn || '未命名酒店',
            city: hotel.city || '',
            address: hotel.address || '',
            starRating: hotel.starRating || 0,
            openingDate: hotel.openingDate || null,
            images: hotel.images || [],
            bannerImage: hotel.bannerImage || '',
            tags: hotel.tags || [],
            amenities: hotel.amenities || [],
            roomTypes: roomTypesSorted,
            minPrice,
            geo: hotel.geo || null,
            featured: !!hotel.featured
        });
    } catch (err) {
        next(err);
    }
};