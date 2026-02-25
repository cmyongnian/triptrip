const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// 注册
router.post(
  '/register',
  [
    body('username', 'Username is required').notEmpty(),
    body('password', 'Password is required').notEmpty(),
    body('role', 'Role is required').isIn(['admin', 'merchant'])
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg).join('. ');
      return next(new AppError(errorMessages, 400));
    }

    const { username, password, role } = req.body;

    try {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return next(new AppError('Username already exists', 400));
      }

      const user = new User({ username, password, role });
      await user.save();

      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }
);

// 登录（role 可选：不传则自动识别）
router.post(
  '/login',
  [
    body('username', 'Username is required').notEmpty(),
    body('password', 'Password is required').notEmpty(),
    body('role').optional().isIn(['admin', 'merchant'])
  ],
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg).join('. ');
      return next(new AppError(errorMessages, 400));
    }

    const { username, password, role } = req.body;

    try {
      const user = await User.findOne({ username });
      if (!user) {
        return next(new AppError('Invalid credentials', 400));
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return next(new AppError('Invalid credentials', 400));
      }

      // 兼容旧前端：如果传了 role，校验一下；不传就自动用数据库角色
      if (role && user.role !== role) {
        return next(new AppError('Role mismatch', 400));
      }

      const token = generateToken(user);

      res.json({
        token,
        user: {
          id: user._id,
          username: user.username,
          role: user.role
        }
      });
    } catch (error) {
      console.error(error.message);
      next(error);
    }
  }
);

module.exports = router