import {
    View,
    Text,
    Input,
    Button,
    Picker,
    Swiper,
    SwiperItem,
    Image
} from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import React, { useEffect, useMemo, useState } from 'react'
import { publicHotelsAPI } from '../../api'

const FAVORITE_KEY = 'triptrip_favorites'
const HISTORY_KEY = 'triptrip_history'
const SEARCH_CACHE_KEY = 'triptrip_home_search_cache_v1'
const HOME_CACHE_KEY = 'triptrip_home_cache_v1'
const HOME_CACHE_TTL = 5 * 60 * 1000 // 5分钟

type BannerItem = {
    id: string
    title: string
    subtitle?: string
    imageUrl: string
}

type HistoryItem = {
    id: string
    name: string
    city?: string
    imageUrl?: string
    minPrice?: number
    viewedAt?: number
}

type FavoriteCardItem = {
    id: string
    name: string
    city?: string
    imageUrl?: string
    minPrice?: number
}

type SearchCache = {
    city?: string
    keyword?: string
    checkIn?: string
    checkOut?: string
    star?: number | null
    selectedTags?: string[]
}

function formatDate(d: Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

function calcNights(checkIn?: string, checkOut?: string) {
    if (!checkIn || !checkOut) return 1
    const t1 = new Date(checkIn).getTime()
    const t2 = new Date(checkOut).getTime()
    if (!Number.isFinite(t1) || !Number.isFinite(t2)) return 1
    return Math.max(1, Math.ceil((t2 - t1) / (24 * 3600 * 1000)))
}

function safeArray<T = any>(v: any): T[] {
    return Array.isArray(v) ? v : []
}

function readSearchCache(): SearchCache | null {
    try {
        const cache = Taro.getStorageSync(SEARCH_CACHE_KEY)
        if (!cache || typeof cache !== 'object') return null
        return {
            city: typeof cache.city === 'string' ? cache.city : '',
            keyword: typeof cache.keyword === 'string' ? cache.keyword : '',
            checkIn: typeof cache.checkIn === 'string' ? cache.checkIn : '',
            checkOut: typeof cache.checkOut === 'string' ? cache.checkOut : '',
            star:
                cache.star === null || cache.star === undefined
                    ? null
                    : Number.isFinite(Number(cache.star))
                        ? Number(cache.star)
                        : null,
            selectedTags: safeArray<string>(cache.selectedTags).filter(Boolean)
        }
    } catch {
        return null
    }
}

export default function HomePage() {
    const today = useMemo(() => new Date(), [])
    const tomorrow = useMemo(() => new Date(Date.now() + 24 * 3600 * 1000), [])

    const [loading, setLoading] = useState(false)
    const [loadingFavorites, setLoadingFavorites] = useState(false)

    // Banner & 元数据
    const [banners, setBanners] = useState<BannerItem[]>([])
    const [cities, setCities] = useState<string[]>([])
    const [tags, setTags] = useState<string[]>([])

    // 本地状态（收藏 & 最近浏览）
    const [favoriteIds, setFavoriteIds] = useState<string[]>([])
    const [favoriteItems, setFavoriteItems] = useState<FavoriteCardItem[]>([])
    const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([])

    // 搜索条件（支持本地记忆）
    const [city, setCity] = useState('')
    const [keyword, setKeyword] = useState('')
    const [checkIn, setCheckIn] = useState(formatDate(today))
    const [checkOut, setCheckOut] = useState(formatDate(tomorrow))
    const [star, setStar] = useState<number | null>(null)
    const [selectedTags, setSelectedTags] = useState<string[]>([])

    // 用于避免首次加载前就把默认值覆盖本地缓存
    const [searchCacheHydrated, setSearchCacheHydrated] = useState(false)

    const nights = useMemo(() => calcNights(checkIn, checkOut), [checkIn, checkOut])

    // ===== 搜索条件本地记忆：首次读取 =====
    useEffect(() => {
        const cache = readSearchCache()
        if (cache) {
            if (cache.city) setCity(cache.city)
            if (typeof cache.keyword === 'string') setKeyword(cache.keyword)
            if (cache.checkIn) setCheckIn(cache.checkIn)
            if (cache.checkOut) setCheckOut(cache.checkOut)
            if (cache.star === null || typeof cache.star === 'number') setStar(cache.star ?? null)
            if (Array.isArray(cache.selectedTags)) setSelectedTags(cache.selectedTags)
        } else {
            // 首次无缓存时给一个默认城市占位（后续 meta 会覆盖为首个城市）
            setCity('')
        }
        setSearchCacheHydrated(true)
    }, [])

    // ===== 搜索条件本地记忆：变更即保存 =====
    useEffect(() => {
        if (!searchCacheHydrated) return
        try {
            Taro.setStorageSync(SEARCH_CACHE_KEY, {
                city,
                keyword,
                checkIn,
                checkOut,
                star,
                selectedTags
            })
        } catch {
            // 忽略存储错误
        }
    }, [city, keyword, checkIn, checkOut, star, selectedTags, searchCacheHydrated])

    const loadLocalStates = () => {
        const fav = Taro.getStorageSync(FAVORITE_KEY)
        const hist = Taro.getStorageSync(HISTORY_KEY)

        const favIds = safeArray<string>(fav).filter(Boolean)
        const historyList = safeArray<HistoryItem>(hist)

        setFavoriteIds(favIds)
        setRecentHistory(historyList.slice(0, 10))
        return { favIds, historyList }
    }

    // 用收藏 id + 历史记录优先补齐收藏卡片；缺失再调详情接口补
    const loadFavoriteCards = async (favIds: string[], historyList: HistoryItem[]) => {
        if (!favIds.length) {
            setFavoriteItems([])
            return
        }

        setLoadingFavorites(true)
        try {
            const historyMap = new Map<string, HistoryItem>()
            historyList.forEach(h => {
                if (h?.id) historyMap.set(h.id, h)
            })

            const cardsFromHistory: FavoriteCardItem[] = []
            const missingIds: string[] = []

            favIds.forEach(id => {
                const h = historyMap.get(id)
                if (h) {
                    cardsFromHistory.push({
                        id: h.id,
                        name: h.name,
                        city: h.city,
                        imageUrl: h.imageUrl,
                        minPrice: h.minPrice
                    })
                } else {
                    missingIds.push(id)
                }
            })

            // 只补前 6 个缺失详情，避免首页请求过多
            const idsToFetch = missingIds.slice(0, 6)
            let fetchedCards: FavoriteCardItem[] = []

            if (idsToFetch.length) {
                const results = await Promise.all(
                    idsToFetch.map(async (id) => {
                        try {
                            const res: any = await publicHotelsAPI.getDetail(id)
                            return {
                                id: res.id,
                                name: res.name || '未命名酒店',
                                city: res.city || '',
                                imageUrl: res.bannerImage || (Array.isArray(res.images) ? res.images[0] : '') || '',
                                minPrice: Number(res.minPrice || 0)
                            } as FavoriteCardItem
                        } catch {
                            return null
                        }
                    })
                )

                fetchedCards = results.filter(Boolean) as FavoriteCardItem[]
            }

            // 保持收藏顺序（以 favoriteIds 为准）
            const mergedMap = new Map<string, FavoriteCardItem>()
                ;[...cardsFromHistory, ...fetchedCards].forEach(item => {
                    if (item?.id) mergedMap.set(item.id, item)
                })

            const ordered = favIds
                .map(id => mergedMap.get(id))
                .filter(Boolean) as FavoriteCardItem[]

            setFavoriteItems(ordered)
        } finally {
            setLoadingFavorites(false)
        }
    }

    const loadHomeRemoteData = async () => {
        setLoading(true)
        try {
            const cache = Taro.getStorageSync(HOME_CACHE_KEY)
            const now = Date.now()

            if (
                cache &&
                typeof cache === 'object' &&
                cache.timestamp &&
                now - Number(cache.timestamp) < HOME_CACHE_TTL
            ) {
                const nextBanners = safeArray<BannerItem>(cache.banners).filter((b: any) => b && b.imageUrl)
                const nextCities = safeArray<string>(cache.cities)
                const nextTags = safeArray<string>(cache.tags)

                setBanners(nextBanners)
                setCities(nextCities)
                setTags(nextTags)

                // 仅当当前 city 为空或不在城市列表中时，才兜底设置
                if (nextCities.length) {
                    if (!city || !nextCities.includes(city)) {
                        setCity(nextCities[0])
                    }
                }

                setLoading(false)
                return
            }

            const [bannerRes, metaRes] = await Promise.all([
                publicHotelsAPI.getBanners(5),
                publicHotelsAPI.getMeta()
            ])

            const nextBanners = safeArray<BannerItem>(bannerRes?.items).filter((b: any) => b && b.imageUrl)
            const nextCities = safeArray<string>(metaRes?.cities)
            const nextTags = safeArray<string>(metaRes?.tags)

            setBanners(nextBanners)
            setCities(nextCities)
            setTags(nextTags)

            if (nextCities.length) {
                if (!city || !nextCities.includes(city)) {
                    setCity(nextCities[0])
                }
            }

            Taro.setStorageSync(HOME_CACHE_KEY, {
                timestamp: now,
                banners: nextBanners,
                cities: nextCities,
                tags: nextTags
            })
        } catch (e: any) {
            Taro.showToast({ title: e.message || '加载失败', icon: 'none' })
        } finally {
            setLoading(false)
        }
    }

    useDidShow(() => {
        // 每次回首页都刷新本地收藏/浏览历史（从详情页返回时立即同步）
        const { favIds, historyList } = loadLocalStates()

        // 刷新收藏卡片（优先用历史记录填充，缺失再请求详情）
        loadFavoriteCards(favIds, historyList)

            // 拉首页远程数据（带缓存）
            ; (async () => {
                await loadHomeRemoteData()
            })()
    })

    const onToggleTag = (t: string) => {
        setSelectedTags(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]))
    }

    const onSearch = () => {
        // 基础校验：离店日期必须大于入住日期
        if (new Date(checkOut).getTime() <= new Date(checkIn).getTime()) {
            Taro.showToast({ title: '离店日期必须晚于入住日期', icon: 'none' })
            return
        }

        // 主动保存一份（即使 useEffect 也会保存，这里保证点击查询时一定落盘）
        Taro.setStorageSync(SEARCH_CACHE_KEY, {
            city,
            keyword,
            checkIn,
            checkOut,
            star,
            selectedTags
        })

        const qs = new URLSearchParams({
            city,
            keyword,
            checkIn,
            checkOut,
            star: star ? String(star) : '',
            tags: selectedTags.join(',')
        }).toString()

        Taro.navigateTo({ url: `/pages/hotel-list/index?${qs}` })
    }

    const onClickBanner = (hotelId: string) => {
        if (!hotelId) return
        const qs = new URLSearchParams({
            id: hotelId,
            checkIn,
            checkOut
        }).toString()
        Taro.navigateTo({ url: `/pages/hotel-detail/index?${qs}` })
    }

    const onClickHistory = (hotelId: string) => {
        if (!hotelId) return
        const qs = new URLSearchParams({
            id: hotelId,
            checkIn,
            checkOut
        }).toString()
        Taro.navigateTo({ url: `/pages/hotel-detail/index?${qs}` })
    }

    const onClickFavorite = (hotelId: string) => {
        if (!hotelId) return
        const qs = new URLSearchParams({
            id: hotelId,
            checkIn,
            checkOut
        }).toString()
        Taro.navigateTo({ url: `/pages/hotel-detail/index?${qs}` })
    }

    const removeFavoriteFromHome = (hotelId: string, e?: any) => {
        e?.stopPropagation?.()
        const list = Taro.getStorageSync(FAVORITE_KEY)
        const arr = safeArray<string>(list)
        const next = arr.filter(id => id !== hotelId)
        Taro.setStorageSync(FAVORITE_KEY, next)
        setFavoriteIds(next)
        setFavoriteItems(prev => prev.filter(item => item.id !== hotelId))
        Taro.showToast({ title: '已取消收藏', icon: 'none' })
    }

    const clearSearchCache = () => {
        Taro.showModal({
            title: '重置搜索条件',
            content: '确定恢复默认搜索条件吗？',
            success: (res) => {
                if (!res.confirm) return

                Taro.removeStorageSync(SEARCH_CACHE_KEY)

                const todayDate = new Date()
                const tomorrowDate = new Date(Date.now() + 24 * 3600 * 1000)

                setKeyword('')
                setCheckIn(formatDate(todayDate))
                setCheckOut(formatDate(tomorrowDate))
                setStar(null)
                setSelectedTags([])

                // 城市重置成第一个可选城市（如果有）
                if (cities.length) {
                    setCity(cities[0])
                } else {
                    setCity('')
                }

                Taro.showToast({ title: '已重置', icon: 'none' })
            }
        })
    }

    const bannerItems = safeArray<BannerItem>(banners).filter((b: any) => b?.imageUrl)
    const canBannerSlide = bannerItems.length > 1

    return (
        <View style={{ padding: '16px', background: '#f6f7fb', minHeight: '100vh' }}>
            {/* 标题 */}
            <View style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                    <Text style={{ fontSize: '18px', fontWeight: 'bold' }}>酒店预订</Text>
                    {loading ? <Text style={{ marginLeft: '8px', color: '#666' }}>加载中...</Text> : null}
                </View>
                <Text onClick={clearSearchCache} style={{ color: '#0A6CFF', fontSize: '12px' }}>
                    重置搜索
                </Text>
            </View>

            {/* 顶部 Banner */}
            <View style={{ height: '160px', borderRadius: '12px', overflow: 'hidden', background: '#f2f2f2' }}>
                {bannerItems.length > 1 ? (
                    <Swiper
                        key={`home-banner-${bannerItems.length}`}
                        autoplay={canBannerSlide}
                        circular={canBannerSlide}
                        indicatorDots={canBannerSlide}
                        style={{ height: '160px' }}
                    >
                        {bannerItems.map((b: BannerItem) => (
                            <SwiperItem key={b.id}>
                                <View onClick={() => onClickBanner(b.id)} style={{ height: '160px', position: 'relative' }}>
                                    <Image src={b.imageUrl} mode='aspectFill' style={{ width: '100%', height: '160px' }} />
                                    <View
                                        style={{
                                            position: 'absolute',
                                            left: '12px',
                                            bottom: '12px',
                                            background: 'rgba(0,0,0,.45)',
                                            color: '#fff',
                                            padding: '4px 8px',
                                            borderRadius: '6px',
                                            maxWidth: '85%'
                                        }}
                                    >
                                        <Text>{b.title}</Text>
                                    </View>
                                </View>
                            </SwiperItem>
                        ))}
                    </Swiper>
                ) : bannerItems.length === 1 ? (
                    <View onClick={() => onClickBanner(bannerItems[0].id)} style={{ height: '160px', position: 'relative' }}>
                        <Image src={bannerItems[0].imageUrl} mode='aspectFill' style={{ width: '100%', height: '160px' }} />
                        <View
                            style={{
                                position: 'absolute',
                                left: '12px',
                                bottom: '12px',
                                background: 'rgba(0,0,0,.45)',
                                color: '#fff',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                maxWidth: '85%'
                            }}
                        >
                            <Text>{bannerItems[0].title}</Text>
                        </View>
                    </View>
                ) : (
                    <View
                        style={{
                            height: '160px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#999'
                        }}
                    >
                        暂无 Banner
                    </View>
                )}
            </View>

            {/* ✅ 我的收藏模块 */}
            <View style={{ marginTop: '14px', background: '#fff', borderRadius: '12px', padding: '12px' }}>
                <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: 600 }}>我的收藏</Text>
                    <Text style={{ color: '#999', fontSize: '12px' }}>
                        {loadingFavorites ? '加载中...' : `${favoriteIds.length} 项`}
                    </Text>
                </View>

                {!loadingFavorites && favoriteItems.length === 0 ? (
                    <View style={{ marginTop: '10px', color: '#999', fontSize: '13px' }}>
                        暂无收藏，去详情页点一下“收藏”吧～
                    </View>
                ) : null}

                {favoriteItems.length > 0 ? (
                    <View style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {favoriteItems.slice(0, 3).map((item) => (
                            <View
                                key={item.id}
                                onClick={() => onClickFavorite(item.id)}
                                style={{
                                    display: 'flex',
                                    background: '#fafafa',
                                    borderRadius: '10px',
                                    padding: '8px'
                                }}
                            >
                                {item.imageUrl ? (
                                    <Image
                                        src={item.imageUrl}
                                        mode='aspectFill'
                                        style={{
                                            width: '88px',
                                            height: '70px',
                                            borderRadius: '8px',
                                            background: '#eee',
                                            flexShrink: 0
                                        }}
                                    />
                                ) : (
                                    <View
                                        style={{
                                            width: '88px',
                                            height: '70px',
                                            borderRadius: '8px',
                                            background: '#eee',
                                            flexShrink: 0
                                        }}
                                    />
                                )}

                                <View style={{ marginLeft: '10px', flex: 1, overflow: 'hidden' }}>
                                    <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text
                                            style={{
                                                fontWeight: 600,
                                                maxWidth: '70%',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {item.name}
                                        </Text>

                                        <Text
                                            style={{ fontSize: '12px', color: '#FF7A00' }}
                                            onClick={(e) => removeFavoriteFromHome(item.id, e)}
                                        >
                                            取消收藏
                                        </Text>
                                    </View>

                                    <View style={{ marginTop: '4px', color: '#666', fontSize: '12px' }}>
                                        {item.city || '未知城市'}
                                    </View>

                                    <View style={{ marginTop: '8px', textAlign: 'right' }}>
                                        <Text style={{ color: '#FF7A00', fontWeight: 600 }}>¥{item.minPrice || 0}</Text>
                                        <Text style={{ color: '#999', fontSize: '12px' }}> 起</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : null}
            </View>

            {/* 最近浏览 */}
            <View style={{ marginTop: '14px', background: '#fff', borderRadius: '12px', padding: '12px' }}>
                <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: 600 }}>最近浏览</Text>
                    {recentHistory.length > 0 ? (
                        <Text
                            style={{ color: '#0A6CFF', fontSize: '12px' }}
                            onClick={() => {
                                Taro.showModal({
                                    title: '清空最近浏览',
                                    content: '确定要清空最近浏览记录吗？',
                                    success: (res) => {
                                        if (res.confirm) {
                                            Taro.removeStorageSync(HISTORY_KEY)
                                            setRecentHistory([])
                                        }
                                    }
                                })
                            }}
                        >
                            清空
                        </Text>
                    ) : null}
                </View>

                {recentHistory.length === 0 ? (
                    <View style={{ marginTop: '10px', color: '#999', fontSize: '13px' }}>
                        暂无最近浏览，去看看酒店吧～
                    </View>
                ) : (
                    <View style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {recentHistory.slice(0, 3).map((h) => {
                            const isFav = favoriteIds.includes(h.id)
                            return (
                                <View
                                    key={h.id}
                                    onClick={() => onClickHistory(h.id)}
                                    style={{
                                        display: 'flex',
                                        background: '#fafafa',
                                        borderRadius: '10px',
                                        padding: '8px'
                                    }}
                                >
                                    {h.imageUrl ? (
                                        <Image
                                            src={h.imageUrl}
                                            mode='aspectFill'
                                            style={{
                                                width: '88px',
                                                height: '70px',
                                                borderRadius: '8px',
                                                background: '#eee',
                                                flexShrink: 0
                                            }}
                                        />
                                    ) : (
                                        <View
                                            style={{
                                                width: '88px',
                                                height: '70px',
                                                borderRadius: '8px',
                                                background: '#eee',
                                                flexShrink: 0
                                            }}
                                        />
                                    )}

                                    <View style={{ marginLeft: '10px', flex: 1, overflow: 'hidden' }}>
                                        <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Text
                                                style={{
                                                    fontWeight: 600,
                                                    maxWidth: '70%',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {h.name}
                                            </Text>
                                            {isFav ? <Text style={{ fontSize: '12px', color: '#FF7A00' }}>已收藏</Text> : null}
                                        </View>

                                        <View style={{ marginTop: '4px', color: '#666', fontSize: '12px' }}>
                                            {h.city || '未知城市'}
                                        </View>

                                        <View style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ color: '#999', fontSize: '12px' }}>
                                                {h.viewedAt ? new Date(h.viewedAt).toLocaleString() : ''}
                                            </Text>
                                            <View>
                                                <Text style={{ color: '#FF7A00', fontWeight: 600 }}>¥{h.minPrice || 0}</Text>
                                                <Text style={{ color: '#999', fontSize: '12px' }}> 起</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )
                        })}
                    </View>
                )}
            </View>

            {/* 核心查询区（支持本地记忆） */}
            <View style={{ marginTop: '14px', background: '#fff', borderRadius: '12px', padding: '12px' }}>
                <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: 600 }}>搜索酒店</Text>
                    <Text style={{ color: '#999', fontSize: '12px' }}>已自动记住你的筛选条件</Text>
                </View>

                <Text style={{ marginTop: '12px', display: 'block' }}>城市</Text>
                <Picker
                    mode='selector'
                    range={cities}
                    onChange={e => setCity(cities[Number(e.detail.value)])}
                >
                    <View style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '6px' }}>
                        {city || (cities[0] || '请选择城市')}
                    </View>
                </Picker>

                <Text style={{ marginTop: '12px', display: 'block' }}>关键词</Text>
                <Input
                    value={keyword}
                    onInput={e => setKeyword(e.detail.value)}
                    placeholder='酒店名/商圈/地标'
                    style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '6px' }}
                />

                <Text style={{ marginTop: '12px', display: 'block' }}>入住 / 离店</Text>
                <View style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                    <Picker mode='date' value={checkIn} onChange={e => setCheckIn(e.detail.value)}>
                        <View style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
                            入住：{checkIn}
                        </View>
                    </Picker>
                    <Picker mode='date' value={checkOut} onChange={e => setCheckOut(e.detail.value)}>
                        <View style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
                            离店：{checkOut}
                        </View>
                    </Picker>
                </View>

                <View style={{ marginTop: '6px', color: '#666', fontSize: '12px' }}>
                    共 {nights} 晚
                </View>

                <Text style={{ marginTop: '12px', display: 'block' }}>星级（可选）</Text>
                <Picker
                    mode='selector'
                    range={['不限', '3星', '4星', '5星']}
                    onChange={e => {
                        const v = Number(e.detail.value)
                        setStar(v === 0 ? null : v + 2)
                    }}
                >
                    <View style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '6px' }}>
                        {star ? `${star}星` : '不限'}
                    </View>
                </Picker>

                <Text style={{ marginTop: '12px', display: 'block' }}>快捷标签</Text>
                <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                    {tags.map(t => {
                        const active = selectedTags.includes(t)
                        return (
                            <View
                                key={t}
                                onClick={() => onToggleTag(t)}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '999px',
                                    border: active ? '1px solid #0A6CFF' : '1px solid #ddd',
                                    color: active ? '#0A6CFF' : '#333',
                                    background: active ? '#f0f7ff' : '#fff'
                                }}
                            >
                                {t}
                            </View>
                        )
                    })}
                </View>

                <Button onClick={onSearch} style={{ marginTop: '16px' }} type='primary'>
                    查询
                </Button>
            </View>
        </View>
    )
}