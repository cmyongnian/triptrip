import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, Image, Swiper, SwiperItem } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { publicHotelsAPI } from '../../api'

const FAVORITE_KEY = 'triptrip_favorites'
const HISTORY_KEY = 'triptrip_history'

type RoomType = {
    _id?: string
    type?: string
    price?: number
}

type HotelDetail = {
    id: string
    name: string
    city: string
    address: string
    starRating: number
    openingDate?: string | null
    images?: string[]
    bannerImage?: string
    tags?: string[]
    amenities?: string[]
    roomTypes?: RoomType[]
    minPrice?: number
    geo?: any
    featured?: boolean
}

type HistoryItem = {
    id: string
    name: string
    city?: string
    imageUrl?: string
    minPrice?: number
    viewedAt?: number
}

function formatDate(date: Date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function calcNights(checkIn?: string, checkOut?: string) {
    if (!checkIn || !checkOut) return 1
    const t1 = new Date(checkIn).getTime()
    const t2 = new Date(checkOut).getTime()
    if (!Number.isFinite(t1) || !Number.isFinite(t2)) return 1
    return Math.max(1, Math.ceil((t2 - t1) / (24 * 3600 * 1000)))
}

export default function HotelDetailPage() {
    const router = Taro.getCurrentInstance().router
    const id = router?.params?.id || ''

    // 从路由读取日期（首页/列表页跳转时可带过来）
    const checkInParam = router?.params?.checkIn
    const checkOutParam = router?.params?.checkOut

    const today = useMemo(() => new Date(), [])
    const tomorrow = useMemo(() => new Date(Date.now() + 24 * 3600 * 1000), [])

    const checkIn = checkInParam || formatDate(today)
    const checkOut = checkOutParam || formatDate(tomorrow)
    const nights = calcNights(checkIn, checkOut)

    const [loading, setLoading] = useState(false)
    const [detail, setDetail] = useState<HotelDetail | null>(null)
    const [isFavorite, setIsFavorite] = useState(false)

    const syncFavoriteStatus = (hotelId: string) => {
        const list = Taro.getStorageSync(FAVORITE_KEY)
        const arr = Array.isArray(list) ? list : []
        setIsFavorite(arr.includes(hotelId))
    }

    const recordHistory = (res: HotelDetail) => {
        const history = Taro.getStorageSync(HISTORY_KEY)
        const arr: HistoryItem[] = Array.isArray(history) ? history : []

        const item: HistoryItem = {
            id: res.id,
            name: res.name,
            city: res.city,
            imageUrl: res.bannerImage || (Array.isArray(res.images) ? res.images[0] : '') || '',
            minPrice: res.minPrice || 0,
            viewedAt: Date.now()
        }

        const deduped = [item, ...arr.filter((x) => x.id !== res.id)].slice(0, 20)
        Taro.setStorageSync(HISTORY_KEY, deduped)
    }

    useEffect(() => {
        if (!id) return

        const load = async () => {
            setLoading(true)
            try {
                const res = (await publicHotelsAPI.getDetail(id)) as HotelDetail
                setDetail(res)
                syncFavoriteStatus(res.id)
                recordHistory(res)
                if (res.name) {
                    Taro.setNavigationBarTitle({ title: res.name })
                }
            } catch (e: any) {
                Taro.showToast({ title: e.message || '加载失败', icon: 'none' })
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [id])

    const toggleFavorite = () => {
        if (!detail?.id) return

        const list = Taro.getStorageSync(FAVORITE_KEY)
        const arr: string[] = Array.isArray(list) ? list : []

        if (arr.includes(detail.id)) {
            const next = arr.filter((x) => x !== detail.id)
            Taro.setStorageSync(FAVORITE_KEY, next)
            setIsFavorite(false)
            Taro.showToast({ title: '已取消收藏', icon: 'none' })
        } else {
            const next = [detail.id, ...arr.filter((x) => x !== detail.id)].slice(0, 100)
            Taro.setStorageSync(FAVORITE_KEY, next)
            setIsFavorite(true)
            Taro.showToast({ title: '已收藏', icon: 'none' })
        }
    }

    const images = useMemo(() => {
        if (!detail) return []
        return (detail.images?.length ? detail.images : (detail.bannerImage ? [detail.bannerImage] : []))
            .filter(Boolean) as string[]
    }, [detail])

    const canSlide = images.length > 1

    // ✅ 房型按价格从低到高排序（图中备注要求）
    const sortedRoomTypes = useMemo(() => {
        const rooms = Array.isArray(detail?.roomTypes) ? [...detail!.roomTypes!] : []
        rooms.sort((a, b) => {
            const pa = typeof a.price === 'number' ? a.price : Number.MAX_SAFE_INTEGER
            const pb = typeof b.price === 'number' ? b.price : Number.MAX_SAFE_INTEGER
            return pa - pb
        })
        return rooms
    }, [detail?.roomTypes])

    if (!id) {
        return <View style={{ padding: '16px' }}>缺少酒店ID</View>
    }

    if (loading && !detail) {
        return <View style={{ padding: '16px' }}>加载中...</View>
    }

    if (!detail) {
        return <View style={{ padding: '16px' }}>暂无数据</View>
    }

    return (
        <View style={{ background: '#f6f7fb', minHeight: '100vh', paddingBottom: '84px' }}>
            <View style={{ background: '#fff' }}>
                {images.length > 1 ? (
                    <Swiper
                        key={`detail-swiper-${images.length}`}
                        autoplay={canSlide}
                        circular={canSlide}
                        indicatorDots={canSlide}
                        style={{ height: '220px' }}
                    >
                        {images.map((img, idx) => (
                            <SwiperItem key={`${img}-${idx}`}>
                                <Image src={img} mode='aspectFill' style={{ width: '100%', height: '220px' }} />
                            </SwiperItem>
                        ))}
                    </Swiper>
                ) : images.length === 1 ? (
                    <Image src={images[0]} mode='aspectFill' style={{ width: '100%', height: '220px' }} />
                ) : (
                    <View style={{ height: '220px', background: '#eee' }} />
                )}

                <View style={{ padding: '14px' }}>
                    <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: '18px', fontWeight: 700, maxWidth: '75%' }}>{detail.name}</Text>
                        <Text style={{ color: '#1677ff' }}>{detail.starRating}星</Text>
                    </View>

                    <View style={{ marginTop: '8px', color: '#666', fontSize: '14px' }}>
                        {detail.address}
                    </View>

                    <View style={{ marginTop: '10px', display: 'flex', alignItems: 'center' }}>
                        <View
                            onClick={toggleFavorite}
                            style={{
                                fontSize: '12px',
                                color: isFavorite ? '#ff4d4f' : '#666',
                                border: `1px solid ${isFavorite ? '#ffccc7' : '#ddd'}`,
                                background: isFavorite ? '#fff2f0' : '#fff',
                                borderRadius: '999px',
                                padding: '4px 10px',
                                marginRight: '8px'
                            }}
                        >
                            {isFavorite ? '已收藏' : '收藏'}
                        </View>

                        {detail.featured ? (
                            <View
                                style={{
                                    fontSize: '12px',
                                    color: '#fa8c16',
                                    border: '1px solid #ffd591',
                                    background: '#fff7e6',
                                    borderRadius: '999px',
                                    padding: '4px 10px'
                                }}
                            >
                                精选推荐
                            </View>
                        ) : null}
                    </View>

                    <View style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap' }}>
                        {(detail.tags || []).map((tag) => (
                            <View
                                key={tag}
                                style={{
                                    marginRight: '6px',
                                    marginBottom: '6px',
                                    fontSize: '12px',
                                    color: '#1677ff',
                                    border: '1px solid #cfe2ff',
                                    borderRadius: '999px',
                                    padding: '2px 8px',
                                    background: '#f0f7ff'
                                }}
                            >
                                {tag}
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            {/* ✅ 日期 + 间夜 Banner（对应图中的详情页要求） */}
            <View style={{ background: '#fff', marginTop: '10px', padding: '14px' }}>
                <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: 600 }}>入住信息</Text>
                    <Text style={{ color: '#1677ff', fontSize: '12px' }}>共 {nights} 晚</Text>
                </View>

                <View style={{ marginTop: '10px', display: 'flex' }}>
                    <View style={{ flex: 1, background: '#fafafa', borderRadius: '10px', padding: '10px' }}>
                        <Text style={{ fontSize: '12px', color: '#999' }}>入住</Text>
                        <View style={{ marginTop: '4px' }}>
                            <Text style={{ fontWeight: 600 }}>{checkIn}</Text>
                        </View>
                    </View>

                    <View style={{ width: '10px' }} />

                    <View style={{ flex: 1, background: '#fafafa', borderRadius: '10px', padding: '10px' }}>
                        <Text style={{ fontSize: '12px', color: '#999' }}>离店</Text>
                        <View style={{ marginTop: '4px' }}>
                            <Text style={{ fontWeight: 600 }}>{checkOut}</Text>
                        </View>
                    </View>
                </View>

                <View style={{ marginTop: '8px', color: '#999', fontSize: '12px' }}>
                    房型价格展示为当前所选日期区间的参考价（示例）。
                </View>
            </View>

            {/* 设施信息 */}
            <View style={{ background: '#fff', marginTop: '10px', padding: '14px' }}>
                <Text style={{ fontWeight: 600 }}>酒店设施</Text>
                <View style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap' }}>
                    {(detail.amenities || []).length ? (
                        detail.amenities!.map((am) => (
                            <View
                                key={am}
                                style={{
                                    marginRight: '8px',
                                    marginBottom: '8px',
                                    fontSize: '12px',
                                    color: '#333',
                                    background: '#f5f5f5',
                                    borderRadius: '999px',
                                    padding: '4px 10px'
                                }}
                            >
                                {am}
                            </View>
                        ))
                    ) : (
                        <Text style={{ color: '#999', fontSize: '13px' }}>暂无设施信息</Text>
                    )}
                </View>
            </View>

            {/* ✅ 房型与价格（已按价格排序） */}
            <View style={{ background: '#fff', marginTop: '10px', padding: '14px' }}>
                <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: 600 }}>房型与价格</Text>
                    <Text style={{ color: '#999', fontSize: '12px' }}>按价格从低到高</Text>
                </View>

                <View style={{ marginTop: '10px' }}>
                    {sortedRoomTypes.length ? (
                        sortedRoomTypes.map((rt) => (
                            <View
                                key={rt._id || `${rt.type}-${rt.price}`}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px 0',
                                    borderBottom: '1px solid #f0f0f0'
                                }}
                            >
                                <View style={{ display: 'flex', flexDirection: 'column' }}>
                                    <Text>{rt.type || '房型'}</Text>
                                    <Text style={{ color: '#999', fontSize: '12px', marginTop: '2px' }}>
                                        可预订（示例）
                                    </Text>
                                </View>
                                <Text style={{ color: '#ff4d4f', fontWeight: 600 }}>¥{rt.price || 0}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={{ color: '#999' }}>暂无房型信息</Text>
                    )}
                </View>
            </View>

            {/* 底部操作栏 */}
            <View
                style={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: '#fff',
                    padding: '10px 14px calc(10px + env(safe-area-inset-bottom))',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid #eee',
                    zIndex: 10
                }}
            >
                <View>
                    <Text style={{ color: '#ff4d4f', fontWeight: 700, fontSize: '18px' }}>¥{detail.minPrice || 0}</Text>
                    <Text style={{ color: '#999', fontSize: '12px' }}> 起/晚</Text>
                </View>

                <View style={{ display: 'flex', alignItems: 'center' }}>
                    <View
                        onClick={toggleFavorite}
                        style={{
                            border: '1px solid #ddd',
                            color: isFavorite ? '#ff4d4f' : '#333',
                            padding: '8px 12px',
                            borderRadius: '999px',
                            background: '#fff',
                            marginRight: '10px'
                        }}
                    >
                        {isFavorite ? '取消收藏' : '收藏'}
                    </View>

                    <View
                        style={{
                            background: '#1677ff',
                            color: '#fff',
                            padding: '10px 18px',
                            borderRadius: '999px'
                        }}
                        onClick={() => Taro.showToast({ title: '预订流程待开发', icon: 'none' })}
                    >
                        立即预订
                    </View>
                </View>
            </View>
        </View>
    )
}