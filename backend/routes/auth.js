const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// 注册路由
router.post('/register', [
  body('username', 'Username is required').notEmpty(),
  body('password', 'Password is required').notEmpty(),
  body('role', 'Role is required').isIn(['admin', 'merchant'])
], async (req, res, next) => {
  // 验证请求参数
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join('. ');
    return next(new AppError(errorMessages, 400));
  }

  const { username, password, role } = req.body;

  try {
    // 检查用户是否已存在
    let existingUser = await User.findOne({ username });
    if (existingUser) {
      return next(new AppError('Username already exists', 400));
    }

    // 创建新用户
    const user = new User({ username, password, role });
    await user.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

// 登录路由
router.post('/login', [
  body('username', 'Username is required').notEmpty(),
  body('password', 'Password is required').notEmpty(),
  body('role', 'Role is required').isIn(['admin', 'merchant'])
], async (req, res, next) => {
  // 验证请求参数
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join('. ');
    return next(new AppError(errorMessages, 400));
  }

  const { username, password, role } = req.body;

  try {
    // 查找用户
    let user = await User.findOne({ username });

    // 如果用户不存在，返回错误
    if (!user) {
      return next(new AppError('Invalid credentials', 400));
    }

    // 验证密码
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid credentials', 400));
    }

    // 验证角色
    if (user.role !== role) {
      return next(new AppError('Role mismatch', 400));
    }

    // 生成token
    const token = generateToken(user);

    res.json({ token, user: { id: user._id, username: user.username, role: user.role } });
  } catch (error) {
    console.error(error.message);
    next(error);
  }
});

module.exports = router;
