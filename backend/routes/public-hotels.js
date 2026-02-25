const express = require('express')
const router = express.Router()

const {
    getMeta,
    getBanners,
    listHotels,
    getHotelDetail
} = require('../controllers/publicHotelsController')

router.get('/meta', getMeta)
router.get('/banners', getBanners)

// 新增：公开酒店列表
router.get('/', listHotels)

// 新增：公开酒店详情
router.get('/:id', getHotelDetail)

module.exports = router