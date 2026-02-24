# 酒店管理系统 API 文档

## 1. 简介

本文档描述了酒店管理系统的API接口，包括认证、酒店管理等功能。

## 2. 基础信息

### 2.1 API基础URL

```
http://localhost:5000/api
```

### 2.2 认证方式

- 使用JWT令牌进行认证
- 令牌需要在请求头中以 `Bearer {token}` 的格式提供
- 令牌有效期为24小时

## 3. API端点

### 3.1 认证相关API

| 端点 | 方法 | 描述 | 请求体 (JSON) | 成功响应 (200 OK) |
|------|------|------|---------------|-------------------|
| `/auth/register` | POST | 注册新用户 | `{"username": "string", "password": "string", "role": "merchant/admin"}` | `{"message": "User registered successfully"}` |
| `/auth/login` | POST | 用户登录 | `{"username": "string", "password": "string", "role": "merchant/admin"}` | `{"token": "string", "user": {"id": "string", "username": "string", "role": "string"}}` |

### 3.2 酒店相关API

| 端点 | 方法 | 描述 | 请求体 (JSON) | 成功响应 (200 OK) |
|------|------|------|---------------|-------------------|
| `/hotels` | POST | 创建新酒店 | 见下方示例 | 酒店对象 |
| `/hotels` | GET | 获取酒店列表 | N/A | 酒店对象数组 |
| `/hotels/:id` | GET | 获取单个酒店详情 | N/A | 酒店对象 |
| `/hotels/:id/status` | PUT | 更新酒店状态 | `{"status": "pending/approved/rejected/offline", "reason": "string"}` | 酒店对象 |
| `/hotels/:id` | DELETE | 删除酒店 | N/A | `{"message": "Hotel deleted successfully"}` |
| `/hotels/:hotelId/room-types` | POST | 添加房间类型 | `{"type": "string", "price": number}` | 房间类型对象 |
| `/hotels/:hotelId/room-types/:roomTypeId` | PUT | 更新房间类型 | `{"type": "string", "price": number}` | 房间类型对象 |
| `/hotels/:hotelId/room-types/:roomTypeId` | DELETE | 删除房间类型 | N/A | `{"message": "Room type deleted successfully"}` |

## 4. 请求示例

### 4.1 创建酒店

```json
{
  "nameCn": "易宿大酒店",
  "nameEn": "Yi-Su Grand Hotel",
  "address": "北京市朝阳区建国路88号",
  "starRating": 5,
  "openingDate": "2024-01-01",
  "roomTypes": [
    {"type": "标准间", "price": 500},
    {"type": "豪华间", "price": 800}
  ]
}
```

### 4.2 更新酒店状态

```json
{
  "status": "approved",
  "reason": "" // 拒绝时必填
}
```

## 5. 响应示例

### 5.1 成功响应

```json
{
  "id": "60c72b2f9b1d8c0015f3c4a1",
  "nameCn": "易宿大酒店",
  "nameEn": "Yi-Su Grand Hotel",
  "address": "北京市朝阳区建国路88号",
  "starRating": 5,
  "openingDate": "2024-01-01T00:00:00.000Z",
  "status": "approved",
  "reason": "",
  "roomTypes": [
    {"_id": "60c72b2f9b1d8c0015f3c4a2", "type": "标准间", "price": 500},
    {"_id": "60c72b2f9b1d8c0015f3c4a3", "type": "豪华间", "price": 800}
  ],
  "createdBy": "60c72b2f9b1d8c0015f3c4a0",
  "createdAt": "2024-05-29T10:00:00.000Z",
  "updatedAt": "2024-05-29T10:00:00.000Z"
}
```

### 5.2 错误响应

```json
{
  "message": "Invalid credentials"
}
```

## 6. 错误码

| 状态码 | 描述 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权，令牌无效或过期 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 7. 注意事项

1. 所有需要认证的API都需要在请求头中提供有效的JWT令牌
2. 管理员可以访问所有API，商户只能访问自己创建的酒店相关API
3. 酒店状态更新只能由管理员操作
4. 拒绝酒店时必须提供拒绝原因

## 8. 健康检查

| 端点 | 方法 | 描述 |
|------|------|------|
| `/health` | GET | 检查服务器运行状态 |

响应示例：

```json
{
  "status": "ok",
  "message": "Server is running"
}
```