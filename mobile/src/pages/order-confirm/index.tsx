import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, Input, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { publicOrdersAPI } from '../../api'

type BookingDraft = {
    hotelId: string
    hotelName: string
    roomTypeId: string
    roomTypeName: string
    price: number
    nights: number
    checkIn: string
    checkOut: string
    totalPrice: number
    cancelPolicy?: string
    breakfastIncluded?: boolean
    maxGuests?: number
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

function validatePhone(phone: string) {
    // 放宽一点，兼容中国手机号/国际号/演示环境
    return /^[0-9+\-\s]{6,20}$/.test(phone)
}

export default function OrderConfirmPage() {
    const [draft, setDraft] = useState<BookingDraft | null>(null)
    const [guestName, setGuestName] = useState('')
    const [phone, setPhone] = useState('')
    const [remarks, setRemarks] = useState('')
    const [roomCount, setRoomCount] = useState(1)
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        Taro.setNavigationBarTitle({ title: '确认订单' })

        const raw = Taro.getStorageSync('triptrip_booking_draft')
        if (!raw || typeof raw !== 'object') {
            setDraft(null)
            return
        }

        const normalized: BookingDraft = {
            hotelId: String(raw.hotelId || ''),
            hotelName: String(raw.hotelName || ''),
            roomTypeId: String(raw.roomTypeId || ''),
            roomTypeName: String(raw.roomTypeName || ''),
            price: toNum(raw.price, 0),
            nights: Math.max(1, toNum(raw.nights, 1)),
            checkIn: String(raw.checkIn || ''),
            checkOut: String(raw.checkOut || ''),
            totalPrice: toNum(raw.totalPrice, 0),
            cancelPolicy: raw.cancelPolicy || 'free_cancellation',
            breakfastIncluded: !!raw.breakfastIncluded,
            maxGuests: Math.max(1, toNum(raw.maxGuests, 2))
        }

        if (!normalized.hotelId || !normalized.roomTypeId) {
            setDraft(null)
            return
        }

        setDraft(normalized)

        // 记住最近填写信息（可选）
        const savedProfile = Taro.getStorageSync('triptrip_order_profile')
        if (savedProfile && typeof savedProfile === 'object') {
            if (savedProfile.guestName) setGuestName(String(savedProfile.guestName))
            if (savedProfile.phone) setPhone(String(savedProfile.phone))
        }
    }, [])

    const totalPrice = useMemo(() => {
        if (!draft) return 0
        return toNum(draft.price, 0) * Math.max(1, draft.nights) * Math.max(1, roomCount)
    }, [draft, roomCount])

    const canSubmit = useMemo(() => {
        return !!draft && !!guestName.trim() && !!phone.trim() && !submitting
    }, [draft, guestName, phone, submitting])

    const handleSubmit = async () => {
        if (!draft) {
            Taro.showToast({ title: '预订信息不存在，请重新选择房型', icon: 'none' })
            return
        }

        const guestNameTrim = guestName.trim()
        const phoneTrim = phone.trim()

        if (!guestNameTrim) {
            Taro.showToast({ title: '请输入入住人姓名', icon: 'none' })
            return
        }

        if (!phoneTrim) {
            Taro.showToast({ title: '请输入手机号', icon: 'none' })
            return
        }

        if (!validatePhone(phoneTrim)) {
            Taro.showToast({ title: '手机号格式不正确', icon: 'none' })
            return
        }

        setSubmitting(true)
        try {
            const payload = {
                hotelId: draft.hotelId,
                roomTypeId: draft.roomTypeId,
                checkInDate: draft.checkIn,
                checkOutDate: draft.checkOut,
                roomCount: Math.max(1, roomCount),
                guestName: guestNameTrim,
                phone: phoneTrim,
                remarks: remarks.trim()
            }

            const res = await publicOrdersAPI.create(payload)

            // 保存最近填写信息
            Taro.setStorageSync('triptrip_order_profile', {
                guestName: guestNameTrim,
                phone: phoneTrim
            })

            // 清理草稿，避免重复下单误触
            Taro.removeStorageSync('triptrip_booking_draft')

            // 保存最近订单（方便你后面做“我的订单”页面）
            Taro.setStorageSync('triptrip_latest_order', res)

            const orderNo = res?.orderNo || res?.order?.orderNo || ''
            const finalTotal = res?.totalPrice ?? res?.order?.totalPrice ?? totalPrice

            Taro.showModal({
                title: '下单成功',
                content: `订单号：${orderNo || '已生成'}\n合计金额：¥${finalTotal}\n\n（演示版：未接入真实支付）`,
                confirmText: '返回列表',
                cancelText: '继续浏览',
                success: (r) => {
                    if (r.confirm) {
                        // 你也可以改成跳我的订单页（后续做）
                        Taro.navigateBack({ delta: 2 })
                    }
                }
            })
        } catch (e: any) {
            console.error('create order error', e)
            Taro.showToast({ title: e?.message || '下单失败', icon: 'none' })
        } finally {
            setSubmitting(false)
        }
    }

    if (!draft) {
        return (
            <View style={{ minHeight: '100vh', background: '#f5f7fb', padding: '24rpx' }}>
                <View
                    style={{
                        background: '#fff',
                        borderRadius: '20rpx',
                        padding: '40rpx 24rpx',
                        textAlign: 'center'
                    }}
                >
                    <Text style={{ display: 'block', fontSize: '30rpx', color: '#333', fontWeight: 600 }}>
                        暂无预订信息
                    </Text>
                    <Text style={{ display: 'block', marginTop: '12rpx', color: '#999', fontSize: '24rpx' }}>
                        请先在酒店详情页选择房型后再下单
                    </Text>
                    <View
                        onClick={() => Taro.navigateBack()}
                        style={{
                            margin: '24rpx auto 0',
                            width: '240rpx',
                            height: '72rpx',
                            borderRadius: '16rpx',
                            background: '#1677ff',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '26rpx'
                        }}
                    >
                        返回上一页
                    </View>
                </View>
            </View>
        )
    }

    return (
        <View style={{ minHeight: '100vh', background: '#f5f7fb', paddingBottom: '120rpx' }}>
            {/* 订单信息卡片 */}
            <View
                style={{
                    margin: '20rpx',
                    background: '#fff',
                    borderRadius: '20rpx',
                    padding: '24rpx'
                }}
            >
                <Text style={{ fontSize: '30rpx', fontWeight: 700, color: '#222' }}>订单信息</Text>

                <View style={{ marginTop: '16rpx' }}>
                    <Text style={{ display: 'block', fontSize: '28rpx', color: '#222', fontWeight: 600 }}>
                        {draft.hotelName || '未命名酒店'}
                    </Text>
                    <Text style={{ display: 'block', marginTop: '8rpx', fontSize: '24rpx', color: '#666' }}>
                        房型：{draft.roomTypeName || '未命名房型'}
                    </Text>
                </View>

                <View style={{ marginTop: '14rpx', display: 'flex', flexWrap: 'wrap', gap: '10rpx' }}>
                    <Text
                        style={{
                            fontSize: '22rpx',
                            color: '#555',
                            background: '#f4f6f8',
                            padding: '6rpx 12rpx',
                            borderRadius: '10rpx'
                        }}
                    >
                        {draft.breakfastIncluded ? '含早餐' : '无早餐'}
                    </Text>
                    <Text
                        style={{
                            fontSize: '22rpx',
                            color: getCancelPolicyText(draft.cancelPolicy) === '免费取消' ? '#0a7f42' : '#a15a00',
                            background: getCancelPolicyText(draft.cancelPolicy) === '免费取消' ? '#ecfff4' : '#fff7e8',
                            padding: '6rpx 12rpx',
                            borderRadius: '10rpx'
                        }}
                    >
                        {getCancelPolicyText(draft.cancelPolicy)}
                    </Text>
                    <Text
                        style={{
                            fontSize: '22rpx',
                            color: '#555',
                            background: '#f4f6f8',
                            padding: '6rpx 12rpx',
                            borderRadius: '10rpx'
                        }}
                    >
                        可住 {draft.maxGuests || 2} 人
                    </Text>
                </View>

                <View style={{ marginTop: '16rpx', borderTop: '1px solid #f0f0f0', paddingTop: '14rpx' }}>
                    <Text style={{ display: 'block', fontSize: '24rpx', color: '#666' }}>
                        入住：{draft.checkIn}
                    </Text>
                    <Text style={{ display: 'block', marginTop: '6rpx', fontSize: '24rpx', color: '#666' }}>
                        离店：{draft.checkOut}
                    </Text>
                    <Text style={{ display: 'block', marginTop: '6rpx', fontSize: '24rpx', color: '#666' }}>
                        共 {draft.nights} 晚
                    </Text>
                </View>
            </View>

            {/* 入住人信息 */}
            <View
                style={{
                    margin: '0 20rpx 20rpx',
                    background: '#fff',
                    borderRadius: '20rpx',
                    padding: '24rpx'
                }}
            >
                <Text style={{ fontSize: '30rpx', fontWeight: 700, color: '#222' }}>入住人信息</Text>

                <View style={{ marginTop: '16rpx' }}>
                    <Text style={{ display: 'block', fontSize: '24rpx', color: '#666', marginBottom: '8rpx' }}>
                        入住人姓名
                    </Text>
                    <Input
                        value={guestName}
                        placeholder='请输入入住人姓名'
                        onInput={(e) => setGuestName(e.detail.value)}
                        style={{
                            background: '#f6f8fb',
                            borderRadius: '14rpx',
                            height: '76rpx',
                            padding: '0 16rpx',
                            boxSizing: 'border-box',
                            fontSize: '26rpx'
                        }}
                    />
                </View>

                <View style={{ marginTop: '16rpx' }}>
                    <Text style={{ display: 'block', fontSize: '24rpx', color: '#666', marginBottom: '8rpx' }}>
                        手机号
                    </Text>
                    <Input
                        value={phone}
                        type='number'
                        placeholder='请输入手机号'
                        onInput={(e) => setPhone(e.detail.value)}
                        style={{
                            background: '#f6f8fb',
                            borderRadius: '14rpx',
                            height: '76rpx',
                            padding: '0 16rpx',
                            boxSizing: 'border-box',
                            fontSize: '26rpx'
                        }}
                    />
                </View>

                <View style={{ marginTop: '16rpx' }}>
                    <Text style={{ display: 'block', fontSize: '24rpx', color: '#666', marginBottom: '8rpx' }}>
                        房间数量
                    </Text>

                    <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx' }}>
                        <View
                            onClick={() => setRoomCount((v) => Math.max(1, v - 1))}
                            style={{
                                width: '72rpx',
                                height: '72rpx',
                                borderRadius: '14rpx',
                                background: '#f6f8fb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '34rpx',
                                color: '#333'
                            }}
                        >
                            -
                        </View>
                        <View
                            style={{
                                minWidth: '120rpx',
                                height: '72rpx',
                                borderRadius: '14rpx',
                                background: '#f6f8fb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '28rpx',
                                color: '#222',
                                fontWeight: 600
                            }}
                        >
                            {roomCount}
                        </View>
                        <View
                            onClick={() => setRoomCount((v) => Math.min(5, v + 1))}
                            style={{
                                width: '72rpx',
                                height: '72rpx',
                                borderRadius: '14rpx',
                                background: '#f6f8fb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '34rpx',
                                color: '#333'
                            }}
                        >
                            +
                        </View>
                        <Text style={{ fontSize: '22rpx', color: '#999' }}>（演示版最多 5 间）</Text>
                    </View>
                </View>

                <View style={{ marginTop: '16rpx' }}>
                    <Text style={{ display: 'block', fontSize: '24rpx', color: '#666', marginBottom: '8rpx' }}>
                        备注（可选）
                    </Text>
                    <Textarea
                        value={remarks}
                        maxlength={200}
                        placeholder='如：预计晚到、需要安静房间等'
                        onInput={(e) => setRemarks(e.detail.value)}
                        style={{
                            width: '100%',
                            minHeight: '140rpx',
                            background: '#f6f8fb',
                            borderRadius: '14rpx',
                            padding: '14rpx 16rpx',
                            boxSizing: 'border-box',
                            fontSize: '24rpx'
                        }}
                    />
                </View>
            </View>

            {/* 价格明细 */}
            <View
                style={{
                    margin: '0 20rpx',
                    background: '#fff',
                    borderRadius: '20rpx',
                    padding: '24rpx'
                }}
            >
                <Text style={{ fontSize: '30rpx', fontWeight: 700, color: '#222' }}>价格明细</Text>

                <View style={{ marginTop: '16rpx' }}>
                    <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10rpx' }}>
                        <Text style={{ fontSize: '24rpx', color: '#666' }}>房费单价</Text>
                        <Text style={{ fontSize: '24rpx', color: '#222' }}>¥{toNum(draft.price, 0)}/晚</Text>
                    </View>
                    <View style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10rpx' }}>
                        <Text style={{ fontSize: '24rpx', color: '#666' }}>间夜</Text>
                        <Text style={{ fontSize: '24rpx', color: '#222' }}>{draft.nights} 晚 × {roomCount} 间</Text>
                    </View>
                    <View style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12rpx', display: 'flex', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: '26rpx', color: '#222', fontWeight: 600 }}>订单总额</Text>
                        <Text style={{ fontSize: '30rpx', color: '#ff4d4f', fontWeight: 700 }}>¥{totalPrice}</Text>
                    </View>
                </View>
            </View>

            {/* 底部提交栏 */}
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
                    boxSizing: 'border-box'
                }}
            >
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: '22rpx', color: '#999' }}>合计</Text>
                    <View style={{ display: 'flex', alignItems: 'baseline', gap: '6rpx' }}>
                        <Text style={{ fontSize: '22rpx', color: '#ff4d4f' }}>¥</Text>
                        <Text style={{ fontSize: '40rpx', lineHeight: 1, fontWeight: 700, color: '#ff4d4f' }}>
                            {totalPrice}
                        </Text>
                    </View>
                </View>

                <View
                    onClick={() => {
                        if (!canSubmit) return
                        handleSubmit()
                    }}
                    style={{
                        width: '260rpx',
                        height: '80rpx',
                        borderRadius: '16rpx',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: canSubmit ? '#1677ff' : '#d9d9d9',
                        color: '#fff',
                        fontSize: '28rpx',
                        fontWeight: 700
                    }}
                >
                    {submitting ? '提交中...' : '提交订单'}
                </View>
            </View>
        </View>
    )
}