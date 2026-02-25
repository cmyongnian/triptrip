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
        roomTypes: [{ type: '', price: 0 }],
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
            type: rt.type,
            price: Number(rt.price || 0)
          }))
          : [{ type: '', price: 0 }],
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

      // 仅新增成功时清空；编辑一般由上层关闭弹窗
      if (!isEdit) {
        message.success('酒店信息提交成功');
        form.resetFields();
        form.setFieldsValue({
          starRating: 4,
          featured: false,
          roomTypes: [{ type: '', price: 0 }],
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
        roomTypes: [{ type: '', price: 0 }],
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
            rules={[{ required: true, message: '请输入城市（移动端筛选会用到）' }]}
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
            <Divider orientation="left">酒店图片列表（详情页 Banner 图集）</Divider>
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
            <Divider orientation="left">房型与价格（移动端详情页会展示，且按价格升序返回）</Divider>
            {fields.map((field) => (
              <Row gutter={12} key={field.key} align="middle">
                {/* 保留子文档 _id（编辑时） */}
                <Form.Item {...field} name={[field.name, '_id']} hidden>
                  <Input />
                </Form.Item>

                <Col xs={24} md={12}>
                  <Form.Item
                    {...field}
                    label="房型"
                    name={[field.name, 'type']}
                    rules={[{ required: true, message: '请输入房型名称' }]}
                  >
                    <Input placeholder="例如：标准间 / 大床房 / 豪华套房" />
                  </Form.Item>
                </Col>
                <Col xs={20} md={10}>
                  <Form.Item
                    {...field}
                    label="价格"
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
                <Col xs={4} md={2}>
                  {fields.length > 1 && (
                    <Button
                      style={{ marginTop: 29 }}
                      icon={<DeleteOutlined />}
                      danger
                      onClick={() => remove(field.name)}
                    />
                  )}
                </Col>
              </Row>
            ))}
            <Button
              type="dashed"
              onClick={() => add({ type: '', price: 0 })}
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
        {onCancel && (
          <Button onClick={onCancel}>
            取消
          </Button>
        )}
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