// backend/routes/public-hotels.js
const express = require('express')
const router = express.Router()
const { getMeta, getBanners } = require('../controllers/publicHotelsController')

router.get('/meta', getMeta)
router.get('/banners', getBanners)

module.exports = router
