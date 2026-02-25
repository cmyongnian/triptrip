import Taro from '@tarojs/taro'

/**
 * ✅ 改成你电脑当前的局域网 IPv4 地址（非常重要）
 * 例如：192.168.31.25
 */
const LAN_IP = '192.168.3.13'

/**
 * 是否在微信开发者工具里强制使用 localhost（默认 false）
 * - false：开发者工具/真机都走局域网 IP（推荐，最稳）
 * - true：开发者工具走 localhost，真机走局域网 IP
 */
const USE_LOCALHOST_IN_DEVTOOLS = false

const getBaseURL = () => {
    const env = Taro.getEnv()

    // H5 本地调试
    if (env === Taro.ENV_TYPE.H5) {
        return 'http://localhost:5000/api'
    }

    // 微信小程序（开发者工具 / 真机）
    if (env === Taro.ENV_TYPE.WEAPP) {
        try {
            const sys = Taro.getSystemInfoSync()
            const isDevtools = sys.platform === 'devtools'

            if (isDevtools && USE_LOCALHOST_IN_DEVTOOLS) {
                return 'http://localhost:5000/api'
            }

            // ✅ 推荐：小程序统一走局域网 IP
            return `http://${LAN_IP}:5000/api`
        } catch (e) {
            // 获取系统信息失败时兜底
            return `http://${LAN_IP}:5000/api`
        }
    }

    // 其他端兜底
    return 'http://localhost:5000/api'
}

const BASE_URL = getBaseURL()

type RequestOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    data?: any
    header?: Record<string, string>
}

/** 小程序里比 URLSearchParams 更稳的 query 拼接 */
function buildQuery(params: Record<string, any> = {}) {
    const parts: string[] = []
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
            parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        }
    })
    return parts.join('&')
}

async function request<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', data, header = {} } = options
    const fullUrl = `${BASE_URL}${url}`

    // ✅ 调试用：可以在微信开发者工具 Console 看实际请求地址
    console.log('[API Request]', method, fullUrl, data || '')

    const res = await Taro.request({
        url: fullUrl,
        method,
        data,
        timeout: 10000,
        header: {
            'Content-Type': 'application/json',
            ...header
        }
    })

    // ✅ 调试用：查看返回
    console.log('[API Response]', res.statusCode, fullUrl, res.data)

    if (res.statusCode >= 200 && res.statusCode < 300) {
        return res.data as T
    }

    const msg = (res.data as any)?.message || `请求失败(${res.statusCode})`
    throw new Error(msg)
}

export const publicHotelsAPI = {
    getMeta() {
        return request('/public/hotels/meta')
    },

    getBanners(limit = 5) {
        return request(`/public/hotels/banners?limit=${limit}`)
    },

    getList(params: {
        city?: string
        keyword?: string
        checkIn?: string
        checkOut?: string
        star?: string | number | null
        tags?: string
        page?: number
        pageSize?: number
        sort?: 'recommended' | 'priceAsc' | 'priceDesc'
    }) {
        const qs = buildQuery(params || {})
        return request(`/public/hotels${qs ? `?${qs}` : ''}`)
    },

    getDetail(id: string) {
        return request(`/public/hotels/${id}`)
    }
}

export const publicOrdersAPI = {
    create(data: any) {
        return request('/public/orders', {
            method: 'POST',
            data
        })
    },

    queryByPhone(phone: string) {
        const qs = buildQuery({ phone: phone || '' })
        return request(`/public/orders/query?${qs}`)
    },

    cancel(id: string, data: any) {
        return request(`/public/orders/${id}/cancel`, {
            method: 'POST',
            data
        })
    }
}