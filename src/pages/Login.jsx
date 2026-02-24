import React, { useState } from 'react';
import { Form, Input, Button, Radio, Typography, Row, Col, Space, Divider, message, Switch } from 'antd';
import { 
  UserOutlined, 
  LockOutlined, 
  ShopOutlined, 
  SafetyOutlined,
  CheckCircleOutlined,
  GlobalOutlined,
  CloudServerOutlined,
  LoadingOutlined,
  UserAddOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

const { Title, Text } = Typography;

const loginT = {
  en: {
    welcome: "Welcome Back", sub: "Sign in to manage your hotel listings",
    user: "Username", pass: "Password", btn: "Sign In",
    new: "New to the platform?", create: "Create Merchant Account",
    title: "Yi-Su Platform", subtitle: "Professional Hotel Information Management System",
    f1: "Real-time Information Sync", f2: "Merchant & Admin Roles", f3: "Secure Auditing Workflow",
    role: "Login Role", merchant: "Merchant", admin: "Admin"
  },
  zh: {
    welcome: "欢迎回来", sub: "登录以管理您的酒店列表",
    user: "用户名", pass: "密码", btn: "登 录",
    new: "新用户？", create: "创建商户账号",
    title: "易宿平台", subtitle: "专业酒店信息管理系统",
    f1: "实时信息同步", f2: "商户与管理员角色", f3: "安全审核工作流",
    role: "登录角色", merchant: "商户", admin: "管理员"
  }
};

const Login = ({ lang = 'en', setLang = () => {} }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const t = loginT[lang] || loginT.en;

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await authAPI.login(values);
      // 存储token和用户信息
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('userRole', response.user.role);
      message.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      message.error(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* FIXED POSITION LANGUAGE BAR - FIXED WIDTH PREVENTS JUMPING */}
      <div style={{ 
        position: 'absolute', top: 20, right: 30, zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.9)', padding: '8px 16px',
        borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        width: '120px', display: 'flex', justifyContent: 'center'
      }}>
        <Space>
          <GlobalOutlined style={{ color: '#1890ff' }} />
          <Switch 
            checkedChildren="中" unCheckedChildren="EN" 
            checked={lang === 'zh'} 
            onChange={(checked) => setLang(checked ? 'zh' : 'en')}
          />
        </Space>
      </div>

      <Row style={{ height: '100vh' }}>
        <Col xs={0} md={12} lg={14} style={{ 
          background: 'linear-gradient(135deg, #001529 0%, #003a8c 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 40px'
        }}>
          <div style={{ color: '#fff', textAlign: 'center' }}>
            <GlobalOutlined style={{ fontSize: '80px', color: '#1890ff', marginBottom: '24px' }} />
            <Title level={1} style={{ color: '#fff', fontSize: '3.5rem' }}>{t.title}</Title>
            <Divider style={{ borderColor: 'rgba(255,255,255,0.15)' }} />
            <Space direction="vertical" size="large" style={{ textAlign: 'left' }}>
              <Text style={{ fontSize: '18px', color: '#fff' }}><CheckCircleOutlined style={{ color: '#52c41a' }} /> {t.f1}</Text>
              <Text style={{ fontSize: '18px', color: '#fff' }}><CloudServerOutlined style={{ color: '#1890ff' }} /> {t.f2}</Text>
              <Text style={{ fontSize: '18px', color: '#fff' }}><SafetyOutlined style={{ color: '#faad14' }} /> {t.f3}</Text>
            </Space>
          </div>
        </Col>
        <Col xs={24} md={12} lg={10} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
          <div style={{ width: '100%', maxWidth: '400px', padding: '20px' }}>
            <Title level={2} style={{ textAlign: 'center' }}>{t.welcome}</Title>
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: '24px' }}>{t.sub}</Text>
            
            <Form 
              layout="vertical" 
              size="large"
              onFinish={onFinish}
              initialValues={{ role: 'merchant' }}
            >
              <Form.Item name="username" rules={[{ required: true, message: t.user + ' is required' }]}>
                <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder={t.user} />
              </Form.Item>

              <Form.Item name="password" rules={[{ required: true, message: t.pass + ' is required' }]}>
                <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder={t.pass} />
              </Form.Item>

              <Form.Item label={<Text strong>{t.role}</Text>} name="role">
                <Radio.Group optionType="button" buttonStyle="solid" style={{ width: '100%' }}>
                  <Radio.Button value="merchant" style={{ width: '50%', textAlign: 'center' }}>
                    <ShopOutlined /> {t.merchant}
                  </Radio.Button>
                  <Radio.Button value="admin" style={{ width: '50%', textAlign: 'center' }}>
                    <SafetyOutlined /> {t.admin}
                  </Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                size="large" 
                loading={loading} 
                icon={loading ? <LoadingOutlined /> : undefined}
                style={{ height: '50px', marginTop: '10px', borderRadius: '8px' }}
              >
                {t.btn}
              </Button>
              
              <Divider plain>{t.new}</Divider>
              <Button type="default" icon={<UserAddOutlined />} block onClick={() => navigate('/signup')}>{t.create}</Button>
            </Form>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Login;