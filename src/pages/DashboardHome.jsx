import React from 'react';
import { Row, Col, Card, Statistic, Typography, Tag, Spin } from 'antd';
import { 
  ShopOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  InfoCircleOutlined,
  GlobalOutlined,
  LoadingOutlined 
} from '@ant-design/icons';

const { Title, Text } = Typography;

// 1. Translation Dictionary for Admin and Merchant views
const dashT = {
  en: {
    adminTitle: 'Platform Overview',
    merchantTitle: 'Merchant Workspace',
    adminSub: 'Global system statistics and audit monitoring',
    merchantSub: 'Manage your hotel listings and track approval status',
    mode: 'MODE',
    statTotalAdmin: 'Total Platform Hotels',
    statTotalMerch: 'My Total Listings',
    statPendingAdmin: 'Total Pending Audit',
    statPendingMerch: 'Awaiting Review',
    statLiveAdmin: 'Total Live Hotels',
    statLiveMerch: 'Published Hotels',
    actionTitle: 'Required Actions',
    roleAdmin: 'ADMIN',
    roleMerch: 'MERCHANT',
    mode: 'MODE',
    actionAdmin: (count) => `You have ${count} hotels waiting for your review. Please visit the Audit Center.`,
    actionMerch: 'Your published hotels are now visible to users. If a hotel is rejected, please check the Audit notes.',
  },
  zh: {
    adminTitle: '平台概览',
    merchantTitle: '商户工作台',
    adminSub: '全局系统统计与审核监控',
    merchantSub: '管理您的酒店列表并跟踪审核状态',
    mode: '模式',
    statTotalAdmin: '平台酒店总数',
    statTotalMerch: '我的列表总数',
    statPendingAdmin: '待审核总数',
    statPendingMerch: '等待审核',
    statLiveAdmin: '已发布酒店总数',
    statLiveMerch: '已发布酒店',
    actionTitle: '待办事项',
    mode: '模式',
    roleAdmin: '管理员',
    roleMerch: '商户',
    actionAdmin: (count) => `您有 ${count} 家酒店等待审核。请前往审核中心。`,
    actionMerch: '您的酒店已发布并对用户可见。如果酒店被拒绝，请检查审核备注。',
  }
};

const DashboardHome = ({ hotels, loading, lang = 'en' }) => {
  const t = dashT[lang] || dashT.en;
  const userRole = localStorage.getItem('userRole') || 'merchant';
  const isAdmin = userRole === 'admin';

  // Calculate statistics
  const pending = hotels.filter(h => h.status === 'pending').length;
  const approved = hotels.filter(h => h.status === 'approved').length;
  const total = hotels.length;

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            {isAdmin ? t.adminTitle : t.merchantTitle}
          </Title>
          <Text type="secondary">
            {isAdmin ? t.adminSub : t.merchantSub}
          </Text>
        </div>
        <Tag color={isAdmin ? 'pro' : 'blue'} style={{ padding: '4px 12px' }}>
          {isAdmin ? <GlobalOutlined /> : <ShopOutlined />} {isAdmin ? t.roleAdmin : t.roleMerch} {t.mode}
        </Tag>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" tip="Loading statistics..." />
        </div>
      ) : (
        <>
          <Row gutter={16}>
            <Col span={8}>
              <Card bordered={false} style={{ borderTop: '4px solid #1890ff', borderRadius: '8px' }}>
                <Statistic 
                  title={isAdmin ? t.statTotalAdmin : t.statTotalMerch} 
                  value={total} 
                  prefix={<ShopOutlined />} 
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} style={{ borderTop: '4px solid #faad14', borderRadius: '8px' }}>
                <Statistic 
                  title={isAdmin ? t.statPendingAdmin : t.statPendingMerch} 
                  value={pending} 
                  prefix={<ClockCircleOutlined />} 
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card bordered={false} style={{ borderTop: '4px solid #52c41a', borderRadius: '8px' }}>
                <Statistic 
                  title={isAdmin ? t.statLiveAdmin : t.statLiveMerch} 
                  value={approved} 
                  prefix={<CheckCircleOutlined />} 
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>

          <Card title={t.actionTitle} style={{ marginTop: '24px', borderRadius: '8px' }}>
            <Text>
              <InfoCircleOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
              {isAdmin ? t.actionAdmin(pending) : t.actionMerch}
            </Text>
          </Card>
        </>
      )}
    </div>
  );
};

export default DashboardHome;