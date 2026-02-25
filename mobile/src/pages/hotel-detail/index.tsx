import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, Image, Swiper, SwiperItem, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { publicHotelsAPI } from '../../api'

const FAVORITE_KEY = 'triptrip_favorites'
const HISTORY_KEY = 'triptrip_history'

type CancelPolicy = 'free_cancellation' | 'non_refundable' | string

type RoomType = {
    _id?: string
    id?: string
    type?: string
    price?: number
    bedType?: string
    breakfastIncluded?: boolean
    cancelPolicy?: CancelPolicy
    maxGuests?: number
    inventory?: number
}

type HotelDetail = {
    id?: string
    hotelId?: string
    name?: string
    city?: string
    address?: string
    starRating?: number
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

function toArray<T = any>(v: any): T[] {
    return Array.isArray(v) ? v : []
}

function toNum(v: any, fallback = 0) {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
}

function getCancelPolicyText(v?: string) {
    if (!v) return '免费取消'
    if (v === 'free_cancellation' || v === '免费取消' || v === 'free') return '免费取消'
    if (v === 'non_refundable' || v === '不可取消' || v === 'no_refund') return '不可取消'
    return String(v)
}

function getBreakfastText(v?: boolean) {
    return v ? '含早餐' : '无早餐'
}

function getInventoryText(v?: number) {
    const n = toNum(v, 0)
    if (n <= 0) return '暂时无房'
    if (n <= 3) return `仅剩 ${n} 间`
    return `库存 ${n} 间`
}

function normalizeDetail(raw: any): HotelDetail {
    const id = String(raw?.id || raw?.hotelId || '')
    const roomTypes = toArray<RoomType>(raw?.roomTypes).map((rt: any) => ({
        _id: rt?._id,
        id: rt?.id,
        type: rt?.type || '',
        price: toNum(rt?.price, 0),
        bedType: rt?.bedType || '',
        breakfastIncluded: !!rt?.breakfastIncluded,
        cancelPolicy: rt?.cancelPolicy || 'free_cancellation',
        maxGuests: toNum(rt?.maxGuests, 2),
        inventory: toNum(rt?.inventory, 10)
    }))

    const prices = roomTypes.map(r => toNum(r.price, 0)).filter(p => p >= 0)
    const minPrice = Number.isFinite(Number(raw?.minPrice))
        ? Number(raw.minPrice)
        : (prices.length ? Math.min(...prices) : 0)

    return {
        id,
        hotelId: id,
        name: raw?.name || raw?.nameCn || raw?.nameEn || '未命名酒店',
        city: raw?.city || '',
        address: raw?.address || '',
        starRating: toNum(raw?.starRating, 0),
        openingDate: raw?.openingDate || null,
        images: toArray<string>(raw?.images).filter(Boolean),
        bannerImage: raw?.bannerImage || '',
        tags: toArray<string>(raw?.tags).filter(Boolean),
        amenities: toArray<string>(raw?.amenities).filter(Boolean),
        roomTypes,
        minPrice,
        geo: raw?.geo || null,
        featured: !!raw?.featured
    }
}

export default function HotelDetailPage() {
    const router = Taro.getCurrentInstance().router
    const hotelId = router?.params?.id || router?.params?.hotelId || ''

    // 从路由参数读取日期（首页/列表页跳转可透传）
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
    const [selectedRoomId, setSelectedRoomId] = useState<string>('')

    const syncFavoriteStatus = (id: string) => {
        const list = Taro.getStorageSync(FAVORITE_KEY)
        const arr: string[] = Array.isArray(list) ? list : []
        setIsFavorite(arr.includes(id))
    }

    const recordHistory = (res: HotelDetail) => {
        const id = res.id || res.hotelId
        if (!id) return
        const history = Taro.getStorageSync(HISTORY_KEY)
        const arr: HistoryItem[] = Array.isArray(history) ? history : []

        const item: HistoryItem = {
            id,
            name: res.name || '未命名酒店',
            city: res.city || '',
            imageUrl: res.bannerImage || (Array.isArray(res.images) ? res.images[0] : '') || '',
            minPrice: toNum(res.minPrice, 0),
            viewedAt: Date.now()
        }

        const deduped = [item, ...arr.filter(x => x.id !== id)].slice(0, 20)
        Taro.setStorageSync(HISTORY_KEY, deduped)
    }

    useEffect(() => {
        if (!hotelId) return

        const load = async () => {
            setLoading(true)
            try {
                const raw = await publicHotelsAPI.getDetail(hotelId)
                const res = normalizeDetail(raw)
                setDetail(res)
                syncFavoriteStatus(res.id || '')
                recordHistory(res)

                if (res.name) {
                    Taro.setNavigationBarTitle({ title: res.name })
                }
            } catch (e: any) {
                Taro.showToast({ title: e?.message || '加载失败', icon: 'none' })
            } finally {
                setLoading(false)
            }
        }

        load()
    }, [hotelId])

    const images = useMemo(() => {
        if (!detail) return []
        const arr = (detail.images && detail.images.length ? detail.images : (detail.bannerImage ? [detail.bannerImage] : []))
            .filter(Boolean)
        return arr
    }, [detail])

    const sortedRoomTypes = useMemo(() => {
        const rooms = Array.isArray(detail?.roomTypes) ? [...detail!.roomTypes!] : []
        rooms.sort((a, b) => {
            const pa = toNum(a?.price, Number.MAX_SAFE_INTEGER)
            const pb = toNum(b?.price, Number.MAX_SAFE_INTEGER)
            return pa - pb
        })
        return rooms
    }, [detail?.roomTypes])

    const selectedRoom = useMemo(() => {
        if (!sortedRoomTypes.length) return null
        if (selectedRoomId) {
            const found = sortedRoomTypes.find(rt => String(rt._id || rt.id || rt.type) === selectedRoomId)
            if (found) return found
        }
        return sortedRoomTypes[0]
    }, [sortedRoomTypes, selectedRoomId])

    useEffect(() => {
        if (!selectedRoom && sortedRoomTypes.length) {
            const first = sortedRoomTypes[0]
            setSelectedRoomId(String(first._id || first.id || first.type || ''))
        }
    }, [sortedRoomTypes, selectedRoom])

    const estimatedTotal = useMemo(() => {
        const price = toNum(selectedRoom?.price, 0)
        return price * nights
    }, [selectedRoom?.price, nights])

    const minDisplayPrice = useMemo(() => {
        if (!detail) return 0
        const backendMin = toNum(detail.minPrice, -1)
        if (backendMin >= 0) return backendMin
        const prices = sortedRoomTypes.map(r => toNum(r.price, 0)).filter(v => v >= 0)
        return prices.length ? Math.min(...prices) : 0
    }, [detail, sortedRoomTypes])

    const toggleFavorite = () => {
        const id = detail?.id || detail?.hotelId
        if (!id) return

        const list = Taro.getStorageSync(FAVORITE_KEY)
        const arr: string[] = Array.isArray(list) ? list : []

        if (arr.includes(id)) {
            const next = arr.filter(x => x !== id)
            Taro.setStorageSync(FAVORITE_KEY, next)
            setIsFavorite(false)
            Taro.showToast({ title: '已取消收藏', icon: 'none' })
        } else {
            const next = [id, ...arr.filter(x => x !== id)].slice(0, 100)
            Taro.setStorageSync(FAVORITE_KEY, next)
            setIsFavorite(true)
            Taro.showToast({ title: '已收藏', icon: 'none' })
        }
    }

    const handlePreviewImage = (current: string) => {
        if (!images.length) return
        Taro.previewImage({
            current,
            urls: images
        })
    }

    const handleBook = () => {
        if (!detail) return
        if (!selectedRoom) {
            Taro.showToast({ title: '暂无可预订房型', icon: 'none' })
            return
        }

        const inv = toNum(selectedRoom.inventory, 0)
        if (inv <= 0) {
            Taro.showToast({ title: '该房型暂时无房', icon: 'none' })
            return
        }

        // 关键修复：roomTypeId 增加兜底，避免确认页读取草稿时报“无效预订信息”
        const roomTypeId = String(
            selectedRoom._id || selectedRoom.id || selectedRoom.type || selectedRoomId || ''
        ).trim()

        if (!roomTypeId) {
            console.warn('[hotel-detail] roomTypeId 缺失，selectedRoom =', selectedRoom)
            Taro.showToast({ title: '房型信息缺失，请重新选择房型', icon: 'none' })
            return
        }

        // 先存一个预订草稿，后续确认页/订单页读取
        const draft = {
            hotelId: detail.id || detail.hotelId,
            hotelName: detail.name,
            roomTypeId,
            roomTypeName: selectedRoom.type || '房型',
            price: toNum(selectedRoom.price, 0),
            nights,
            checkIn,
            checkOut,
            totalPrice: estimatedTotal,
            cancelPolicy: selectedRoom.cancelPolicy || 'free_cancellation',
            breakfastIncluded: !!selectedRoom.breakfastIncluded,
            maxGuests: toNum(selectedRoom.maxGuests, 2)
        }

        Taro.setStorageSync('triptrip_booking_draft', draft)

        Taro.showModal({
            title: '预订确认（示例）',
            content: `${detail.name}\n${selectedRoom.type || '房型'}\n${checkIn} 至 ${checkOut}（${nights}晚）\n合计：¥${estimatedTotal}`,
            confirmText: '去下单页',
            success: (res) => {
                if (res.confirm) {
                    Taro.navigateTo({ url: '/pages/order-confirm/index' })
                }
            }
        })
    }

    if (!hotelId) {
        return (
            <View style={{ padding: '24px' }}>
                <Text>缺少酒店ID</Text>
            </View>
        )
    }

    if (loading && !detail) {
        return (
            <View style={{ padding: '24px' }}>
                <Text>加载中...</Text>
            </View>
        )
    }

    if (!detail) {
        return (
            <View style={{ padding: '24px' }}>
                <Text>暂无数据</Text>
            </View>
        )
    }

    return (
        <View style={{ background: '#f5f7fb', minHeight: '100vh', paddingBottom: '120px' }}>
            {/* 顶部图片区域 */}
            <View style={{ background: '#fff' }}>
                {images.length > 1 ? (
                    <Swiper
                        circular
                        autoplay
                        interval={3000}
                        style={{ height: '420rpx' }}
                        indicatorDots
                    >
                        {images.map((img, idx) => (
                            <SwiperItem key={`${img}-${idx}`}>
                                <Image
                                    src={img}
                                    mode='aspectFill'
                                    style={{ width: '100%', height: '420rpx' }}
                                    onClick={() => handlePreviewImage(img)}
                                />
                            </SwiperItem>
                        ))}
                    </Swiper>
                ) : images.length === 1 ? (
                    <Image
                        src={images[0]}
                        mode='aspectFill'
                        style={{ width: '100%', height: '420rpx' }}
                        onClick={() => handlePreviewImage(images[0])}
                    />
                ) : (
                    <View
                        style={{
                            height: '420rpx',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#999'
                        }}
                    >
                        暂无图片
                    </View>
                )}

                {/* 右上角收藏 */}
                <View
                    onClick={toggleFavorite}
                    style={{
                        position: 'absolute',
                        top: '24rpx',
                        right: '24rpx',
                        background: 'rgba(0,0,0,0.45)',
                        color: '#fff',
                        padding: '10rpx 18rpx',
                        borderRadius: '999rpx',
                        fontSize: '24rpx'
                    }}
                >
                    {isFavorite ? '★ 已收藏' : '☆ 收藏'}
                </View>
            </View>

            {/* 酒店信息卡片 */}
            <View
                style={{
                    margin: '20rpx',
                    background: '#fff',
                    borderRadius: '24rpx',
                    padding: '24rpx',
                    boxSizing: 'border-box'
                }}
            >
                <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx', flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: '34rpx', fontWeight: 700, color: '#222' }}>
                        {detail.name || '未命名酒店'}
                    </Text>
                    {!!detail.starRating && (
                        <Text
                            style={{
                                fontSize: '22rpx',
                                color: '#c58a00',
                                background: '#fff8db',
                                padding: '4rpx 10rpx',
                                borderRadius: '10rpx'
                            }}
                        >
                            {detail.starRating}星
                        </Text>
                    )}
                    {detail.featured ? (
                        <Text
                            style={{
                                fontSize: '22rpx',
                                color: '#fff',
                                background: '#ff7a45',
                                padding: '4rpx 10rpx',
                                borderRadius: '10rpx'
                            }}
                        >
                            精选推荐
                        </Text>
                    ) : null}
                </View>

                <View style={{ marginTop: '12rpx' }}>
                    <Text style={{ color: '#666', fontSize: '26rpx' }}>
                        {detail.city ? `${detail.city} · ` : ''}{detail.address || '暂无地址信息'}
                    </Text>
                </View>

                {!!detail.tags?.length && (
                    <View style={{ marginTop: '16rpx', display: 'flex', flexWrap: 'wrap', gap: '10rpx' }}>
                        {detail.tags.map((tag, idx) => (
                            <Text
                                key={`${tag}-${idx}`}
                                style={{
                                    fontSize: '22rpx',
                                    color: '#0A6CFF',
                                    background: '#eef5ff',
                                    padding: '6rpx 12rpx',
                                    borderRadius: '999rpx'
                                }}
                            >
                                {tag}
                            </Text>
                        ))}
                    </View>
                )}
            </View>

            {/* 入住信息（示例） */}
            <View
                style={{
                    margin: '0 20rpx 20rpx',
                    background: '#fff',
                    borderRadius: '24rpx',
                    padding: '24rpx'
                }}
            >
                <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: '30rpx', fontWeight: 700, color: '#222' }}>入住信息</Text>
                    <Text style={{ fontSize: '24rpx', color: '#0A6CFF' }}>共 {nights} 晚</Text>
                </View>

                <View style={{ marginTop: '14rpx', display: 'flex', gap: '16rpx', flexWrap: 'wrap' }}>
                    <View
                        style={{
                            background: '#f6f8fb',
                            borderRadius: '16rpx',
                            padding: '12rpx 16rpx'
                        }}
                    >
                        <Text style={{ fontSize: '24rpx', color: '#666' }}>入住：</Text>
                        <Text style={{ fontSize: '24rpx', color: '#222', fontWeight: 600 }}>{checkIn}</Text>
                    </View>

                    <View
                        style={{
                            background: '#f6f8fb',
                            borderRadius: '16rpx',
                            padding: '12rpx 16rpx'
                        }}
                    >
                        <Text style={{ fontSize: '24rpx', color: '#666' }}>离店：</Text>
                        <Text style={{ fontSize: '24rpx', color: '#222', fontWeight: 600 }}>{checkOut}</Text>
                    </View>
                </View>

                <Text style={{ marginTop: '12rpx', display: 'block', color: '#999', fontSize: '22rpx' }}>
                    房型价格为当前日期区间参考价（演示版）。
                </Text>
            </View>

            {/* 设施 */}
            <View
                style={{
                    margin: '0 20rpx 20rpx',
                    background: '#fff',
                    borderRadius: '24rpx',
                    padding: '24rpx'
                }}
            >
                <Text style={{ fontSize: '30rpx', fontWeight: 700, color: '#222' }}>酒店设施</Text>
                {(detail.amenities || []).length ? (
                    <View style={{ marginTop: '16rpx', display: 'flex', flexWrap: 'wrap', gap: '10rpx' }}>
                        {detail.amenities!.map((am, idx) => (
                            <Text
                                key={`${am}-${idx}`}
                                style={{
                                    fontSize: '22rpx',
                                    color: '#333',
                                    background: '#f3f4f6',
                                    padding: '8rpx 14rpx',
                                    borderRadius: '12rpx'
                                }}
                            >
                                {am}
                            </Text>
                        ))}
                    </View>
                ) : (
                    <Text style={{ marginTop: '12rpx', display: 'block', color: '#999', fontSize: '24rpx' }}>
                        暂无设施信息
                    </Text>
                )}
            </View>

            {/* 房型列表（携程风格卡片） */}
            <View
                style={{
                    margin: '0 20rpx',
                    background: '#fff',
                    borderRadius: '24rpx',
                    padding: '24rpx'
                }}
            >
                <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: '30rpx', fontWeight: 700, color: '#222' }}>房型与价格</Text>
                    <Text style={{ fontSize: '22rpx', color: '#999' }}>按价格从低到高</Text>
                </View>

                {!sortedRoomTypes.length ? (
                    <Text style={{ marginTop: '14rpx', display: 'block', color: '#999', fontSize: '24rpx' }}>
                        暂无房型信息
                    </Text>
                ) : (
                    <ScrollView scrollY={false}>
                        <View style={{ marginTop: '16rpx' }}>
                            {sortedRoomTypes.map((rt, idx) => {
                                const rid = String(rt._id || rt.id || rt.type || idx)
                                const selected = rid === selectedRoomId || (!selectedRoomId && idx === 0)
                                const soldOut = toNum(rt.inventory, 0) <= 0
                                const roomPrice = toNum(rt.price, 0)
                                const roomTotal = roomPrice * nights

                                return (
                                    <View
                                        key={rid}
                                        onClick={() => setSelectedRoomId(rid)}
                                        style={{
                                            border: selected ? '2rpx solid #0A6CFF' : '2rpx solid #f0f0f0',
                                            background: selected ? '#f7fbff' : '#fff',
                                            borderRadius: '20rpx',
                                            padding: '20rpx',
                                            marginBottom: '16rpx'
                                        }}
                                    >
                                        {/* 顶部：房型名称 + 价格 */}
                                        <View style={{ display: 'flex', justifyContent: 'space-between', gap: '20rpx' }}>
                                            <View style={{ flex: 1, minWidth: 0 }}>
                                                <View style={{ display: 'flex', alignItems: 'center', gap: '10rpx', flexWrap: 'wrap' }}>
                                                    <Text
                                                        style={{
                                                            fontSize: '28rpx',
                                                            fontWeight: 700,
                                                            color: '#222'
                                                        }}
                                                    >
                                                        {rt.type || '房型'}
                                                    </Text>
                                                    {selected ? (
                                                        <Text
                                                            style={{
                                                                fontSize: '20rpx',
                                                                color: '#0A6CFF',
                                                                background: '#eaf3ff',
                                                                padding: '4rpx 10rpx',
                                                                borderRadius: '999rpx'
                                                            }}
                                                        >
                                                            当前选择
                                                        </Text>
                                                    ) : null}
                                                </View>

                                                <View style={{ marginTop: '10rpx', display: 'flex', flexWrap: 'wrap', gap: '10rpx' }}>
                                                    {!!rt.bedType && (
                                                        <Text
                                                            style={{
                                                                fontSize: '22rpx',
                                                                color: '#555',
                                                                background: '#f4f6f8',
                                                                padding: '6rpx 10rpx',
                                                                borderRadius: '10rpx'
                                                            }}
                                                        >
                                                            {rt.bedType}
                                                        </Text>
                                                    )}
                                                    <Text
                                                        style={{
                                                            fontSize: '22rpx',
                                                            color: rt.breakfastIncluded ? '#0a7f42' : '#666',
                                                            background: rt.breakfastIncluded ? '#ecfff4' : '#f4f6f8',
                                                            padding: '6rpx 10rpx',
                                                            borderRadius: '10rpx'
                                                        }}
                                                    >
                                                        {getBreakfastText(rt.breakfastIncluded)}
                                                    </Text>
                                                    <Text
                                                        style={{
                                                            fontSize: '22rpx',
                                                            color: getCancelPolicyText(rt.cancelPolicy) === '免费取消' ? '#0a7f42' : '#a15a00',
                                                            background: getCancelPolicyText(rt.cancelPolicy) === '免费取消' ? '#ecfff4' : '#fff7e8',
                                                            padding: '6rpx 10rpx',
                                                            borderRadius: '10rpx'
                                                        }}
                                                    >
                                                        {getCancelPolicyText(rt.cancelPolicy)}
                                                    </Text>
                                                    <Text
                                                        style={{
                                                            fontSize: '22rpx',
                                                            color: '#555',
                                                            background: '#f4f6f8',
                                                            padding: '6rpx 10rpx',
                                                            borderRadius: '10rpx'
                                                        }}
                                                    >
                                                        可住 {toNum(rt.maxGuests, 2)} 人
                                                    </Text>
                                                </View>

                                                <View style={{ marginTop: '10rpx' }}>
                                                    <Text
                                                        style={{
                                                            fontSize: '22rpx',
                                                            color: soldOut ? '#cf1322' : '#666'
                                                        }}
                                                    >
                                                        {getInventoryText(rt.inventory)}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={{ width: '190rpx', textAlign: 'right' }}>
                                                <View>
                                                    <Text style={{ fontSize: '22rpx', color: '#FF7A00' }}>¥</Text>
                                                    <Text style={{ fontSize: '38rpx', fontWeight: 700, color: '#FF7A00' }}>
                                                        {roomPrice}
                                                    </Text>
                                                </View>
                                                <Text style={{ display: 'block', fontSize: '20rpx', color: '#999' }}>/晚</Text>
                                                <Text style={{ display: 'block', marginTop: '4rpx', fontSize: '20rpx', color: '#999' }}>
                                                    {nights}晚合计 ¥{roomTotal}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* 底部按钮行 */}
                                        <View
                                            style={{
                                                marginTop: '16rpx',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <Text style={{ fontSize: '22rpx', color: '#999' }}>
                                                {selected ? '已选中该房型' : '点击卡片选择该房型'}
                                            </Text>

                                            <View
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setSelectedRoomId(rid)
                                                    if (soldOut) {
                                                        Taro.showToast({ title: '该房型暂时无房', icon: 'none' })
                                                        return
                                                    }
                                                    handleBook()
                                                }}
                                                style={{
                                                    padding: '12rpx 22rpx',
                                                    borderRadius: '999rpx',
                                                    fontSize: '24rpx',
                                                    color: '#fff',
                                                    background: soldOut ? '#d9d9d9' : '#0A6CFF'
                                                }}
                                            >
                                                {soldOut ? '暂不可订' : '预订'}
                                            </View>
                                        </View>
                                    </View>
                                )
                            })}
                        </View>
                    </ScrollView>
                )}
            </View>

            {/* 底部操作栏 */}
            <View
                style={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: '#fff',
                    borderTop: '1px solid #eee',
                    padding: '16rpx 20rpx calc(env(safe-area-inset-bottom) + 16rpx)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14rpx',
                    zIndex: 99,
                    boxSizing: 'border-box'
                }}
            >
                <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ display: 'flex', alignItems: 'baseline', gap: '6rpx' }}>
                        <Text style={{ fontSize: '22rpx', color: '#FF7A00' }}>¥</Text>
                        <Text style={{ fontSize: '40rpx', lineHeight: 1, fontWeight: 700, color: '#FF7A00' }}>
                            {selectedRoom ? toNum(selectedRoom.price, minDisplayPrice) : minDisplayPrice}
                        </Text>
                        <Text style={{ fontSize: '22rpx', color: '#999' }}>/晚起</Text>
                    </View>
                    <Text style={{ display: 'block', marginTop: '4rpx', fontSize: '20rpx', color: '#999' }}>
                        {selectedRoom ? `已选：${selectedRoom.type || '房型'} · ${nights}晚合计 ¥${estimatedTotal}` : '请选择房型'}
                    </Text>
                </View>

                <View
                    onClick={toggleFavorite}
                    style={{
                        width: '120rpx',
                        height: '76rpx',
                        borderRadius: '16rpx',
                        border: '1px solid #d9d9d9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#333',
                        fontSize: '24rpx',
                        background: '#fff'
                    }}
                >
                    {isFavorite ? '已收藏' : '收藏'}
                </View>

                <View
                    onClick={handleBook}
                    style={{
                        width: '220rpx',
                        height: '76rpx',
                        borderRadius: '16rpx',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '28rpx',
                        fontWeight: 700,
                        background: selectedRoom && toNum(selectedRoom.inventory, 0) > 0 ? '#0A6CFF' : '#d9d9d9'
                    }}
                >
                    立即预订
                </View>
            </View>
        </View>
    )
}