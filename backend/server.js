const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { globalErrorHandler } = require('./middleware/errorHandler');
const publicHotelsRoutes = require('./routes/public-hotels')

// 加载环境变量
dotenv.config();

// 连接数据库（非阻塞，允许服务器在数据库连接失败时仍然启动）
connectDB().catch(err => {
  console.error('MongoDB connection failed, but server will continue to run:', err.message);
  console.warn('API calls will return database connection errors');
});

// 初始化Express应用
const app = express();

// 配置中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 注册路由
const authRoutes = require('./routes/auth');
const hotelsRoutes = require('./routes/hotels');
const publicOrdersRoutes = require('./routes/publicOrders')
app.use('/api/public/orders', publicOrdersRoutes)
app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelsRoutes);
app.use('/api/public/hotels', publicHotelsRoutes);
app.use('/api/public/orders', require('./routes/publicOrders'));

// API 根路径
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to Hotel API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      hotels: '/api/hotels',
      health: '/health'
    }
  });
});

// 健康检查路由
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// 全局错误处理中间件
app.use(globalErrorHandler);

// 启动服务器
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

