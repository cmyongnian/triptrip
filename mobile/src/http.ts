// mobile/src/api/http.ts
import Taro from '@tarojs/taro'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api'

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export async function request<T>(
    method: HttpMethod,
    path: string,
    data?: any,
    headers?: Record<string, string>
): Promise<T> {
    const token = Taro.getStorageSync('token') // 小程序/H5都可用
    const res = await Taro.request<T>({
        url: `${API_BASE_URL}${path}`,
        method,
        data,
        header: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(headers || {})
        },
        timeout: 10000
    })
    // 统一错误处理：后端约定 message
    if (res.statusCode >= 400) {
        const msg = (res.data as any)?.message || `HTTP ${res.statusCode}`
        throw new Error(msg)
    }
    return res.data
}
