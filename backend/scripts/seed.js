// backend/scripts/seed.js

const mongoose = require('mongoose')
const User = require('../models/User')
const Hotel = require('../models/Hotel')

async function main() {
    const uri = process.env.MONGODB_URI
    if (!uri) throw new Error('MONGODB_URI is required')

    await mongoose.connect(uri)
    console.log('Connected')

    // 清空（谨慎：仅开发环境使用）
    await Promise.all([User.deleteMany({}), Hotel.deleteMany({})])

    const admin = await User.create({ username: 'admin', password: '123456', role: 'admin' })
    const merchant = await User.create({ username: 'merchant1', password: '123456', role: 'merchant' })

    await Hotel.create([
        {
            nameCn: '易宿大酒店',
            nameEn: 'Yi-Su Grand Hotel',
            city: '上海',
            address: '上海市浦东新区世纪大道 100 号',
            starRating: 5,
            openingDate: new Date('2024-01-01'),
            status: 'approved',
            reason: '',
            createdBy: merchant._id,
            roomTypes: [
                { type: '标准间', price: 399 },
                { type: '豪华间', price: 699 }
            ],
            featured: true,
            bannerImage: 'https://example.com/banner1.jpg',
            images: ['https://example.com/cover1.jpg'],
            tags: ['豪华', '亲子', '免费停车'],
            amenities: ['免费WiFi', '健身房', '早餐']
        },
        {
            nameCn: '易宿商务酒店',
            nameEn: 'Yi-Su Business Hotel',
            city: '上海',
            address: '上海市徐汇区漕溪北路 200 号',
            starRating: 4,
            openingDate: new Date('2020-06-01'),
            status: 'approved',
            createdBy: merchant._id,
            roomTypes: [{ type: '大床房', price: 299 }],
            featured: false,
            tags: ['商务', '近地铁']
        }
    ])

    console.log('Seed done')
    await mongoose.disconnect()
}

main().catch(e => {
    console.error(e)
    process.exit(1)
})
