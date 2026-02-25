import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Image, Picker, Input } from '@tarojs/components'
import Taro, { usePullDownRefresh, useReachBottom } from '@tarojs/taro'
import { publicHotelsAPI } from '../../api'

type HotelItem = {
    id: string
    name: string
    city: string
    address: string
    starRating: number
    tags: string[]
    imageUrl: string
    minPrice: number
    featured?: boolean
}

type ListResponse = {
    items: HotelItem[]
    pagination?: {
        page: number
        pageSize: number
        total: number
        totalPages: number
    }
}

type SortType = 'recommended' | 'priceAsc' | 'priceDesc'
type PriceRangeType = 'all' | '0-300' | '300-500' | '500-800' | '800+'

type FilterState = {
    city: string
    keyword: string
    star: number | null
    tags: string[]
    priceRange: PriceRangeType // 前端本地过滤（当前已加载列表）
}

/** 修复中文参数被编码/重复编码显示异常 */
function safeDecode(value?: string) {
    if (!value) return ''
    let result = String(value)

    // 兼容可能的重复编码，最多解两次
    for (let i = 0; i < 2; i++) {
        try {
            const decoded = decodeURIComponent(result)
            if (decoded === result) break
            result = decoded
        } catch {
            break
        }
    }
    return result
}

function parseTags(value?: string) {
    if (!value) return []
    const decoded = safeDecode(value)
    return String(decoded)
        .split(',')
        .map(s => safeDecode(s.trim()))
        .filter(Boolean)
}

function parseStar(value?: string) {
    if (!value) return null
    const n = Number(value)
    return Number.isFinite(n) ? n : null
}

function inPriceRange(price: number, range: PriceRangeType) {
    if (range === 'all') return true
    if (range === '0-300') return price >= 0 && price < 300
    if (range === '300-500') return price >= 300 && price < 500
    if (range === '500-800') return price >= 500 && price < 800
    if (range === '800+') return price >= 800
    return true
}

