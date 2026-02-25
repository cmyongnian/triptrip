import React, { useMemo, useState } from 'react';
import {
  Table,
  Tag,
  Card,
  Typography,
  Space,
  Empty,
  Spin,
  Button,
  Modal,
  Popconfirm,
  message
} from 'antd';
import { LoadingOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import HotelEntry from './HotelEntry';

const { Title, Text } = Typography;

const MyHotels = ({
  hotels = [],
  loading = false,
  lang = 'zh',
  onUpdateHotel,
  onDeleteHotel
}) => {
  const [editingHotel, setEditingHotel] = useState(null);
  const [saving, setSaving] = useState(false);

  const t = {
    cardTitle: lang === 'zh' ? '我的酒店' : 'My Hotels',
    colHotel: lang === 'zh' ? '酒店名称' : 'Hotel Name',
    colCity: lang === 'zh' ? '城市' : 'City',
    colMinPrice: lang === 'zh' ? '最低价' : 'Min Price',
    colStatus: lang === 'zh' ? '状态' : 'Status',
    colFeedback: lang === 'zh' ? '管理员反馈' : 'Admin Feedback',
    colAction: lang === 'zh' ? '操作' : 'Actions',
    unnamed: lang === 'zh' ? '未命名酒店' : 'Unnamed Hotel',
    noEn: lang === 'zh' ? '无英文名' : 'No English Name',
    noFeedback: lang === 'zh' ? '暂无反馈' : 'No feedback yet',
    emptyDesc: lang === 'zh' ? '您还没有提交酒店' : "You haven't submitted any hotels yet.",
    edit: lang === 'zh' ? '编辑' : 'Edit',
    del: lang === 'zh' ? '删除' : 'Delete',
    confirmDelete: lang === 'zh' ? '确认删除该酒店吗？' : 'Delete this hotel?',
    editModalTitle: lang === 'zh' ? '编辑酒店信息' : 'Edit Hotel',
    cancel: lang === 'zh' ? '取消' : 'Cancel',
    statusMap: {
      pending: lang === 'zh' ? '待审核' : 'PENDING',
      approved: lang === 'zh' ? '已发布' : 'LIVE',
      rejected: lang === 'zh' ? '已拒绝' : 'REJECTED',
      offline: lang === 'zh' ? '已下架' : 'OFFLINE'
    }
  };

  const rows = useMemo(() => {
    return (hotels || []).map(h => {
      const prices = Array.isArray(h.roomTypes)
        ? h.roomTypes.map(rt => Number(rt?.price)).filter(v => Number.isFinite(v))
        : [];
      const minPrice = prices.length ? Math.min(...prices) : 0;
      return { ...h, minPrice };
    });
  }, [hotels]);

  const columns = [
    {
      title: t.colHotel,
      key: 'name',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.nameCn || t.unnamed}</Text>
          <Text type="secondary">{record.nameEn || t.noEn}</Text>
        </Space>
      )
    },
    {
      title: t.colCity,
      dataIndex: 'city',
      key: 'city',
      render: (v) => v || '-'
    },
    {
      title: t.colMinPrice,
      dataIndex: 'minPrice',
      key: 'minPrice',
      render: (v) => `¥${Number(v || 0)}`
    },
    {
      title: t.colStatus,
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const currentStatus = status || 'pending';
        let color = 'gold';
        if (currentStatus === 'approved') color = 'green';
        if (currentStatus === 'rejected') color = 'red';
        if (currentStatus === 'offline') color = 'default';
        return <Tag color={color}>{t.statusMap[currentStatus]}</Tag>;
      }
    },
    {
      title: t.colFeedback,
      dataIndex: 'reason',
      key: 'reason',
      render: (reason) => reason ? <Text>{reason}</Text> : <Text type="secondary">{t.noFeedback}</Text>
    },
    {
      title: t.colAction,
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => setEditingHotel(record)}
            size="small"
          >
            {t.edit}
          </Button>

          {onDeleteHotel && (
            <Popconfirm
              title={t.confirmDelete}
              onConfirm={async () => {
                try {
                  await onDeleteHotel(record._id);
                  message.success(lang === 'zh' ? '删除成功' : 'Deleted');
                } catch (e) {
                  message.error(e?.message || (lang === 'zh' ? '删除失败' : 'Delete failed'));
                }
              }}
            >
              <Button danger icon={<DeleteOutlined />} size="small">
                {t.del}
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  const handleSaveEdit = async (payload) => {
    if (!editingHotel?._id || !onUpdateHotel) return;
    setSaving(true);
    try {
      await onUpdateHotel(editingHotel._id, payload);
      message.success(lang === 'zh' ? '保存成功' : 'Saved');
      setEditingHotel(null);
    } catch (error) {
      message.error(error?.message || (lang === 'zh' ? '保存失败' : 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <Title level={4}>{t.cardTitle}</Title>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 28 }} spin />} />
          </div>
        ) : rows.length === 0 ? (
          <Empty description={t.emptyDesc} />
        ) : (
          <Table
            rowKey={(record) => record._id}
            dataSource={rows}
            columns={columns}
            pagination={{ pageSize: 8 }}
          />
        )}
      </Card>

      <Modal
        title={t.editModalTitle}
        open={!!editingHotel}
        onCancel={() => !saving && setEditingHotel(null)}
        footer={null}
        width={900}
        destroyOnClose
      >
        {editingHotel && (
          <HotelEntry
            embedded
            initialValues={editingHotel}
            onSave={handleSaveEdit}
            onCancel={() => setEditingHotel(null)}
            submitText={saving ? (lang === 'zh' ? '保存中...' : 'Saving...') : (lang === 'zh' ? '保存修改' : 'Save')}
            lang={lang}
          />
        )}
      </Modal>
    </>
  );
};

export default MyHotels;