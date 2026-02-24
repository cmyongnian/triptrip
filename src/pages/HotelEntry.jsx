import React, { useState } from 'react';
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
  Tooltip,
  Divider,
  Row, 
  Col, 
  Spin
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  SaveOutlined, 
  QuestionCircleOutlined,
  ShopOutlined,
  LoadingOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

// 1. Translation Dictionary mapping to your specific form fields
const entryT = {
  en: {
    regTitle: "Register New Hotel",
    regSub: "Enter property details for administrator review.",
    sectionBasic: "Basic Information",
    sectionRooms: "Room Types & Pricing",
    nameCn: "Hotel Name (Chinese)",
    nameEn: "Hotel Name (English)",
    address: "Detailed Address",
    starRating: "Star Rating",
    openingDate: "Opening Date",
    roomType: "Room Type",
    price: "Price",
    addRoom: "Add Room Type",
    submit: "Submit for Audit",
    placeholderCn: "e.g. 易宿大酒店",
    placeholderEn: "e.g. Yi-Su Grand Hotel",
    placeholderAddr: "Full street address",
    stars: "Stars",
    msgSuccess: "Hotel information submitted successfully!",
    errNameCn: "Please enter Chinese name",
    errNameEn: "Please enter English name",
    errAddr: "Address is required",
    errRoom: "Missing room type"
  },
  zh: {
    regTitle: "注册新酒店",
    regSub: "输入酒店详情以供管理员审核。",
    sectionBasic: "基本信息",
    sectionRooms: "房型与定价",
    nameCn: "酒店名称 (中文)",
    nameEn: "酒店名称 (英文)",
    address: "详细地址",
    starRating: "星级评分",
    openingDate: "开业日期",
    roomType: "房型",
    price: "价格",
    addRoom: "添加房型",
    submit: "提交审核",
    placeholderCn: "例如：易宿大酒店",
    placeholderEn: "例如：Yi-Su Grand Hotel",
    placeholderAddr: "完整的街道地址",
    stars: "星级",
    msgSuccess: "酒店信息提交成功！",
    errNameCn: "请输入中文名称",
    errNameEn: "请输入英文名称",
    errAddr: "地址为必填项",
    errRoom: "缺少房型名称"
  }
};

const HotelEntry = ({ onSave, lang = 'en' }) => {
  const t = entryT[lang] || entryT.en;
  
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const formattedValues = {
        ...values,
        openingDate: values.openingDate ? values.openingDate.format('YYYY-MM-DD') : '',
      };
      await onSave(formattedValues);
      message.success(t.msgSuccess);
      form.resetFields();
    } catch (error) {
      message.error('Failed to submit hotel information. Please try again.');
      console.error('Error submitting hotel:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <Card bordered={false} style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderRadius: '12px' }}>
        <div style={{ marginBottom: 30 }}>
          <Title level={2}><ShopOutlined /> {t.regTitle}</Title>
          <Text type="secondary">{t.regSub}</Text>
        </div>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ starRating: 5, roomTypes: [{ type: '', price: 100 }] }}
        >
          <Divider orientation="left">{t.sectionBasic}</Divider>
          
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item 
                label={t.nameCn} 
                name="nameCn" 
                rules={[{ required: true, message: t.errNameCn }]}
              >
                <Input placeholder={t.placeholderCn} size="large" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                label={t.nameEn} 
                name="nameEn" 
                rules={[{ required: true, message: t.errNameEn }]}
              >
                <Input placeholder={t.placeholderEn} size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item 
            label={t.address} 
            name="address" 
            rules={[{ required: true, message: t.errAddr }]}
          >
            <Input.TextArea placeholder={t.placeholderAddr} rows={2} />
          </Form.Item>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label={t.starRating} name="starRating" rules={[{ required: true }]}>
                <Select size="large">
                  <Option value={3}>3 {t.stars}</Option>
                  <Option value={4}>4 {t.stars}</Option>
                  <Option value={5}>5 {t.stars}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={t.openingDate} name="openingDate" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left" style={{ marginTop: 40 }}>{t.sectionRooms}</Divider>
          
          <Form.List name="roomTypes">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 16 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'type']}
                      rules={[{ required: true, message: t.errRoom }]}
                    >
                      <Input placeholder={t.roomType} style={{ width: 250 }} size="large" />
                    </Form.Item>
                    
                    <Form.Item
                      {...restField}
                      name={[name, 'price']}
                      rules={[{ required: true }, { type: 'number', min: 1 }]}
                    >
                      <InputNumber
                        placeholder={t.price}
                        size="large"
                        style={{ width: 150 }}
                        formatter={value => `$ ${value}`}
                      />
                    </Form.Item>

                    {fields.length > 1 && (
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                    )}
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} size="large">
                  {t.addRoom}
                </Button>
              </>
            )}
          </Form.List>

          <Button 
            type="primary" 
            htmlType="submit" 
            icon={loading ? <LoadingOutlined /> : <SaveOutlined />} 
            size="large" 
            block
            loading={loading}
            style={{ height: '50px', marginTop: 40 }}
          >
            {t.submit}
          </Button>
        </Form>
      </Card>
    </div>
  );
};

export default HotelEntry;