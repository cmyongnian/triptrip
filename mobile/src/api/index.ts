import Taro from '@tarojs/taro'

const getBaseURL = () => {
    // H5 本地调试
    if (process.env.TARO_ENV === 'h5') {
        return 'http://localhost:5000/api'
    }

    // 微信开发者工具可先用 localhost；真机必须改成你电脑局域网 IP
    return 'http://localhost:5000/api'
}

const BASE_URL = getBaseURL()

type RequestOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    data?: any
    header?: Record<string, string>
}

async function request<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', data, header = {} } = options

    const res = await Taro.request({
        url: `${BASE_URL}${url}`,
        method,
        data,
        header: {
            'Content-Type': 'application/json',
            ...header
        }
    })

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
        const q = new URLSearchParams()
        Object.entries(params || {}).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') q.append(k, String(v))
        })
        const qs = q.toString()
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
        const q = new URLSearchParams()
        q.append('phone', phone || '')
        return request(`/public/orders/query?${q.toString()}`)
    },

    cancel(id: string, data: any) {
        return request(`/public/orders/${id}/cancel`, {
            method: 'POST',
            data
        })
    }
}