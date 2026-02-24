import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Typography, Space, Switch, Divider } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, ShopOutlined, CheckSquareOutlined, DashboardOutlined, PlusCircleOutlined, LogoutOutlined, GlobalOutlined } from '@ant-design/icons';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const translations = {
  en: { title: 'YI-SU', overview: 'Overview', register: 'Register', myHotels: 'My Hotels', audit: 'Audit', logout: 'Logout', admin: 'ADMIN', merch: 'MERCHANT' },
  zh: { title: '易宿管理', overview: '概览', register: '注册酒店', myHotels: '我的酒店', audit: '审核中心', logout: '退出', admin: '管理端', merch: '商户端' }
};

const MainLayout = ({ lang, setLang }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = localStorage.getItem('userRole') || 'merchant';
  const t = translations[lang] || translations.en;

  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: t.overview },
    { key: '/dashboard/hotel-entry', icon: <PlusCircleOutlined />, label: t.register, disabled: userRole === 'admin' },
    { key: '/dashboard/my-hotels', icon: <ShopOutlined />, label: t.myHotels, disabled: userRole === 'admin' },
    { key: '/dashboard/audit', icon: <CheckSquareOutlined />, label: t.audit, disabled: userRole === 'merchant' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div style={{ height: 64, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>
          {collapsed ? 'YS' : t.title}
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={menuItems} onClick={({ key }) => navigate(key)} />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center' }}>
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} />
          <div style={{ flex: 1 }} />
          <Space size="middle">
            {/* FIXED WIDTH WRAPPER TO PREVENT HEADER JUMPING */}
            <div style={{ width: '90px', display: 'flex', justifyContent: 'center' }}>
              <Space size={4}>
                <GlobalOutlined style={{ color: '#1890ff' }} />
                <Switch checkedChildren="中" unCheckedChildren="EN" checked={lang === 'zh'} onChange={(checked) => setLang(checked ? 'zh' : 'en')} />
              </Space>
            </div>
            <Divider type="vertical" />
            <Text strong>{userRole === 'admin' ? t.admin : t.merch}</Text>
            <Button type="link" danger icon={<LogoutOutlined />} onClick={() => navigate('/login')}>{t.logout}</Button>
          </Space>
        </Header>
        <Content style={{ margin: '24px', padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG, minHeight: 280 }}>
          <Outlet context={{ lang }} />
        </Content>
      </Layout>
    </Layout>
  );
};
export default MainLayout;