export default function HotelListPage() {
    const router = Taro.getCurrentInstance().router
    const params = router?.params || {}

    const decodedCheckIn = safeDecode(params.checkIn || '')
    const decodedCheckOut = safeDecode(params.checkOut || '')

    const initialFilter = useMemo<FilterState>(() => {
        return {
            city: safeDecode(params.city || ''),
            keyword: safeDecode(params.keyword || ''),
            star: parseStar(params.star),
            tags: parseTags(params.tags),
            priceRange: 'all'
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const [items, setItems] = useState<HotelItem[]>([])
    const [sort, setSort] = useState<SortType>('recommended')

    // 分页状态
    const [page, setPage] = useState(1) // 下一次要请求的页码
    const [pageSize] = useState(10)
    const [hasMore, setHasMore] = useState(true)
    const [total, setTotal] = useState(0)

    // 加载状态
    const [initialLoading, setInitialLoading] = useState(false)
    const [refreshing, setRefreshing] = useState(false)
    const [loadingMore, setLoadingMore] = useState(false)

    // 错误信息
    const [errorText, setErrorText] = useState('')

    // 防止并发请求
    const requestingRef = useRef(false)

    // 筛选抽屉
    const [showFilter, setShowFilter] = useState(false)
    const [appliedFilter, setAppliedFilter] = useState<FilterState>(initialFilter)
    const [draftFilter, setDraftFilter] = useState<FilterState>(initialFilter)

    // 元数据（用于筛选项）
    const [metaCities, setMetaCities] = useState<string[]>([])
    const [metaTags, setMetaTags] = useState<string[]>([])

    const sortOptions = useMemo(() => ['推荐排序', '价格从低到高', '价格从高到低'], [])
    const priceOptions = useMemo(
        () => [
            { label: '不限', value: 'all' as PriceRangeType },
            { label: '¥0-300', value: '0-300' as PriceRangeType },
            { label: '¥300-500', value: '300-500' as PriceRangeType },
            { label: '¥500-800', value: '500-800' as PriceRangeType },
            { label: '¥800+', value: '800+' as PriceRangeType }
        ],
        []
    )

    const sortIndex = useMemo(() => {
        const map: SortType[] = ['recommended', 'priceAsc', 'priceDesc']
        return Math.max(0, map.indexOf(sort))
    }, [sort])

    const visibleItems = useMemo(() => {
        return items.filter(item => inPriceRange(Number(item.minPrice || 0), appliedFilter.priceRange))
    }, [items, appliedFilter.priceRange])

    const filterSummaryText = useMemo(() => {
        const parts: string[] = []
        if (appliedFilter.city) parts.push(`城市:${appliedFilter.city}`)
        if (appliedFilter.keyword) parts.push(`关键词:${appliedFilter.keyword}`)
        if (appliedFilter.star) parts.push(`${appliedFilter.star}星`)
        if (appliedFilter.tags.length) parts.push(`标签:${appliedFilter.tags.join('、')}`)
        if (appliedFilter.priceRange !== 'all') {
            const priceLabel = priceOptions.find(p => p.value === appliedFilter.priceRange)?.label || appliedFilter.priceRange
            parts.push(`价格:${priceLabel}`)
        }
        return parts.length ? parts : ['无']
    }, [appliedFilter, priceOptions])

    const buildQuery = useCallback(
        (targetPage: number, targetSort: SortType, targetFilter: FilterState) => ({
            city: targetFilter.city || undefined,
            keyword: targetFilter.keyword || undefined,
            checkIn: safeDecode(params.checkIn || '') || undefined,
            checkOut: safeDecode(params.checkOut || '') || undefined,
            star: targetFilter.star ?? undefined,
            tags: targetFilter.tags.length ? targetFilter.tags.join(',') : undefined,
            page: targetPage,
            pageSize,
            sort: targetSort
        }),
        [params.checkIn, params.checkOut, pageSize]
    )

    const loadMetaForFilters = useCallback(async () => {
        try {
            const res: any = await publicHotelsAPI.getMeta()
            setMetaCities(Array.isArray(res?.cities) ? res.cities : [])
            setMetaTags(Array.isArray(res?.tags) ? res.tags : [])
        } catch {
            // 元数据失败不阻断列表
        }
    }, [])

    const loadList = useCallback(
        async (
            targetSort: SortType = sort,
            targetFilter: FilterState = appliedFilter,
            options?: { reset?: boolean; source?: 'init' | 'refresh' | 'loadMore' | 'sort' | 'retry' | 'filter' }
        ) => {
            const reset = options?.reset ?? false
            const source = options?.source || 'init'

            if (requestingRef.current) return
            if (!reset && !hasMore) return

            requestingRef.current = true
            const requestPage = reset ? 1 : page

            if (source === 'init' || source === 'sort' || source === 'retry' || source === 'filter') {
                setInitialLoading(true)
            } else if (source === 'refresh') {
                setRefreshing(true)
            } else if (source === 'loadMore') {
                setLoadingMore(true)
            }

            if (reset) setErrorText('')

            try {
                const res = (await publicHotelsAPI.getList(
                    buildQuery(requestPage, targetSort, targetFilter)
                )) as ListResponse

                const newItems = Array.isArray(res.items) ? res.items : []
                const pagination = res.pagination || {
                    page: requestPage,
                    pageSize,
                    total: newItems.length,
                    totalPages: newItems.length > 0 ? 1 : 0
                }

                setItems(prev => {
                    if (reset) return newItems
                    const map = new Map<string, HotelItem>()
                        ;[...prev, ...newItems].forEach(item => {
                            if (item?.id) map.set(item.id, item)
                        })
                    return Array.from(map.values())
                })

                const totalPages = Number(pagination.totalPages || 0)
                const currentPage = Number(pagination.page || requestPage)

                setTotal(Number(pagination.total || 0))
                setPage(currentPage + 1)
                setHasMore(totalPages > 0 ? currentPage < totalPages : false)
                setErrorText('')
            } catch (e: any) {
                const msg = e?.message || '加载失败'
                setErrorText(msg)

                if (reset) {
                    setItems([])
                    setHasMore(false)
                    setPage(1)
                    setTotal(0)
                }

                Taro.showToast({ title: msg, icon: 'none' })
            } finally {
                requestingRef.current = false
                setInitialLoading(false)
                setRefreshing(false)
                setLoadingMore(false)
                Taro.stopPullDownRefresh()
            }
        },
        [sort, appliedFilter, hasMore, page, pageSize, buildQuery]
    )

    useEffect(() => {
        loadMetaForFilters()
        setPage(1)
        setHasMore(true)
        loadList(sort, initialFilter, { reset: true, source: 'init' })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    usePullDownRefresh(() => {
        setPage(1)
        setHasMore(true)
        loadList(sort, appliedFilter, { reset: true, source: 'refresh' })
    })

    useReachBottom(() => {
        if (requestingRef.current || !hasMore) return
        loadList(sort, appliedFilter, { reset: false, source: 'loadMore' })
    })

    const onChangeSort = (idx: number) => {
        const map: SortType[] = ['recommended', 'priceAsc', 'priceDesc']
        const nextSort = map[idx] || 'recommended'
        if (nextSort === sort) return

        setSort(nextSort)
        setPage(1)
        setHasMore(true)
        loadList(nextSort, appliedFilter, { reset: true, source: 'sort' })
    }

    const onRetry = () => {
        setPage(1)
        setHasMore(true)
        loadList(sort, appliedFilter, { reset: true, source: 'retry' })
    }

    const openFilterDrawer = () => {
        setDraftFilter({ ...appliedFilter, tags: [...appliedFilter.tags] })
        setShowFilter(true)
    }

    const closeFilterDrawer = () => setShowFilter(false)

    const toggleDraftTag = (tag: string) => {
        setDraftFilter(prev => {
            const exists = prev.tags.includes(tag)
            return {
                ...prev,
                tags: exists ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
            }
        })
    }

    const resetDraftFilter = () => {
        setDraftFilter({
            city: '',
            keyword: '',
            star: null,
            tags: [],
            priceRange: 'all'
        })
    }

    const applyFilterAndSearch = () => {
        const next = {
            ...draftFilter,
            keyword: (draftFilter.keyword || '').trim()
        }
        setAppliedFilter(next)
        setShowFilter(false)
        setPage(1)
        setHasMore(true)
        loadList(sort, next, { reset: true, source: 'filter' })
    }

    const onClickHotel = (hotelId: string) => {
        const q = new URLSearchParams({
            id: hotelId,
            checkIn: decodedCheckIn || '',
            checkOut: decodedCheckOut || ''
        }).toString()
        Taro.navigateTo({ url: `/pages/hotel-detail/index?${q}` })
    }

    return (
        <View style={{ padding: '12px', background: '#f6f7fb', minHeight: '100vh' }}>
            {/* 顶部条件卡片 */}
            <View style={{ marginBottom: '12px', background: '#fff', borderRadius: '10px', padding: '10px' }}>
                <Text style={{ fontWeight: 600 }}>搜索条件</Text>

                <View style={{ marginTop: '8px', color: '#666', fontSize: '14px' }}>
                    <Text>城市：{appliedFilter.city || '不限'}</Text>
                </View>

                <View style={{ marginTop: '4px', color: '#666', fontSize: '14px' }}>
                    <Text>关键词：{appliedFilter.keyword || '无'}</Text>
                </View>

                <View style={{ marginTop: '4px', color: '#666', fontSize: '14px' }}>
                    <Text>
                        日期：{decodedCheckIn || '-'} ~ {decodedCheckOut || '-'}
                    </Text>
                </View>

                <View style={{ marginTop: '4px', color: '#666', fontSize: '14px' }}>
                    <Text>
                        星级：{appliedFilter.star ? `${appliedFilter.star}星` : '不限'}
                    </Text>
                </View>

                <View style={{ marginTop: '4px', color: '#666', fontSize: '14px' }}>
                    <Text>标签：{appliedFilter.tags.length ? appliedFilter.tags.join('、') : '无'}</Text>
                </View>

                <View style={{ marginTop: '4px', color: '#666', fontSize: '14px' }}>
                    <Text>结果：服务端共 {total} 条（当前展示 {visibleItems.length} 条）</Text>
                </View>

                <View style={{ marginTop: '10px', display: 'flex' }}>
                    <View style={{ flex: 1, marginRight: '8px' }}>
                        <Picker mode='selector' range={sortOptions} onChange={(e) => onChangeSort(Number(e.detail.value))}>
                            <View style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '8px 10px', background: '#fff' }}>
                                排序：{sortOptions[sortIndex]}
                            </View>
                        </Picker>
                    </View>

                    <View
                        onClick={openFilterDrawer}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #1677ff',
                            color: '#1677ff',
                            background: '#f0f7ff'
                        }}
                    >
                        详细筛选
                    </View>
                </View>

                <View style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap' }}>
                    {filterSummaryText.map((txt, idx) => (
                        <View
                            key={`${txt}-${idx}`}
                            style={{
                                marginRight: '6px',
                                marginBottom: '6px',
                                fontSize: '12px',
                                color: '#1677ff',
                                border: '1px solid #cfe2ff',
                                background: '#f0f7ff',
                                borderRadius: '999px',
                                padding: '2px 8px'
                            }}
                        >
                            {txt}
                        </View>
                    ))}
                </View>
            </View>

            {/* 初始加载态 */}
            {initialLoading && items.length === 0 ? (
                <View style={{ textAlign: 'center', color: '#999', padding: '30px 0' }}>
                    加载中...
                </View>
            ) : null}

            {/* 空态 */}
            {!initialLoading && !refreshing && visibleItems.length === 0 && !errorText ? (
                <View
                    style={{
                        textAlign: 'center',
                        color: '#999',
                        padding: '30px 0',
                        background: '#fff',
                        borderRadius: '12px'
                    }}
                >
                    暂无符合条件的酒店
                </View>
            ) : null}

            {/* 错误态 */}
            {!initialLoading && items.length === 0 && !!errorText ? (
                <View
                    style={{
                        textAlign: 'center',
                        padding: '20px 12px',
                        background: '#fff',
                        borderRadius: '12px'
                    }}
                >
                    <Text style={{ color: '#ff4d4f' }}>{errorText}</Text>
                    <View
                        style={{
                            marginTop: '10px',
                            display: 'inline-block',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #ddd',
                            color: '#333'
                        }}
                        onClick={onRetry}
                    >
                        点击重试
                    </View>
                </View>
            ) : null}

            {/* 列表 */}
            {visibleItems.map(item => (
                <View
                    key={item.id}
                    style={{
                        background: '#fff',
                        borderRadius: '12px',
                        padding: '10px',
                        marginBottom: '12px'
                    }}
                    onClick={() => onClickHotel(item.id)}
                >
                    <View style={{ position: 'relative' }}>
                        {item.imageUrl ? (
                            <Image
                                src={item.imageUrl}
                                mode='aspectFill'
                                style={{ width: '100%', height: '160px', borderRadius: '10px', background: '#f2f2f2' }}
                            />
                        ) : (
                            <View style={{ height: '160px', borderRadius: '10px', background: '#f2f2f2' }} />
                        )}

                        {item.featured ? (
                            <View
                                style={{
                                    position: 'absolute',
                                    left: '8px',
                                    top: '8px',
                                    background: 'rgba(250,140,22,.9)',
                                    color: '#fff',
                                    borderRadius: '999px',
                                    fontSize: '12px',
                                    padding: '2px 8px'
                                }}
                            >
                                精选推荐
                            </View>
                        ) : null}
                    </View>

                    <View style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontWeight: 600, maxWidth: '75%' }}>{item.name}</Text>
                        <Text style={{ color: '#1677ff', fontSize: '14px' }}>{item.starRating}星</Text>
                    </View>

                    <View style={{ marginTop: '6px', color: '#666', fontSize: '14px' }}>
                        {item.address}
                    </View>

                    <View style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap' }}>
                        {(item.tags || []).slice(0, 4).map(tag => (
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

                    <View style={{ marginTop: '10px', textAlign: 'right' }}>
                        <Text style={{ color: '#ff4d4f', fontWeight: 600 }}>¥{item.minPrice}</Text>
                        <Text style={{ color: '#999', fontSize: '12px' }}> 起/晚</Text>
                    </View>
                </View>
            ))}

            {/* 底部状态 */}
            {items.length > 0 ? (
                <View style={{ textAlign: 'center', color: '#999', padding: '6px 0 20px', fontSize: '13px' }}>
                    {refreshing
                        ? '刷新中...'
                        : loadingMore
                            ? '加载更多中...'
                            : hasMore
                                ? '上拉/触底加载更多'
                                : '没有更多了'}
                    {appliedFilter.priceRange !== 'all' ? '（价格档位为前端本地过滤）' : ''}
                </View>
            ) : null}

            {/* 详细筛选抽屉（前端版） */}
            {showFilter ? (
                <View
                    style={{
                        position: 'fixed',
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        zIndex: 1000
                    }}
                >
                    {/* 遮罩 */}
                    <View
                        onClick={closeFilterDrawer}
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,.35)'
                        }}
                    />

                    {/* 面板 */}
                    <View
                        style={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: '#fff',
                            borderTopLeftRadius: '16px',
                            borderTopRightRadius: '16px',
                            padding: '14px',
                            maxHeight: '75vh',
                            overflow: 'scroll'
                        }}
                    >
                        <View style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontWeight: 700 }}>详细筛选</Text>
                            <Text onClick={closeFilterDrawer} style={{ color: '#999' }}>关闭</Text>
                        </View>

                        {/* 城市 */}
                        <Text style={{ marginTop: '14px', display: 'block', fontWeight: 600 }}>城市</Text>
                        {metaCities.length ? (
                            <Picker
                                mode='selector'
                                range={['不限', ...metaCities]}
                                onChange={(e) => {
                                    const idx = Number(e.detail.value)
                                    if (idx === 0) {
                                        setDraftFilter(prev => ({ ...prev, city: '' }))
                                    } else {
                                        setDraftFilter(prev => ({ ...prev, city: metaCities[idx - 1] }))
                                    }
                                }}
                            >
                                <View
                                    style={{
                                        marginTop: '8px',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        padding: '10px'
                                    }}
                                >
                                    {draftFilter.city || '不限'}
                                </View>
                            </Picker>
                        ) : (
                            <View
                                style={{
                                    marginTop: '8px',
                                    border: '1px solid #ddd',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    color: '#999'
                                }}
                            >
                                暂无城市选项（可直接用首页选择）
                            </View>
                        )}

                        {/* 关键词 */}
                        <Text style={{ marginTop: '14px', display: 'block', fontWeight: 600 }}>关键词</Text>
                        <Input
                            value={draftFilter.keyword}
                            onInput={(e) => setDraftFilter(prev => ({ ...prev, keyword: e.detail.value }))}
                            placeholder='酒店名/商圈/地标'
                            style={{
                                marginTop: '8px',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                padding: '10px'
                            }}
                        />

                        {/* 星级 */}
                        <Text style={{ marginTop: '14px', display: 'block', fontWeight: 600 }}>星级</Text>
                        <View style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap' }}>
                            {[
                                { label: '不限', value: null },
                                { label: '3星', value: 3 },
                                { label: '4星', value: 4 },
                                { label: '5星', value: 5 }
                            ].map(opt => {
                                const active = draftFilter.star === opt.value
                                return (
                                    <View
                                        key={String(opt.value)}
                                        onClick={() => setDraftFilter(prev => ({ ...prev, star: opt.value }))}
                                        style={{
                                            marginRight: '8px',
                                            marginBottom: '8px',
                                            padding: '6px 10px',
                                            borderRadius: '999px',
                                            border: active ? '1px solid #1677ff' : '1px solid #ddd',
                                            color: active ? '#1677ff' : '#333',
                                            background: active ? '#f0f7ff' : '#fff'
                                        }}
                                    >
                                        {opt.label}
                                    </View>
                                )
                            })}
                        </View>

                        {/* 标签 */}
                        <Text style={{ marginTop: '14px', display: 'block', fontWeight: 600 }}>标签</Text>
                        <View style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap' }}>
                            {(metaTags.length ? metaTags : []).map(tag => {
                                const active = draftFilter.tags.includes(tag)
                                return (
                                    <View
                                        key={tag}
                                        onClick={() => toggleDraftTag(tag)}
                                        style={{
                                            marginRight: '8px',
                                            marginBottom: '8px',
                                            padding: '6px 10px',
                                            borderRadius: '999px',
                                            border: active ? '1px solid #1677ff' : '1px solid #ddd',
                                            color: active ? '#1677ff' : '#333',
                                            background: active ? '#f0f7ff' : '#fff'
                                        }}
                                    >
                                        {tag}
                                    </View>
                                )
                            })}
                            {!metaTags.length ? (
                                <Text style={{ color: '#999', fontSize: '12px' }}>暂无标签选项</Text>
                            ) : null}
                        </View>

                        {/* 价格档位（前端本地过滤） */}
                        <Text style={{ marginTop: '14px', display: 'block', fontWeight: 600 }}>
                            价格档位（当前页已加载数据）
                        </Text>
                        <View style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap' }}>
                            {priceOptions.map(opt => {
                                const active = draftFilter.priceRange === opt.value
                                return (
                                    <View
                                        key={opt.value}
                                        onClick={() => setDraftFilter(prev => ({ ...prev, priceRange: opt.value }))}
                                        style={{
                                            marginRight: '8px',
                                            marginBottom: '8px',
                                            padding: '6px 10px',
                                            borderRadius: '999px',
                                            border: active ? '1px solid #1677ff' : '1px solid #ddd',
                                            color: active ? '#1677ff' : '#333',
                                            background: active ? '#f0f7ff' : '#fff'
                                        }}
                                    >
                                        {opt.label}
                                    </View>
                                )
                            })}
                        </View>

                        {/* 底部按钮 */}
                        <View style={{ marginTop: '16px', display: 'flex' }}>
                            <View
                                onClick={resetDraftFilter}
                                style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    border: '1px solid #ddd',
                                    borderRadius: '10px',
                                    padding: '10px 0',
                                    marginRight: '10px'
                                }}
                            >
                                重置
                            </View>

                            <View
                                onClick={applyFilterAndSearch}
                                style={{
                                    flex: 1,
                                    textAlign: 'center',
                                    background: '#1677ff',
                                    color: '#fff',
                                    borderRadius: '10px',
                                    padding: '10px 0'
                                }}
                            >
                                应用筛选
                            </View>
                        </View>
                    </View>
                </View>
            ) : null}
        </View>
    )
}