# 酒店管理系统

## 项目概述

本项目是一个完整的酒店管理系统，包含PC端管理系统和移动端预订流程，旨在为酒店商户和管理员提供便捷的酒店信息管理和发布平台，同时为用户提供酒店查询和预订服务。

## 已实现功能

### 管理酒店信息系统（PC 站点）

- **用户登录/注册**
  - 支持商户和管理员两个角色的注册和登录
  - 注册时可选择角色，登录时自动判断角色
  - 基于JWT的身份认证机制

- **酒店信息录入/编辑/修改**
  - 酒店基础信息管理（名称、地址、星级、开业日期等）
  - 房间类型和价格管理
  - 实时数据更新

- **酒店信息审核发布/下线**
  - 管理员审核酒店信息（通过/不通过/审核中）
  - 审核不通过时显示拒绝原因
  - 支持酒店下线和恢复功能

- **后端API系统**
  - RESTful API设计
  - 基于角色的权限控制
  - 完整的错误处理机制

- **数据库设计**
  - MongoDB数据库
  - User和Hotel数据模型
  - 房间类型的嵌套结构

## 技术栈

### 前端
- **框架**：React
- **UI组件库**：Ant Design
- **构建工具**：Vite
- **网络请求**：Axios
- **路由**：React Router

### 后端
- **运行环境**：Node.js
- **Web框架**：Express
- **数据库**：MongoDB
- **ORM**：Mongoose
- **认证**：JWT (JSON Web Tokens)
- **验证**：Express Validator
- **环境变量**：Dotenv
- **跨域**：CORS

## 项目结构

```
hotel-admin-pc/
├── public/            # 前端静态资源
├── src/               # 前端源代码
│   ├── api/           # API 客户端
│   ├── assets/        # 静态资源
│   ├── layout/        # 布局组件
│   ├── pages/         # 页面组件
│   ├── utils/         # 工具函数
│   ├── App.jsx        # 应用主组件
│   └── main.jsx       # 应用入口
├── backend/           # 后端代码
│   ├── config/        # 配置文件
│   ├── middleware/    # 中间件
│   ├── models/        # 数据模型
│   ├── routes/        # 路由
│   ├── server.js      # 后端服务器入口
│   └── .env           # 环境变量
├── compass-connections.json  # MongoDB Compass 连接配置
├── API文档.md         # API 文档
└── 项目复现指南.md     # 项目复现指南
```

## 安装与运行

### 环境要求
- **Node.js**：v16.0.0 或更高版本
- **MongoDB**：v6.0.0 或更高版本

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <仓库地址>
   cd hotel-admin-pc
   ```

2. **安装前端依赖**
   ```bash
   npm install
   ```

3. **安装后端依赖**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **配置环境变量**
   - 在 `backend` 目录中创建 `.env` 文件
   - 复制以下内容并根据实际情况修改：
   ```env
   # 服务器配置
   PORT=5000
   
   # MongoDB 连接字符串
   MONGO_URI=mongodb://localhost:27017/hotel-management
   
   # JWT 密钥
   JWT_SECRET=your_jwt_secret_key_change_this_in_production
   ```

5. **导入 MongoDB 数据**
   - 使用项目中的 `compass-connections.json` 文件
   - 打开 MongoDB Compass
   - 导入连接配置并连接到数据库

### 运行项目

1. **启动后端服务器**
   ```bash
   cd backend
   npm start
   ```

2. **启动前端服务器**
   ```bash
   cd ..
   npm run dev
   ```

3. **访问应用**
   - 前端应用：http://localhost:5173/
   - 后端 API：http://localhost:5000/api

## 未完成功能

### 用户预定流程（移动端）

- **酒店查询页（首页）**
  - 顶部Banner：酒店广告
  - 核心查询区域：地点、关键字、日期选择、筛选条件、快捷标签
  - 查询按钮

- **酒店列表页**
  - 顶部核心条件筛选头
  - 详细筛选区域
  - 酒店列表（支持上滑自动加载）

- **酒店详情页**
  - 顶部导航头
  - 大图Banner（支持左右滚动）
  - 酒店基础信息
  - 日历+人间夜Banner
  - 酒店房型价格列表

## 相关文档

- **API文档**：`API文档.md` - 详细的API接口说明
- **项目复现指南**：`项目复现指南.md` - 在其他计算机上复现项目的详细步骤
- **项目任务清单**：`项目任务清单.md` - 项目任务的已完成和未完成状态

## 注意事项

- **compass-connections.json** 是MongoDB Compass的连接配置文件，用于导入数据库连接设置
- 后端服务器默认运行在端口5000，前端开发服务器默认运行在端口5173
- 确保MongoDB服务正在运行，否则后端服务器将无法连接数据库

---

**版本**：1.0.0
**最后更新**：2026-02-24