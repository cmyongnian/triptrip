import { View, Text, Input, Button, Picker, Swiper, SwiperItem } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import React, { useMemo, useState } from 'react'
import { publicHotelsAPI } from '../../api'

function formatDate(d: Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

export default function HomePage() {
    const today = useMemo(() => new Date(), [])
    const tomorrow = useMemo(() => new Date(Date.now() + 24 * 3600 * 1000), [])

    const [loading, setLoading] = useState(false)

    // Banner & 元数据
    const [banners, setBanners] = useState<any[]>([])
    const [cities, setCities] = useState<string[]>([])
    const [tags, setTags] = useState<string[]>([])

    // 搜索条件
    const [city, setCity] = useState('上海')
    const [keyword, setKeyword] = useState('')
    const [checkIn, setCheckIn] = useState(formatDate(today))
    const [checkOut, setCheckOut] = useState(formatDate(tomorrow))
    const [star, setStar] = useState<number | null>(null)
    const [selectedTags, setSelectedTags] = useState<string[]>([])

    useDidShow(async () => {
        setLoading(true)
        try {
            const [bannerRes, metaRes] = await Promise.all([
                publicHotelsAPI.getBanners(5),
                publicHotelsAPI.getMeta()
            ])
            setBanners(bannerRes.items || [])
            setCities(metaRes.cities || [])
            setTags(metaRes.tags || [])
            if (metaRes.cities?.length) setCity(metaRes.cities[0])
        } catch (e: any) {
            Taro.showToast({ title: e.message || '加载失败', icon: 'none' })
        } finally {
            setLoading(false)
        }
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

        const qs = new URLSearchParams({
            city,
            keyword,
            checkIn,
            checkOut,
            star: star ? String(star) : '',
            tags: selectedTags.join(',')
        }).toString()

        // 跳转列表页（非 tabBar 页面）
        Taro.navigateTo({ url: `/pages/hotel-list/index?${qs}` })
    }

    const onClickBanner = (hotelId: string) => {
        Taro.navigateTo({ url: `/pages/hotel-detail/index?id=${hotelId}` })
    }

    return (
        <View style={{ padding: '16px' }}>
            <View style={{ marginBottom: '12px' }}>
                <Text style={{ fontSize: '18px', fontWeight: 'bold' }}>酒店预订</Text>
                {loading ? <Text style={{ marginLeft: '8px' }}>加载中...</Text> : null}
            </View>

            {/* 顶部 Banner */}
            <Swiper autoplay circular style={{ height: '160px', borderRadius: '12px', overflow: 'hidden' }}>
                {banners.map(b => (
                    <SwiperItem key={b.hotelId}>
                        <View
                            onClick={() => onClickBanner(b.hotelId)}
                            style={{
                                height: '160px',
                                background: '#eee',
                                display: 'flex',
                                alignItems: 'flex-end',
                                padding: '12px'
                            }}
                        >
                            <Text style={{ background: 'rgba(0,0,0,.4)', color: '#fff', padding: '4px 8px', borderRadius: '6px' }}>
                                {b.title}
                            </Text>
                        </View>
                    </SwiperItem>
                ))}
            </Swiper>

            {/* 核心查询区 */}
            <View style={{ marginTop: '16px' }}>
                <Text>城市</Text>
                <Picker mode="selector" range={cities} onChange={e => setCity(cities[Number(e.detail.value)])}>
                    <View style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '6px' }}>
                        {city}
                    </View>
                </Picker>

                <Text style={{ marginTop: '12px', display: 'block' }}>关键词</Text>
                <Input
                    value={keyword}
                    onInput={e => setKeyword(e.detail.value)}
                    placeholder="酒店名/商圈/地标"
                    style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '8px', marginTop: '6px' }}
                />

                <Text style={{ marginTop: '12px', display: 'block' }}>入住 / 离店</Text>
                <View style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                    <Picker mode="date" value={checkIn} onChange={e => setCheckIn(e.detail.value)}>
                        <View style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
                            入住：{checkIn}
                        </View>
                    </Picker>
                    <Picker mode="date" value={checkOut} onChange={e => setCheckOut(e.detail.value)}>
                        <View style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
                            离店：{checkOut}
                        </View>
                    </Picker>
                </View>

                <Text style={{ marginTop: '12px', display: 'block' }}>星级（可选）</Text>
                <Picker
                    mode="selector"
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
                                    border: active ? '1px solid #1677ff' : '1px solid #ddd',
                                    color: active ? '#1677ff' : '#333'
                                }}
                            >
                                {t}
                            </View>
                        )
                    })}
                </View>

                <Button onClick={onSearch} style={{ marginTop: '16px' }} type="primary">
                    查询
                </Button>
            </View>
        </View>
    )
}
