import React from 'react';
import { Form, Input, Button, Typography, Row, Col, Space, Divider, message, Switch, Radio } from 'antd';
import { 
  UserOutlined, 
  LockOutlined, 
  CheckCircleOutlined,
  GlobalOutlined,
  CloudServerOutlined,
  SafetyOutlined,
  ArrowLeftOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

const { Title, Text } = Typography;

const signupT = {
  en: {
    title: "Yi-Su Platform",
    subtitle: "Join our professional network of merchant partners",
    f1: "Instant Account Activation",
    f2: "Secure Hotel Data Storage",
    f3: "Direct Communication with Admins",
    regTitle: "User Registration",
    regSub: "Create an account to start listing hotels",
    user: "Username",
    pass: "Password",
    confirm: "Confirm Password",
    btn: "Register Now",
    back: "Already have an account? Sign In",
    success: "Registration successful! Please sign in.",
    mismatch: "The two passwords that you entered do not match!"
  },
  zh: {
    title: "易宿平台",
    subtitle: "加入我们的专业商户合作伙伴网络",
    f1: "账户即时激活",
    f2: "安全的酒店数据存储",
    f3: "与管理员直接沟通",
    regTitle: "用户注册",
    regSub: "创建账号以开始发布酒店信息",
    user: "用户名",
    pass: "密码",
    confirm: "确认密码",
    btn: "立即注册",
    back: "已有账号？返回登录",
    success: "注册成功！请登录。",
    mismatch: "您输入的两次密码不一致！"
  }
};

const SignUp = ({ lang = 'en', setLang = () => {} }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const t = signupT[lang] || signupT.en;

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // 调用注册API，只发送后端需要的字段
      await authAPI.register({
        username: values.username,
        password: values.password,
        role: values.role
      });
      message.success(t.success);
      navigate('/login');
    } catch (error) {
      message.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      {/* STABILIZED LANGUAGE BAR - Fixed width 120px prevents jumping */}
      <div style={{ 
        position: 'absolute', top: 20, right: 30, zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.9)', padding: '8px 16px',
        borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        width: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center'
      }}>
        <Space size="small">
          <GlobalOutlined style={{ color: '#1890ff' }} />
          <Switch 
            checkedChildren="中" 
            unCheckedChildren="EN" 
            checked={lang === 'zh'} 
            onChange={(checked) => setLang(checked ? 'zh' : 'en')}
          />
        </Space>
      </div>

      <Row style={{ height: '100vh' }}>
        {/* LEFT SIDE: FULL BRANDING RESTORED */}
        <Col xs={0} md={12} lg={14} style={{ 
          background: 'linear-gradient(135deg, #001529 0%, #003a8c 100%)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', 
          alignItems: 'center', padding: '0 40px', textAlign: 'center'       
        }}>
          <div style={{ color: '#fff', maxWidth: '600px' }}>
            <GlobalOutlined style={{ fontSize: '80px', color: '#1890ff', marginBottom: '24px' }} />
            
            <Title level={1} style={{ color: '#fff', fontSize: '3.5rem', marginBottom: '16px' }}>
              {t.title}
            </Title>
            
            <Title level={4} style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '300', marginBottom: '40px' }}>
              {t.subtitle}
            </Title>
            
            <Divider style={{ borderColor: 'rgba(255,255,255,0.15)', width: '80%', margin: '0 auto 40px' }} />
            
            {/* FULL ICON LIST RESTORED */}
            <div style={{ display: 'inline-block', textAlign: 'left' }}>
              <Space direction="vertical" size="large">
                <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)' }}>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '12px' }} />
                  {t.f1}
                </div>
                <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)' }}>
                  <CloudServerOutlined style={{ color: '#1890ff', marginRight: '12px' }} />
                  {t.f2}
                </div>
                <div style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)' }}>
                  <SafetyOutlined style={{ color: '#faad14', marginRight: '12px' }} />
                  {t.f3}
                </div>
              </Space>
            </div>
          </div>
        </Col>

        {/* RIGHT SIDE: REGISTRATION FORM */}
        <Col xs={24} md={12} lg={10} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', padding: '40px' }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <Title level={2} style={{ marginBottom: '8px' }}>{t.regTitle}</Title>
              <Text type="secondary">{t.regSub}</Text>
            </div>
            
            <Form layout="vertical" size="large" onFinish={onFinish} initialValues={{ role: 'merchant' }}>
              <Form.Item name="username" rules={[{ required: true }]}>
                <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder={t.user} />
              </Form.Item>

              <Form.Item name="password" rules={[{ required: true }]}>
                <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder={t.pass} />
              </Form.Item>

              <Form.Item 
                name="confirm" 
                dependencies={['password']}
                rules={[
                  { required: true },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) return Promise.resolve();
                      return Promise.reject(new Error(t.mismatch));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder={t.confirm} />
              </Form.Item>

              <Form.Item label={lang === 'zh' ? '角色' : 'Role'} name="role">
                <Radio.Group optionType="button" buttonStyle="solid" style={{ width: '100%' }}>
                  <Radio.Button value="merchant">{lang === 'zh' ? '商户' : 'Merchant'}</Radio.Button>
                  <Radio.Button value="admin">{lang === 'zh' ? '管理员' : 'Admin'}</Radio.Button>
                </Radio.Group>
              </Form.Item>

              <Button type="primary" htmlType="submit" block style={{ height: '50px', marginTop: '10px', borderRadius: '8px' }} loading={loading}>
                {t.btn}
              </Button>

              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/login')} style={{ color: '#595959' }}>
                  {t.back}
                </Button>
              </div>
            </Form>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default SignUp;