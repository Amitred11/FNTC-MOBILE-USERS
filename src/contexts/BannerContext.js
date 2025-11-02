// src/context/BannerContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import Banner from '../components/Banner';

const BannerContext = createContext();
export const useBanner = () => useContext(BannerContext);

export const BannerProvider = ({ children }) => {
  const [banner, setBanner] = useState({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showBanner = useCallback((type, title, message) => {
    setBanner({ visible: true, type, title, message });
    setTimeout(() => setBanner(prev => ({ ...prev, visible: false })), 3500);
  }, []);

  return (
    <BannerContext.Provider value={{ showBanner }}>
      {children}
      <Banner
        visible={banner.visible}
        type={banner.type}
        title={banner.title}
        message={banner.message}
      />
    </BannerContext.Provider>
  );
};
