import React from 'react';
import { Table, Tag, Card, Typography, Space, Empty, Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// 1. Translation Dictionary
const myHotelsT = {
  en: {
    cardTitle: "My Submission Tracking",
    colHotel: "Hotel Name",
    colStatus: "Status",
    colFeedback: "Admin Feedback",
    unnamed: "Unnamed Hotel",
    noEn: "No English Name",
    noFeedback: "No feedback yet",
    emptyDesc: "You haven't submitted any hotels yet.",
    statusMap: {
      pending: "PENDING",
      approved: "LIVE",
      rejected: "REJECTED",
      offline: "OFFLINE"
    }
  },
  zh: {
    cardTitle: "我的提交",
    colHotel: "酒店名称",
    colStatus: "状态",
    colFeedback: "管理员反馈",
    unnamed: "未命名酒店",
    noEn: "无英文名称",
    noFeedback: "暂无反馈",
    emptyDesc: "您尚未提交过任何酒店信息。",
    statusMap: {
      pending: "待审核",
      approved: "已发布",
      rejected: "已拒绝",
      offline: "已下架"
    }
  }
};

const MyHotels = ({ hotels, loading, lang = 'en' }) => {
  const t = myHotelsT[lang] || myHotelsT.en;

  const columns = [
    {
      title: t.colHotel,
      key: 'name',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.nameCn || t.unnamed}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.nameEn || t.noEn}</Text>
        </Space>
      ),
    },
    {
      title: t.colStatus,
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'gold';
        const currentStatus = status || 'pending';
        if (currentStatus === 'approved') color = 'green';
        if (currentStatus === 'rejected') color = 'red';
        if (currentStatus === 'offline') color = 'default';
        
        // Translate the status tag text
        return <Tag color={color}>{t.statusMap[currentStatus]}</Tag>;
      },
    },
    {
      title: t.colFeedback,
      dataIndex: 'reason',
      key: 'reason',
      render: (reason) => reason ? 
        <Text type="danger">{reason}</Text> : 
        <Text type="secondary">{t.noFeedback}</Text>,
    },
  ];

  return (
    <div style={{ padding: '2px' }}>
      <Card bordered={false} title={t.cardTitle}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" tip="Loading hotels..." />
          </div>
        ) : (
          <Table 
            dataSource={hotels} 
            columns={columns} 
            rowKey="_id" 
            pagination={{ pageSize: 5 }}
            locale={{ 
              emptyText: <Empty description={t.emptyDesc} /> 
            }}
          />
        )}
      </Card>
    </div>
  );
};

export default MyHotels;