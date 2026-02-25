import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { message } from 'antd';

import Login from './pages/Login';
import SignUp from './pages/SignUp';
import MainLayout from './layout/MainLayout';
import HotelEntry from './pages/HotelEntry';
import AuditCenter from './pages/AuditCenter';
import DashboardHome from './pages/DashboardHome';
import MyHotels from './pages/MyHotels';

import { hotelAPI } from './api';

function AppInner() {
  const location = useLocation();

  const [lang, setLang] = useState('en');
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHotels = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setHotels([]);
      return;
    }

    setLoading(true);
    try {
      const data = await hotelAPI.getList();
      setHotels(Array.isArray(data) ? data : []);
    } catch (error) {
      message.error(error?.message || 'Failed to load hotels.');
      console.error('Error loading hotels:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 首次加载
  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  // 路由切换到 dashboard 时刷新一次（登录成功跳转后也能拿到数据）
  useEffect(() => {
    if (location.pathname.startsWith('/dashboard')) {
      fetchHotels();
    }
  }, [location.pathname, fetchHotels]);

  const addHotel = async (newHotel) => {
    setLoading(true);
    try {
      await hotelAPI.create(newHotel);
      await fetchHotels();
      message.success(lang === 'zh' ? '酒店创建成功，已提交审核' : 'Hotel created successfully!');
    } catch (error) {
      message.error(error?.message || 'Failed to create hotel.');
      console.error('Error creating hotel:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateHotel = async (id, payload) => {
    setLoading(true);
    try {
      await hotelAPI.update(id, payload);
      await fetchHotels();
      message.success(lang === 'zh' ? '酒店信息更新成功' : 'Hotel updated successfully!');
    } catch (error) {
      message.error(error?.message || 'Failed to update hotel.');
      console.error('Error updating hotel:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteHotel = async (id) => {
    setLoading(true);
    try {
      await hotelAPI.delete(id);
      await fetchHotels();
    } catch (error) {
      console.error('Error deleting hotel:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateHotelStatus = async (id, status, reason = '') => {
    setLoading(true);
    try {
      await hotelAPI.updateStatus(id, { status, reason });
      await fetchHotels();
      message.success(
        lang === 'zh'
          ? `状态已更新为：${status}`
          : `Hotel status updated to ${status}!`
      );
    } catch (error) {
      message.error(error?.message || 'Failed to update hotel status.');
      console.error('Error updating hotel status:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Routes>
      {/* 登录注册 */}
      <Route path="/login" element={<Login lang={lang} setLang={setLang} />} />
      <Route path="/signup" element={<SignUp lang={lang} setLang={setLang} />} />

      {/* 仪表盘 */}
      <Route path="/dashboard" element={<MainLayout lang={lang} setLang={setLang} />}>
        <Route index element={<DashboardHome hotels={hotels} lang={lang} />} />

        <Route
          path="hotel-entry"
          element={<HotelEntry onSave={addHotel} lang={lang} />}
        />

        <Route
          path="my-hotels"
          element={
            <MyHotels
              hotels={hotels}
              loading={loading}
              lang={lang}
              onUpdateHotel={updateHotel}
              onDeleteHotel={deleteHotel}
            />
          }
        />

        <Route
          path="audit"
          element={
            <AuditCenter
              hotels={hotels}
              updateHotelStatus={updateHotelStatus}
              lang={lang}
            />
          }
        />
      </Route>

      {/* 默认跳转 */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppInner />
    </Router>
  );
}

export default App;