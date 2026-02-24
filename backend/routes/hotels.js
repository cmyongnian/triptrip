const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Hotel = require('../models/Hotel');
const { verifyToken, requireRole } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// 创建酒店路由（商家）
router.post('/', [
  verifyToken,
  requireRole(['merchant']),
  body('nameCn', 'Chinese name is required').notEmpty(),
  body('nameEn', 'English name is required').notEmpty(),
  body('address', 'Address is required').notEmpty(),
  body('starRating', 'Star rating must be between 3 and 5').isInt({ min: 3, max: 5 }),
  body('openingDate', 'Opening date is required').isISO8601(),
  body('roomTypes', 'Room types are required').isArray({ min: 1 }),
  body('roomTypes.*.type', 'Room type is required').notEmpty(),
  body('roomTypes.*.price', 'Room price must be a positive number').isFloat({ min: 0 })
], async (req, res, next) => {
  // 验证请求参数
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join('. ');
    return next(new AppError(errorMessages, 400));
  }

  const { nameCn, nameEn, address, starRating, openingDate, roomTypes } = req.body;

  try {
    // 创建新酒店
    const newHotel = new Hotel({
      nameCn,
      nameEn,
      address,
      starRating,
      openingDate: new Date(openingDate),
      roomTypes,
      createdBy: req.user.id
    });

    await newHotel.save();
    res.status(201).json(newHotel);
  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

// 获取酒店列表路由
router.get('/', verifyToken, async (req, res, next) => {
  try {
    let hotels;

    // 根据用户角色查询酒店
    if (req.user.role === 'admin') {
      // 管理员查看所有酒店
      hotels = await Hotel.find().populate('createdBy', 'username role');
    } else {
      // 商家仅查看自己的酒店
      hotels = await Hotel.find({ createdBy: req.user.id });
    }

    res.json(hotels);
  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

// 获取单个酒店详情路由
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.id).populate('createdBy', 'username role');

    if (!hotel) {
      return next(new AppError('Hotel not found', 404));
    }

    // 验证权限：管理员或酒店创建者
    if (req.user.role !== 'admin' && hotel.createdBy.toString() !== req.user.id) {
      return next(new AppError('Access denied', 403));
    }

    res.json(hotel);
  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

// 更新酒店状态路由（仅管理员）
router.put('/:id/status', [
  verifyToken,
  requireRole(['admin']),
  body('status', 'Status is required').isIn(['pending', 'approved', 'rejected', 'offline']),
  body('reason', 'Reason is required for rejected status').if(body('status').equals('rejected')).notEmpty()
], async (req, res, next) => {
  // 验证请求参数
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join('. ');
    return next(new AppError(errorMessages, 400));
  }

  const { status, reason } = req.body;

  try {
    const hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found' });
    }

    // 更新状态和原因
    hotel.status = status;
    hotel.reason = reason || '';

    await hotel.save();
    res.json(hotel);
  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

// 删除酒店路由
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return next(new AppError('Hotel not found', 404));
    }

    // 验证权限：管理员或酒店创建者
    if (req.user.role !== 'admin' && hotel.createdBy.toString() !== req.user.id) {
      return next(new AppError('Access denied', 403));
    }

    await hotel.remove();
    res.json({ message: 'Hotel deleted successfully' });
  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

// 为酒店添加房间类型
router.post('/:hotelId/room-types', [
  verifyToken,
  body('type', 'Room type is required').notEmpty(),
  body('price', 'Room price must be a positive number').isFloat({ min: 0 })
], async (req, res, next) => {
  // 验证请求参数
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join('. ');
    return next(new AppError(errorMessages, 400));
  }

  const { type, price } = req.body;

  try {
    const hotel = await Hotel.findById(req.params.hotelId);

    if (!hotel) {
      return next(new AppError('Hotel not found', 404));
    }

    // 验证权限：管理员或酒店创建者
    if (req.user.role !== 'admin' && hotel.createdBy.toString() !== req.user.id) {
      return next(new AppError('Access denied', 403));
    }

    // 添加房间类型
    hotel.roomTypes.push({ type, price });
    await hotel.save();

    res.status(201).json(hotel.roomTypes[hotel.roomTypes.length - 1]);
  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

// 更新酒店的房间类型
router.put('/:hotelId/room-types/:roomTypeId', [
  verifyToken,
  body('type', 'Room type is required').notEmpty(),
  body('price', 'Room price must be a positive number').isFloat({ min: 0 })
], async (req, res, next) => {
  // 验证请求参数
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join('. ');
    return next(new AppError(errorMessages, 400));
  }

  const { type, price } = req.body;

  try {
    const hotel = await Hotel.findById(req.params.hotelId);

    if (!hotel) {
      return next(new AppError('Hotel not found', 404));
    }

    // 验证权限：管理员或酒店创建者
    if (req.user.role !== 'admin' && hotel.createdBy.toString() !== req.user.id) {
      return next(new AppError('Access denied', 403));
    }

    // 查找并更新房间类型
    const roomTypeIndex = hotel.roomTypes.findIndex(rt => rt._id.toString() === req.params.roomTypeId);
    if (roomTypeIndex === -1) {
      return next(new AppError('Room type not found', 404));
    }

    hotel.roomTypes[roomTypeIndex] = { ...hotel.roomTypes[roomTypeIndex], type, price };
    await hotel.save();

    res.json(hotel.roomTypes[roomTypeIndex]);
  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

// 删除酒店的房间类型
router.delete('/:hotelId/room-types/:roomTypeId', verifyToken, async (req, res, next) => {
  try {
    const hotel = await Hotel.findById(req.params.hotelId);

    if (!hotel) {
      return next(new AppError('Hotel not found', 404));
    }

    // 验证权限：管理员或酒店创建者
    if (req.user.role !== 'admin' && hotel.createdBy.toString() !== req.user.id) {
      return next(new AppError('Access denied', 403));
    }

    // 查找并删除房间类型
    const roomTypeIndex = hotel.roomTypes.findIndex(rt => rt._id.toString() === req.params.roomTypeId);
    if (roomTypeIndex === -1) {
      return res.status(404).json({ message: 'Room type not found' });
    }

    hotel.roomTypes.splice(roomTypeIndex, 1);
    await hotel.save();

    res.json({ message: 'Room type deleted successfully' });
  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

module.exports = router;
