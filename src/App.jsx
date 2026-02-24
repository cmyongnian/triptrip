import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Ensure these paths match your folder structure exactly!
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import MainLayout from './layout/MainLayout';
import HotelEntry from './pages/HotelEntry';
import AuditCenter from './pages/AuditCenter';
import DashboardHome from './pages/DashboardHome';
import MyHotels from './pages/MyHotels';
import { hotelAPI } from './api';
import { message } from 'antd';

function App() {
  const [lang, setLang] = useState('en');
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);

  // 加载酒店列表
  useEffect(() => {
    const fetchHotels = async () => {
      // 检查是否有token，没有则不加载
      const token = localStorage.getItem('token');
      if (!token) return;

      setLoading(true);
      try {
        const data = await hotelAPI.getList();
        setHotels(data);
      } catch (error) {
        message.error('Failed to load hotels. Please try again.');
        console.error('Error loading hotels:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
  }, []);

  // 创建酒店
  const addHotel = async (newHotel) => {
    setLoading(true);
    try {
      const createdHotel = await hotelAPI.create(newHotel);
      setHotels([...hotels, createdHotel]);
      message.success('Hotel created successfully!');
    } catch (error) {
      message.error('Failed to create hotel. Please try again.');
      console.error('Error creating hotel:', error);
    } finally {
      setLoading(false);
    }
  };

  // 更新酒店状态
  const updateHotelStatus = async (id, status, reason = '') => {
    setLoading(true);
    try {
      const updatedHotel = await hotelAPI.updateStatus(id, { status, reason });
      setHotels(hotels.map(hotel => hotel._id === id ? updatedHotel : hotel));
      message.success(`Hotel status updated to ${status}!`);
    } catch (error) {
      message.error('Failed to update hotel status. Please try again.');
      console.error('Error updating hotel status:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Router>
      <Routes>
        {/* Pass props to Login and SignUp */}
        <Route path="/login" element={<Login lang={lang} setLang={setLang} />} />
        <Route path="/signup" element={<SignUp lang={lang} setLang={setLang} />} />

        {/* The Dashboard Parent Route */}
        <Route path="/dashboard" element={<MainLayout lang={lang} setLang={setLang} />}>
          {/* Default landing page for the dashboard */}
          <Route index element={<DashboardHome hotels={hotels} loading={loading} lang={lang} />} />
          
          <Route 
            path="hotel-entry" 
            element={<HotelEntry onSave={addHotel} lang={lang} />} 
          />

          <Route 
            path="my-hotels" 
            element={<MyHotels hotels={hotels} loading={loading} lang={lang} />} 
          />

          <Route 
            path="audit" 
            element={<AuditCenter hotels={hotels} updateHotelStatus={updateHotelStatus} lang={lang} />} 
          />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;