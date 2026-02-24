// mobile/src/api/index.ts
import { request } from './http'

export const publicHotelsAPI = {
    getBanners: (limit = 5) => request<{ items: any[] }>('GET', `/public/hotels/banners?limit=${limit}`),
    getMeta: () => request<{ cities: string[]; tags: string[]; starRatings: number[]; priceRange: any }>('GET', `/public/hotels/meta`)
}
