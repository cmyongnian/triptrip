import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  InputNumber,
  Space,
  Card,
  Typography,
  message,
  Divider,
  Row,
  Col,
  Switch
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  ShopOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const CANCEL_POLICY_OPTIONS = [
  { label: '免费取消', value: 'free_cancellation' },
  { label: '不可取消', value: 'non_refundable' }
];

const BED_TYPE_OPTIONS = [
  { label: '大床', value: '大床' },
  { label: '双床', value: '双床' },
  { label: '单人床', value: '单人床' },
  { label: '多床', value: '多床' }
];

const normalizeCancelPolicyForForm = (v) => {
  if (!v) return 'free_cancellation';
  if (v === '免费取消') return 'free_cancellation';
  if (v === '不可取消') return 'non_refundable';
  return ['free_cancellation', 'non_refundable'].includes(v)
    ? v
    : 'free_cancellation';
};

const HotelEntry = ({
  onSave,
  onCancel,
  initialValues = null,
  lang = 'zh',
  submitText,
  embedded = false
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const isEdit = !!initialValues?._id;

  const t = useMemo(
    () => ({
      title: isEdit ? '编辑酒店信息' : '录入酒店信息',
      sub: isEdit ? '修改后保存（商户修改后可再次进入审核）' : '录入酒店信息并提交审核',
      submit: submitText || (isEdit ? '保存修改' : '提交审核')
    }),
    [isEdit, submitText]
  );

  useEffect(() => {
    if (!initialValues) {
      form.resetFields();
      form.setFieldsValue({
        starRating: 4,
        featured: false,
        roomTypes: [
          {
            type: '',
            bedType: '大床',
            breakfastIncluded: false,
            cancelPolicy: 'free_cancellation',
            maxGuests: 2,
            inventory: 10,
            price: 0
          }
        ],
        images: [{ url: '' }],
        tags: [],
        amenities: []
      });
      return;
    }

    const coords = Array.isArray(initialValues?.geo?.coordinates)
      ? initialValues.geo.coordinates
      : [];

    form.setFieldsValue({
      ...initialValues,
      openingDate: initialValues.openingDate ? dayjs(initialValues.openingDate) : null,
      roomTypes:
        Array.isArray(initialValues.roomTypes) && initialValues.roomTypes.length
          ? initialValues.roomTypes.map(rt => ({
            _id: rt._id,
            type: rt.type || '',
            bedType: rt.bedType || '大床',
            breakfastIncluded: !!rt.breakfastIncluded,
            cancelPolicy: normalizeCancelPolicyForForm(rt.cancelPolicy),
            maxGuests: Number(rt.maxGuests || 2),
            inventory: Number(rt.inventory ?? 10),
            price: Number(rt.price || 0)
          }))
          : [
            {
              type: '',
              bedType: '大床',
              breakfastIncluded: false,
              cancelPolicy: 'free_cancellation',
              maxGuests: 2,
              inventory: 10,
              price: 0
            }
          ],
      images:
        Array.isArray(initialValues.images) && initialValues.images.length
          ? initialValues.images.map(url => ({ url }))
          : [{ url: '' }],
      tags: Array.isArray(initialValues.tags) ? initialValues.tags : [],
      amenities: Array.isArray(initialValues.amenities) ? initialValues.amenities : [],
      featured: !!initialValues.featured,
      geoLng: coords.length === 2 ? Number(coords[0]) : undefined,
      geoLat: coords.length === 2 ? Number(coords[1]) : undefined
    });
  }, [initialValues, form]);

  const normalizePayload = (values) => {
    const roomTypes = (values.roomTypes || [])
      .map(rt => ({
        ...(rt?._id ? { _id: rt._id } : {}),
        type: String(rt?.type || '').trim(),
        bedType: String(rt?.bedType || '').trim(),
        breakfastIncluded: !!rt?.breakfastIncluded,
        cancelPolicy: ['free_cancellation', 'non_refundable'].includes(rt?.cancelPolicy)
          ? rt.cancelPolicy
          : 'free_cancellation',
        maxGuests: Number(rt?.maxGuests || 2),
        inventory: Number(rt?.inventory ?? 10),
        price: Number(rt?.price || 0)
      }))
      .filter(rt => rt.type);

    const images = (values.images || [])
      .map(item => String(item?.url || '').trim())
      .filter(Boolean);

    const tags = Array.from(
      new Set((values.tags || []).map(v => String(v || '').trim()).filter(Boolean))
    );

    const amenities = Array.from(
      new Set((values.amenities || []).map(v => String(v || '').trim()).filter(Boolean))
    );

    const payload = {
      nameCn: String(values.nameCn || '').trim(),
      nameEn: String(values.nameEn || '').trim(),
      address: String(values.address || '').trim(),
      city: String(values.city || '').trim(),
      starRating: Number(values.starRating),
      openingDate: values.openingDate ? values.openingDate.format('YYYY-MM-DD') : '',
      roomTypes,

      bannerImage: String(values.bannerImage || '').trim(),
      images,
      tags,
      amenities,
      featured: !!values.featured
    };

    const lng = Number(values.geoLng);
    const lat = Number(values.geoLat);
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      payload.geo = {
        type: 'Point',
        coordinates: [lng, lat]
      };
    }

    return payload;
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const payload = normalizePayload(values);
      await onSave(payload);

      if (!isEdit) {
        message.success('酒店信息提交成功');
        form.resetFields();
        form.setFieldsValue({
          starRating: 4,
          featured: false,
          roomTypes: [
            {
              type: '',
              bedType: '大床',
              breakfastIncluded: false,
              cancelPolicy: 'free_cancellation',
              maxGuests: 2,
              inventory: 10,
              price: 0
            }
          ],
          images: [{ url: '' }],
          tags: [],
          amenities: []
        });
      }
    } catch (error) {
      message.error(error?.message || '保存失败，请重试');
      console.error('Hotel form submit error:', error);
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{
        starRating: 4,
        featured: false,
        roomTypes: [
          {
            type: '',
            bedType: '大床',
            breakfastIncluded: false,
            cancelPolicy: 'free_cancellation',
            maxGuests: 2,
            inventory: 10,
            price: 0
          }
        ],
        images: [{ url: '' }],
        tags: [],
        amenities: []
      }}
    >
      <Divider orientation="left">基础信息</Divider>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            label="酒店中文名"
            name="nameCn"
            rules={[{ required: true, message: '请输入酒店中文名' }]}
          >
            <Input placeholder="例如：易宿大酒店" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label="酒店英文名"
            name="nameEn"
            rules={[{ required: true, message: '请输入酒店英文名' }]}
          >
            <Input placeholder="e.g. Yi-Su Grand Hotel" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item
            label="城市"
            name="city"
            rules={[{ required: true, message: '请输入城市' }]}
          >
            <Input placeholder="例如：上海" />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="酒店星级"
            name="starRating"
            rules={[{ required: true, message: '请选择星级' }]}
          >
            <Select
              options={[
                { label: '3 星', value: 3 },
                { label: '4 星', value: 4 },
                { label: '5 星', value: 5 }
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label="开业日期"
            name="openingDate"
            rules={[{ required: true, message: '请选择开业日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label="详细地址"
        name="address"
        rules={[{ required: true, message: '请输入详细地址' }]}
      >
        <Input.TextArea rows={2} placeholder="用于移动端详情页展示" />
      </Form.Item>

      <Divider orientation="left">移动端展示增强字段</Divider>

      <Row gutter={16}>
        <Col xs={24} md={16}>
          <Form.Item label="Banner 图 URL" name="bannerImage">
            <Input placeholder="https://..." />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label="首页精选（Banner候选）" name="featured" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="酒店标签（移动端快捷筛选）" name="tags">
        <Select
          mode="tags"
          placeholder="例如：亲子、豪华、免费停车"
          tokenSeparators={[',', '，']}
          open={false}
        />
      </Form.Item>

      <Form.Item label="酒店设施（移动端详情展示）" name="amenities">
        <Select
          mode="tags"
          placeholder="例如：健身房、泳池、早餐、Wi-Fi"
          tokenSeparators={[',', '，']}
          open={false}
        />
      </Form.Item>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label="经度（可选）" name="geoLng">
            <InputNumber style={{ width: '100%' }} placeholder="121.4737" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label="纬度（可选）" name="geoLat">
            <InputNumber style={{ width: '100%' }} placeholder="31.2304" />
          </Form.Item>
        </Col>
      </Row>

      <Form.List name="images">
        {(fields, { add, remove }) => (
          <>
            <Divider orientation="left">酒店图片列表（详情页图集）</Divider>
            {fields.map((field, index) => (
              <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                <Form.Item
                  {...field}
                  name={[field.name, 'url']}
                  rules={[{ required: true, message: '请输入图片 URL' }]}
                  style={{ width: 520, marginBottom: 0 }}
                >
                  <Input placeholder={`图片 ${index + 1} URL`} />
                </Form.Item>
                {fields.length > 1 && (
                  <Button
                    icon={<DeleteOutlined />}
                    danger
                    onClick={() => remove(field.name)}
                  />
                )}
              </Space>
            ))}
            <Button type="dashed" onClick={() => add({ url: '' })} icon={<PlusOutlined />}>
              添加图片
            </Button>
          </>
        )}
      </Form.List>

      <Form.List name="roomTypes">
        {(fields, { add, remove }) => (
          <>
            <Divider orientation="left">房型与价格（增强版）</Divider>

            {fields.map((field, index) => (
              <Card
                key={field.key}
                size="small"
                style={{ marginBottom: 12 }}
                title={`房型 ${index + 1}`}
                extra={
                  fields.length > 1 ? (
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(field.name)}
                    >
                      删除房型
                    </Button>
                  ) : null
                }
              >
                {/* 保留子文档 _id（编辑时） */}
                <Form.Item {...field} name={[field.name, '_id']} hidden>
                  <Input />
                </Form.Item>

                <Row gutter={12}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      {...field}
                      label="房型名称"
                      name={[field.name, 'type']}
                      rules={[{ required: true, message: '请输入房型名称' }]}
                    >
                      <Input placeholder="如：豪华大床房" />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      {...field}
                      label="床型"
                      name={[field.name, 'bedType']}
                      rules={[{ required: true, message: '请选择床型' }]}
                    >
                      <Select
                        options={BED_TYPE_OPTIONS}
                        placeholder="请选择床型"
                        showSearch
                        allowClear
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      {...field}
                      label="价格（¥/晚）"
                      name={[field.name, 'price']}
                      rules={[{ required: true, message: '请输入价格' }]}
                    >
                      <InputNumber
                        min={0}
                        style={{ width: '100%' }}
                        placeholder="例如 399"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      {...field}
                      label="取消政策"
                      name={[field.name, 'cancelPolicy']}
                      rules={[{ required: true, message: '请选择取消政策' }]}
                    >
                      <Select
                        options={CANCEL_POLICY_OPTIONS}
                        placeholder="请选择取消政策"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      {...field}
                      label="可住人数"
                      name={[field.name, 'maxGuests']}
                      rules={[{ required: true, message: '请输入可住人数' }]}
                    >
                      <InputNumber
                        min={1}
                        max={10}
                        style={{ width: '100%' }}
                        placeholder="2"
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={8}>
                    <Form.Item
                      {...field}
                      label="库存（总量）"
                      name={[field.name, 'inventory']}
                      rules={[{ required: true, message: '请输入库存' }]}
                    >
                      <InputNumber
                        min={0}
                        style={{ width: '100%' }}
                        placeholder="10"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      {...field}
                      label="早餐"
                      name={[field.name, 'breakfastIncluded']}
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="含早" unCheckedChildren="无早" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            ))}

            <Button
              type="dashed"
              onClick={() =>
                add({
                  type: '',
                  bedType: '大床',
                  breakfastIncluded: false,
                  cancelPolicy: 'free_cancellation',
                  maxGuests: 2,
                  inventory: 10,
                  price: 0
                })
              }
              block
              icon={<PlusOutlined />}
            >
              添加房型
            </Button>
          </>
        )}
      </Form.List>

      <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
        <Button
          type="primary"
          htmlType="submit"
          icon={<SaveOutlined />}
          loading={loading}
        >
          {t.submit}
        </Button>
        {onCancel && <Button onClick={onCancel}>取消</Button>}
      </div>
    </Form>
  );

  if (embedded) return content;

  return (
    <Card>
      <Space direction="vertical" size={4} style={{ marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>
          <ShopOutlined /> {t.title}
        </Title>
        <Text type="secondary">{t.sub}</Text>
      </Space>
      {content}
    </Card>
  );
};

export default HotelEntry;