import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, Image, Input, Picker, ScrollView } from '@tarojs/components'
import Taro, { useDidShow, usePullDownRefresh, useReachBottom } from '@tarojs/taro'
import { publicHotelsAPI } from '../../api'

const FAVORITE_KEY = 'triptrip_favorites'

type SortType = 'recommended' | 'priceAsc' | 'priceDesc'

type HotelItem = {
    id?: string
    hotelId?: string
    name?: string
    city?: string
    address?: string
    starRating?: number
    tags?: string[]
    amenities?: string[]
    imageUrl?: string
    minPrice?: number
    featured?: boolean
}

type MetaResp = {
    cities?: string[]
    tags?: string[]
    starRatings?: number[]
    priceRange?: { min: number; max: number }
}

type ListResp = {
    items?: HotelItem[]
    pagination?: {
        page?: number
        pageSize?: number
        total?: number
        totalPages?: number
    }
}

function safeDecode(v?: string) {
    if (!v) return ''
    try {
        return decodeURIComponent(v)
    } catch {
        return v
    }
}

function formatDate(date: Date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

function toNum(v: any, fallback = 0) {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
}

function normalizeMeta(raw: any): Required<MetaResp> {
    return {
        cities: Array.isArray(raw?.cities) ? raw.cities.filter(Boolean) : [],
        tags: Array.isArray(raw?.tags) ? raw.tags.filter(Boolean) : [],
        starRatings: Array.isArray(raw?.starRatings) ? raw.starRatings : [3, 4, 5],
        priceRange: raw?.priceRange || { min: 0, max: 2000 }
    }
}

function normalizeListResp(raw: any): Required<ListResp> {
    // 兼容旧接口：直接返回数组
    if (Array.isArray(raw)) {
        return {
            items: raw,
            pagination: {
                page: 1,
                pageSize: raw.length,
                total: raw.length,
                totalPages: 1
            }
        }
    }

    const items = Array.isArray(raw?.items) ? raw.items : []
    const p = raw?.pagination || {}

    return {
        items,
        pagination: {
            page: toNum(p.page, 1),
            pageSize: toNum(p.pageSize, items.length || 10),
            total: toNum(p.total, items.length),
            totalPages: toNum(p.totalPages, 1)
        }
    }
}

function getHotelId(item: HotelItem) {
    return String(item?.id || item?.hotelId || '')
}

function normalizeHotel(item: any): HotelItem {
    return {
        id: String(item?.id || item?.hotelId || ''),
        hotelId: String(item?.hotelId || item?.id || ''),
        name: item?.name || item?.nameCn || item?.nameEn || '未命名酒店',
        city: item?.city || '',
        address: item?.address || '',
        starRating: toNum(item?.starRating, 0),
        tags: Array.isArray(item?.tags) ? item.tags.filter(Boolean) : [],
        amenities: Array.isArray(item?.amenities) ? item.amenities.filter(Boolean) : [],
        imageUrl: item?.imageUrl || item?.bannerImage || (Array.isArray(item?.images) ? item.images[0] : '') || '',
        minPrice: toNum(item?.minPrice, 0),
        featured: !!item?.featured
    }
}

const SORT_OPTIONS: { label: string; value: SortType }[] = [
    { label: '推荐排序', value: 'recommended' },
    { label: '价格从低到高', value: 'priceAsc' },
    { label: '价格从高到低', value: 'priceDesc' }
]

const STAR_OPTIONS = [
    { label: '不限星级', value: 0 },
    { label: '3星', value: 3 },
    { label: '4星', value: 4 },
    { label: '5星', value: 5 }
]

export default function HotelListPage() {
    const router = Taro.getCurrentInstance().router
    const params = router?.params || {}

    // 兼容首页传参（中文参数解码）
    const initialKeyword = safeDecode(params.keyword || '')
    const initialCity = safeDecode(params.city || '')
    const checkIn = safeDecode(params.checkIn || formatDate(new Date()))
    const checkOut = safeDecode(
        params.checkOut || formatDate(new Date(Date.now() + 24 * 3600 * 1000))
    )

    const [meta, setMeta] = useState<Required<MetaResp>>({
        cities: [],
        tags: [],
        starRatings: [3, 4, 5],
        priceRange: { min: 0, max: 2000 }
    })

    const [keywordInput, setKeywordInput] = useState(initialKeyword)
    const [keyword, setKeyword] = useState(initialKeyword)
    const [city, setCity] = useState(initialCity)
    const [star, setStar] = useState<number>(0)
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [sort, setSort] = useState<SortType>('recommended')

    const [list, setList] = useState<HotelItem[]>([])
    const [page, setPage] = useState(1)
    const [pageSize] = useState(10)
    const [total, setTotal] = useState(0)
    const [hasMore, setHasMore] = useState(true)

    const [loading, setLoading] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)
    const [favoriteIds, setFavoriteIds] = useState<string[]>([])

    const cityPickerOptions = useMemo(() => ['全部城市', ...(meta.cities || [])], [meta.cities])
    const cityPickerIndex = useMemo(() => {
        if (!city) return 0
        const idx = cityPickerOptions.findIndex(c => c === city)
        return idx >= 0 ? idx : 0
    }, [city, cityPickerOptions])

    const sortPickerOptions = useMemo(() => SORT_OPTIONS.map(s => s.label), [])
    const sortPickerIndex = useMemo(
        () => Math.max(0, SORT_OPTIONS.findIndex(s => s.value === sort)),
        [sort]
    )

    const starPickerOptions = useMemo(() => STAR_OPTIONS.map(s => s.label), [])
    const starPickerIndex = useMemo(() => {
        const idx = STAR_OPTIONS.findIndex(s => s.value === star)
        return idx >= 0 ? idx : 0
    }, [star])

    const activeFilterCount = useMemo(() => {
        let c = 0
        if (keyword.trim()) c += 1
        if (city) c += 1
        if (star) c += 1
        if (selectedTags.length) c += 1
        if (sort !== 'recommended') c += 1
        return c
    }, [keyword, city, star, selectedTags, sort])

    const syncFavorites = useCallback(() => {
        const raw = Taro.getStorageSync(FAVORITE_KEY)
        const arr = Array.isArray(raw) ? raw.map(String) : []
        setFavoriteIds(arr)
    }, [])

    const fetchMeta = useCallback(async () => {
        try {
            const raw = await publicHotelsAPI.getMeta()
            const m = normalizeMeta(raw)
            setMeta(m)
        } catch (e: any) {
            console.error('getMeta error', e)
            // 不阻塞列表
        }
    }, [])

    const buildQueryParams = useCallback(
        (targetPage: number) => {
            const p: Record<string, any> = {
                page: targetPage,
                pageSize,
                sort
            }

            if (keyword.trim()) p.keyword = keyword.trim()
            if (city) p.city = city
            if (star) p.star = star
            if (selectedTags.length) p.tags = selectedTags.join(',')

            return p
        },
        [pageSize, sort, keyword, city, star, selectedTags]
    )

    const fetchList = useCallback(
        async (opts?: { reset?: boolean }) => {
            const reset = !!opts?.reset
            const targetPage = reset ? 1 : page

            if (reset) {
                setLoading(true)
            } else {
                if (loadingMore || loading) return
                setLoadingMore(true)
            }

            try {
                const raw = await publicHotelsAPI.getList(buildQueryParams(targetPage))
                const res = normalizeListResp(raw)
                const items = (res.items || []).map(normalizeHotel)

                setList(prev => (reset ? items : [...prev, ...items]))
                setTotal(toNum(res.pagination?.total, items.length))
                setPage(toNum(res.pagination?.page, targetPage))

                const totalPages = toNum(res.pagination?.totalPages, 1)
                const currentPage = toNum(res.pagination?.page, targetPage)
                setHasMore(currentPage < totalPages)
            } catch (e: any) {
                console.error('getList error', e)
                Taro.showToast({ title: e?.message || '加载失败', icon: 'none' })
            } finally {
                setLoading(false)
                setLoadingMore(false)
                Taro.stopPullDownRefresh()
            }
        },
        [page, loading, loadingMore, buildQueryParams]
    )

    const reloadFirstPage = useCallback(async () => {
        setPage(1)
        setHasMore(true)
        await fetchList({ reset: true })
    }, [fetchList])

    // 初始化：先拉 meta，再拉列表
    useEffect(() => {
        ; (async () => {
            syncFavorites()
            await fetchMeta()
            await fetchList({ reset: true })
        })()
    }, [fetchMeta, fetchList, syncFavorites])

    // 页面回显时同步收藏状态
    useDidShow(() => {
        syncFavorites()
    })

    // 下拉刷新
    usePullDownRefresh(() => {
        reloadFirstPage()
    })

    // 触底加载
    useReachBottom(() => {
        if (loading || loadingMore || !hasMore) return
        setPage(prev => prev + 1)
    })

    // page 改变时（且不是第一页）加载下一页
    useEffect(() => {
        if (page <= 1) return
        fetchList({ reset: false })
    }, [page, fetchList])

    const handleSearch = async () => {
        setKeyword(keywordInput.trim())
        // 注意：setState 异步，直接用临时值避免时序问题
        setTimeout(() => {
            reloadFirstPage()
        }, 0)
    }

    const handleResetFilters = async () => {
        setKeywordInput('')
        setKeyword('')
        setCity('')
        setStar(0)
        setSelectedTags([])
        setSort('recommended')

        setTimeout(() => {
            reloadFirstPage()
        }, 0)
    }

    const applyFiltersNow = async () => {
        setTimeout(() => {
            reloadFirstPage()
        }, 0)
    }

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => {
            if (prev.includes(tag)) {
                return prev.filter(t => t !== tag)
            }
            return [...prev, tag]
        })
    }

    const toggleFavorite = (hotel: HotelItem, e?: any) => {
        e?.stopPropagation?.()

        const id = getHotelId(hotel)
        if (!id) return

        const raw = Taro.getStorageSync(FAVORITE_KEY)
        const arr: string[] = Array.isArray(raw) ? raw.map(String) : []

        if (arr.includes(id)) {
            const next = arr.filter(x => x !== id)
            Taro.setStorageSync(FAVORITE_KEY, next)
            setFavoriteIds(next)
            Taro.showToast({ title: '已取消收藏', icon: 'none' })
        } else {
            const next = [id, ...arr.filter(x => x !== id)].slice(0, 100)
            Taro.setStorageSync(FAVORITE_KEY, next)
            setFavoriteIds(next)
            Taro.showToast({ title: '已收藏', icon: 'none' })
        }
    }

    const goDetail = (hotel: HotelItem) => {
        const id = getHotelId(hotel)
        if (!id) {
            Taro.showToast({ title: '酒店ID缺失', icon: 'none' })
            return
        }

        Taro.navigateTo({
            url: `/pages/hotel-detail/index?id=${encodeURIComponent(id)}&checkIn=${encodeURIComponent(
                checkIn
            )}&checkOut=${encodeURIComponent(checkOut)}`
        })
    }

    const renderHotelCard = (item: HotelItem, index: number) => {
        const id = getHotelId(item)
        const isFav = favoriteIds.includes(id)
        const tags = Array.isArray(item.tags) ? item.tags.slice(0, 4) : []
        const img = item.imageUrl || ''
        const minPrice = toNum(item.minPrice, 0)

        return (
            <View
                key={`${id || index}`}
                onClick={() => goDetail(item)}
                style={{
                    background: '#fff',
                    borderRadius: '20rpx',
                    marginBottom: '16rpx',
                    padding: '16rpx',
                    boxSizing: 'border-box'
                }}
            >
                <View style={{ display: 'flex', gap: '16rpx' }}>
                    {/* 左侧图片 */}
                    <View
                        style={{
                            width: '220rpx',
                            height: '170rpx',
                            borderRadius: '16rpx',
                            overflow: 'hidden',
                            background: '#f2f3f5',
                            flexShrink: 0,
                            position: 'relative'
                        }}
                    >
                        {img ? (
                            <Image
                                src={img}
                                mode='aspectFill'
                                style={{ width: '220rpx', height: '170rpx' }}
                            />
                        ) : (
                            <View
                                style={{
                                    width: '220rpx',
                                    height: '170rpx',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#999',
                                    fontSize: '24rpx'
                                }}
                            >
                                暂无图片
                            </View>
                        )}

                        {item.featured ? (
                            <View
                                style={{
                                    position: 'absolute',
                                    left: '10rpx',
                                    top: '10rpx',
                                    background: '#ff7a45',
                                    color: '#fff',
                                    fontSize: '20rpx',
                                    padding: '4rpx 10rpx',
                                    borderRadius: '999rpx'
                                }}
                            >
                                精选
                            </View>
                        ) : null}
                    </View>

                    {/* 右侧内容 */}
                    <View style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <View style={{ display: 'flex', justifyContent: 'space-between', gap: '12rpx' }}>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text
                                    style={{
                                        fontSize: '28rpx',
                                        fontWeight: 700,
                                        color: '#222',
                                        display: 'block'
                                    }}
                                    numberOfLines={1}
                                >
                                    {item.name || '未命名酒店'}
                                </Text>

                                <View style={{ marginTop: '6rpx', display: 'flex', alignItems: 'center', gap: '8rpx', flexWrap: 'wrap' }}>
                                    {!!item.starRating && (
                                        <Text
                                            style={{
                                                fontSize: '20rpx',
                                                color: '#c58a00',
                                                background: '#fff8db',
                                                padding: '4rpx 10rpx',
                                                borderRadius: '10rpx'
                                            }}
                                        >
                                            {item.starRating}星
                                        </Text>
                                    )}
                                    {!!item.city && (
                                        <Text style={{ fontSize: '22rpx', color: '#666' }}>{item.city}</Text>
                                    )}
                                </View>
                            </View>

                            <View
                                onClick={(e) => toggleFavorite(item, e)}
                                style={{
                                    width: '62rpx',
                                    height: '62rpx',
                                    borderRadius: '14rpx',
                                    border: '1px solid #eee',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: isFav ? '#faad14' : '#999',
                                    background: '#fff',
                                    flexShrink: 0
                                }}
                            >
                                <Text style={{ fontSize: '28rpx' }}>{isFav ? '★' : '☆'}</Text>
                            </View>
                        </View>

                        {!!item.address && (
                            <Text
                                style={{
                                    marginTop: '8rpx',
                                    fontSize: '22rpx',
                                    color: '#888',
                                    display: 'block'
                                }}
                                numberOfLines={1}
                            >
                                {item.address}
                            </Text>
                        )}

                        {!!tags.length && (
                            <View style={{ marginTop: '10rpx', display: 'flex', gap: '8rpx', flexWrap: 'wrap' }}>
                                {tags.map((tag, idx) => (
                                    <Text
                                        key={`${tag}-${idx}`}
                                        style={{
                                            fontSize: '20rpx',
                                            color: '#1677ff',
                                            background: '#eef5ff',
                                            padding: '4rpx 10rpx',
                                            borderRadius: '999rpx'
                                        }}
                                    >
                                        {tag}
                                    </Text>
                                ))}
                            </View>
                        )}

                        <View
                            style={{
                                marginTop: 'auto',
                                paddingTop: '12rpx',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-end'
                            }}
                        >
                            <Text style={{ fontSize: '20rpx', color: '#999' }}>
                                {checkIn} - {checkOut}
                            </Text>
                            <View>
                                <Text style={{ fontSize: '20rpx', color: '#ff4d4f' }}>¥</Text>
                                <Text style={{ fontSize: '34rpx', color: '#ff4d4f', fontWeight: 700 }}>
                                    {minPrice}
                                </Text>
                                <Text style={{ fontSize: '20rpx', color: '#999' }}>/晚起</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </View>
        )
    }

    return (
        <View style={{ minHeight: '100vh', background: '#f5f7fb' }}>
            {/* 顶部搜索栏 */}
            <View
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    background: '#fff',
                    padding: '16rpx 20rpx 12rpx',
                    borderBottom: '1px solid #f0f0f0'
                }}
            >
                <View
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12rpx'
                    }}
                >
                    <View
                        style={{
                            flex: 1,
                            background: '#f5f7fb',
                            borderRadius: '16rpx',
                            padding: '0 16rpx',
                            height: '72rpx',
                            display: 'flex',
                            alignItems: 'center',
                            boxSizing: 'border-box'
                        }}
                    >
                        <Input
                            value={keywordInput}
                            placeholder='搜索酒店名 / 城市 / 地址'
                            onInput={(e) => setKeywordInput(e.detail.value)}
                            onConfirm={handleSearch}
                            style={{ width: '100%', fontSize: '26rpx' }}
                            confirmType='search'
                        />
                    </View>

                    <View
                        onClick={handleSearch}
                        style={{
                            width: '120rpx',
                            height: '72rpx',
                            borderRadius: '16rpx',
                            background: '#1677ff',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '26rpx',
                            fontWeight: 600
                        }}
                    >
                        搜索
                    </View>
                </View>

                {/* 日期展示（从首页透传过来） */}
                <View style={{ marginTop: '10rpx', display: 'flex', alignItems: 'center', gap: '12rpx', flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: '22rpx', color: '#666' }}>入住：{checkIn}</Text>
                    <Text style={{ fontSize: '22rpx', color: '#666' }}>离店：{checkOut}</Text>
                    {activeFilterCount > 0 ? (
                        <Text
                            style={{
                                fontSize: '20rpx',
                                color: '#1677ff',
                                background: '#eef5ff',
                                padding: '4rpx 10rpx',
                                borderRadius: '999rpx'
                            }}
                        >
                            已启用 {activeFilterCount} 项筛选
                        </Text>
                    ) : null}
                </View>
            </View>

            {/* 筛选栏 */}
            <View
                style={{
                    background: '#fff',
                    padding: '12rpx 20rpx 16rpx',
                    borderBottom: '1px solid #f5f5f5'
                }}
            >
                <View style={{ display: 'flex', gap: '12rpx', flexWrap: 'wrap' }}>
                    {/* 城市 */}
                    <Picker
                        mode='selector'
                        range={cityPickerOptions}
                        value={cityPickerIndex}
                        onChange={(e) => {
                            const idx = Number(e.detail.value || 0)
                            const picked = cityPickerOptions[idx]
                            setCity(picked === '全部城市' ? '' : picked)
                            setTimeout(() => applyFiltersNow(), 0)
                        }}
                    >
                        <View
                            style={{
                                padding: '10rpx 16rpx',
                                borderRadius: '999rpx',
                                background: city ? '#eef5ff' : '#f5f7fb',
                                color: city ? '#1677ff' : '#333',
                                fontSize: '24rpx'
                            }}
                        >
                            {city || '全部城市'} ▾
                        </View>
                    </Picker>

                    {/* 星级 */}
                    <Picker
                        mode='selector'
                        range={starPickerOptions}
                        value={starPickerIndex}
                        onChange={(e) => {
                            const idx = Number(e.detail.value || 0)
                            const picked = STAR_OPTIONS[idx]
                            setStar(picked?.value || 0)
                            setTimeout(() => applyFiltersNow(), 0)
                        }}
                    >
                        <View
                            style={{
                                padding: '10rpx 16rpx',
                                borderRadius: '999rpx',
                                background: star ? '#eef5ff' : '#f5f7fb',
                                color: star ? '#1677ff' : '#333',
                                fontSize: '24rpx'
                            }}
                        >
                            {star ? `${star}星` : '不限星级'} ▾
                        </View>
                    </Picker>

                    {/* 排序 */}
                    <Picker
                        mode='selector'
                        range={sortPickerOptions}
                        value={sortPickerIndex}
                        onChange={(e) => {
                            const idx = Number(e.detail.value || 0)
                            const picked = SORT_OPTIONS[idx]
                            setSort((picked?.value || 'recommended') as SortType)
                            setTimeout(() => applyFiltersNow(), 0)
                        }}
                    >
                        <View
                            style={{
                                padding: '10rpx 16rpx',
                                borderRadius: '999rpx',
                                background: sort !== 'recommended' ? '#eef5ff' : '#f5f7fb',
                                color: sort !== 'recommended' ? '#1677ff' : '#333',
                                fontSize: '24rpx'
                            }}
                        >
                            {SORT_OPTIONS.find(s => s.value === sort)?.label || '推荐排序'} ▾
                        </View>
                    </Picker>

                    {/* 重置 */}
                    <View
                        onClick={handleResetFilters}
                        style={{
                            padding: '10rpx 16rpx',
                            borderRadius: '999rpx',
                            background: '#fff7e8',
                            color: '#ad6800',
                            fontSize: '24rpx'
                        }}
                    >
                        重置筛选
                    </View>
                </View>

                {/* 标签筛选（横向滚动） */}
                {!!meta.tags.length && (
                    <ScrollView
                        scrollX
                        enhanced
                        showScrollbar={false}
                        style={{ marginTop: '14rpx', whiteSpace: 'nowrap' }}
                    >
                        <View style={{ display: 'flex', gap: '10rpx', paddingBottom: '4rpx' }}>
                            {meta.tags.map((tag, idx) => {
                                const active = selectedTags.includes(tag)
                                return (
                                    <View
                                        key={`${tag}-${idx}`}
                                        onClick={() => {
                                            toggleTag(tag)
                                            setTimeout(() => applyFiltersNow(), 0)
                                        }}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '8rpx 14rpx',
                                            borderRadius: '999rpx',
                                            background: active ? '#1677ff' : '#f5f7fb',
                                            color: active ? '#fff' : '#333',
                                            fontSize: '22rpx',
                                            flexShrink: 0
                                        }}
                                    >
                                        {tag}
                                    </View>
                                )
                            })}
                        </View>
                    </ScrollView>
                )}
            </View>

            {/* 结果统计 */}
            <View style={{ padding: '14rpx 20rpx 10rpx' }}>
                <Text style={{ fontSize: '22rpx', color: '#666' }}>
                    共找到 <Text style={{ color: '#1677ff' }}>{total}</Text> 家酒店
                </Text>
            </View>

            {/* 列表区域 */}
            <View style={{ padding: '0 20rpx 24rpx' }}>
                {loading && list.length === 0 ? (
                    <View
                        style={{
                            background: '#fff',
                            borderRadius: '20rpx',
                            padding: '40rpx 20rpx',
                            textAlign: 'center'
                        }}
                    >
                        <Text style={{ color: '#999', fontSize: '26rpx' }}>加载中...</Text>
                    </View>
                ) : list.length === 0 ? (
                    <View
                        style={{
                            background: '#fff',
                            borderRadius: '20rpx',
                            padding: '48rpx 20rpx',
                            textAlign: 'center'
                        }}
                    >
                        <Text style={{ display: 'block', color: '#666', fontSize: '28rpx', fontWeight: 600 }}>
                            没有找到符合条件的酒店
                        </Text>
                        <Text style={{ display: 'block', color: '#999', fontSize: '22rpx', marginTop: '8rpx' }}>
                            试试减少筛选条件或更换关键词
                        </Text>
                    </View>
                ) : (
                    <>
                        {list.map((item, index) => renderHotelCard(item, index))}

                        <View
                            style={{
                                padding: '12rpx 0 18rpx',
                                textAlign: 'center'
                            }}
                        >
                            {loadingMore ? (
                                <Text style={{ color: '#999', fontSize: '22rpx' }}>加载更多中...</Text>
                            ) : hasMore ? (
                                <Text style={{ color: '#bbb', fontSize: '22rpx' }}>上拉 / 触底继续加载</Text>
                            ) : (
                                <Text style={{ color: '#bbb', fontSize: '22rpx' }}>已经到底了</Text>
                            )}
                        </View>
                    </>
                )}
            </View>
        </View>
    )
}