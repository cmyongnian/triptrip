md
# TripTrip 项目运行与部署说明（本地开发版）

> 适用项目：`triptrip`（酒店管理系统）  
> 项目结构包含：**后端（backend）**、**PC 管理端（根目录）**、**移动端（mobile）**

## 1. 项目说明
本项目是一个酒店管理系统，包含三部分：
- **后端 API 服务**（Express + MongoDB）
- **PC 管理端**（Vite + React）
- **移动端用户端**（Taro + React + TypeScript）

### 推荐启动顺序
1. MongoDB
2. 后端（backend）
3. PC 管理端（根目录）
4. 移动端（mobile，先 H5 后小程序）

## 2. 环境要求
### 必需环境
- Node.js（建议 `>= 18`）
- npm
- MongoDB（本地或远程）

### 可选工具
- MongoDB Compass（可视化查看数据库）
- 微信开发者工具（调试小程序）

## 3. 获取项目代码
```bash
git clone 

4. 后端运行（backend）
4.1 安装依赖
bash
运行
cd backend
npm install
4.2 配置环境变量（重点）
在 backend/ 目录创建 .env 文件（无则新建），内容如下：
env
PORT=5000

# 注意：后端代码读取的是 MONGODB_URI 变量
MONGODB_URI=mongodb://127.0.0.1:27017/hotel-management

JWT_SECRET=your_jwt_secret_key
4.3 启动 MongoDB
确保 MongoDB 服务已启动（不同系统启动方式不同）。
提示：若 MongoDB 未启动，后端可启动但数据库相关接口会异常 / 返回空数据。
4.4 启动后端服务（开发模式）
bash
运行
npm run dev
正常启动后终端会显示：Server running on port 5000
5. 后端接口验证（建议先验证）
在终端（PowerShell/CMD/Git Bash）执行以下命令验证接口：
powershell
# 健康检查接口
curl http://localhost:5000/health
# 基础 API 接口
curl http://localhost:5000/api
返回 200 且包含 JSON 数据，说明后端启动成功。
（可选）公开酒店接口验证
若已补充移动端公开接口，可验证以下接口：
powershell
curl "http://localhost:5000/api/public/hotels/meta"
curl "http://localhost:5000/api/public/hotels/banners"
curl "http://localhost:5000/api/public/hotels"
curl "http://localhost:5000/api/public/hotels/你的酒店ID"
注意：
你的酒店ID 直接替换为实际 ID，不要带尖括号
错误示例：/api/public/hotels/<699...> 会触发 MongoDB ObjectId 转换错误
6. PC 管理端运行（根目录）
6.1 安装依赖
bash
运行
cd .. # 回到项目根目录
npm install
6.2 启动 PC 管理端
bash
运行
npm run dev
6.3 访问页面
默认访问地址：http://localhost:5173
7. 移动端运行（mobile）
推荐先运行 H5（调试更便捷，可直接访问本地后端接口）
7.1 安装依赖
bash
运行
cd mobile
npm install
7.2 启动 H5 调试
bash
运行
npm run dev:h5
启动后终端会输出访问地址，按提示打开即可。
7.3 启动微信小程序调试（可选）
bash
运行
npm run dev:weapp
启动后，用微信开发者工具打开 mobile/dist 目录即可调试。
8. 移动端 API 地址配置（非常重要）
8.1 H5 本地调试
可直接使用本地地址：
txt
http://localhost:5000/api
8.2 小程序真机调试（手机）
不能使用 localhost（手机的 localhost 指向自身），需改为电脑局域网 IP：
txt
http://192.168.1.23:5000/api # 替换为你的电脑实际 IP
确保：
手机和电脑连接同一 Wi-Fi
电脑防火墙放行 5000 端口
9. 数据准备（否则列表可能为空）
接口跑通后若列表为空，需在数据库中准备至少 3~5 条测试数据，核心字段包含：
nameCn（酒店名称）
city（城市）
address（地址）
starRating（星级）
status: "approved"（审核状态，关键）
roomTypes: [{ type, price }]（房型及价格）
images / bannerImage（图片）
tags（标签）
featured（是否推荐，用于 banner）
提示：meta/banners/list 接口返回空，大概率是无 status = "approved" 的酒店数据。
10. 常见问题排查
10.1 后端启动报错：MongoDB URI undefined
现象：The uri parameter to openUri() must be a string, got "undefined"
原因：.env 文件变量名错误（写成 MONGO_URI 而非 MONGODB_URI）
解决：确认 .env 中是 MONGODB_URI=mongodb://127.0.0.1:27017/hotel-management
10.2 curl 无法连接后端接口
现象：PowerShell 提示 “无法连接远程服务器”，Test-NetConnection localhost -Port 5000 显示 TcpTestSucceeded : False
原因：后端未启动 / 启动后崩溃（常见路由 / 控制器报错）
解决：重新启动后端并查看终端报错堆栈：
bash
运行
cd backend
npm run dev
10.3 后端报错：TypeError: argument handler must be a function
原因：路由处理函数未正确导出 / 导入（如 router.get('/xxx', undefined)）
排查：检查 routes/*.js 导入名称、controllers/*.js 导出格式（需 exports.xxx = function() {}）
10.4 移动端列表页中文参数显示为 % E6% B7% B1% E5%9C% B3
原因：中文参数被 URL 编码且未解码，导致二次编码后后端查不到数据
解决：在 hotel-list/index.tsx 中对 city/keyword/tags/checkIn/checkOut 执行 decodeURIComponent，建议封装工具函数：
typescript
运行
const safeDecode = (str: string) => {
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return str;
  }
};
10.5 列表接口返回 200 但 items: []
原因：数据库无符合条件的数据（如无 status="approved"）、筛选条件不匹配（中文未解码）
解决：检查参数解码、数据库测试数据，先用 curl 测试无筛选条件的列表接口
11. 推荐启动流程（日常开发）
启动 MongoDB：确保数据库服务运行
启动后端：
bash
运行
cd backend
npm run dev
验证后端接口：
powershell
curl http://localhost:5000/health
curl http://localhost:5000/api
启动 PC 管理端：
bash
运行
cd ..
npm run dev
访问：http://localhost:5173
启动移动端 H5：
bash
运行
cd mobile
npm run dev:h5
联调核心流程：首页 → 列表 → 详情（先保证闭环跑通）
12. 最短运行路径（快速开始）
后端
bash
运行
cd backend
npm install
# 新建 backend/.env 并配置 MONGODB_URI/JWT_SECRET/PORT
npm run dev
PC 端
bash
运行
cd ..
npm install
npm run dev
移动端 H5
bash
运行
cd mobile
npm install
npm run dev:h5
验证
powershell
curl http://localhost:5000/health
curl http://localhost:5000/api
13. 项目进度备注
本地已补充移动端公开接口（GET /api/public/hotels、GET /api/public/hotels/:id），建议尽快提交到 GitHub
移动端联调优先保证 “首页 → 列表 → 详情” 闭环，再开发订单 / 登录 / 支付等功能