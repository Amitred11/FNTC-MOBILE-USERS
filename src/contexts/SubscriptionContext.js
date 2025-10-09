// contexts/SubscriptionContext.js

import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SubscriptionContext = createContext();
export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }) => {
  const { user, api } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSubscription = useCallback(async (showLoader = false) => {
    if (!user?._id) {
      setSubscriptionData(null);
      setIsLoading(false);
      await AsyncStorage.removeItem('cachedSubscription');
      return;
    }
    
    if (showLoader) {
      setIsLoading(true);
    }

    try {
      const { data: response } = await api.get('/subscriptions/details');
      const subscriptionPayload = response.subscriptionData;

      if (subscriptionPayload && Object.keys(subscriptionPayload).length > 0) {
        setSubscriptionData(subscriptionPayload);
        await AsyncStorage.setItem('cachedSubscription', JSON.stringify(subscriptionPayload));
      } else {
        setSubscriptionData(null);
        await AsyncStorage.removeItem('cachedSubscription');
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error.response?.data?.message || error.message);
      try {
        const cachedSub = await AsyncStorage.getItem('cachedSubscription');
        setSubscriptionData(cachedSub ? JSON.parse(cachedSub) : null);
      } catch (e) {
        setSubscriptionData(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?._id, api]);

  useEffect(() => {
    if (user) {
      setIsLoading(true); 
      refreshSubscription();
    } else {
      setSubscriptionData(null);
      setIsLoading(false);
    }
  }, [user, refreshSubscription]);

  const initiatePayment = useCallback(async (payload) => {
    if (!api) throw new Error('Not authenticated');
    try {
      // The payload should be { billId, paymentMethod, customer }
      const { data } = await api.post('/billing/initiate-payment', payload);
      await refreshSubscription();
      return data; // Return the response to the screen (contains mobileRedirectUrl)
    } catch (error) {
      console.error("Failed to initiate payment:", error.response?.data?.message || error.message);
      throw error;
    }
  }, [api, refreshSubscription]);


  const subscribeToPlan = async (plan, installationAddress) => {
    const payload = { 
    planId: plan._id, 
    installationAddress 
  };
  try {
    await api.post('/subscriptions/subscribe', payload);
    await refreshSubscription();
  } catch (error) {
    console.error("Failed to subscribe:", error.response?.data?.message || error.message);
    throw error;
  }
};

  const changePlan = async (selectedPlan) => {
    try {
      await api.post('/subscriptions/change-plan', { plan: selectedPlan });
      await refreshSubscription();
    } catch (error) {
      console.error("Failed to change plan:", error.response?.data?.message || error.message);
      throw error;
    }
  };

  const cancelScheduledChange = useCallback(async () => {
    if (!api) throw new Error('Not authenticated');
    await api.post('/subscriptions/cancel-scheduled-change');
    await refreshSubscription();
  }, [api, refreshSubscription]);


  const cancelPlanChange = async () => {
    try {
      await api.post('/subscriptions/cancel-change');
      await refreshSubscription();
    } catch (error) {
      console.error("Failed to cancel plan change:", error.response?.data?.message || error.message);
      throw error;
    }
  };

  const cancelSubscription = useCallback(async () => {
    await api.post('/subscriptions/cancel');
    await refreshSubscription();
  }, [refreshSubscription]);

  const reactivateSubscription = useCallback(async () => {
    await api.post('/subscriptions/reactivate');
    await refreshSubscription();
  }, [refreshSubscription]);

  const clearSubscription = useCallback(async () => {
    await api.delete('/subscriptions/clear-inactive');
    setSubscriptionData(null);
    await AsyncStorage.removeItem('cachedSubscription');
  }, []);

  const value = useMemo(() => ({
    subscriptionStatus: subscriptionData?.status || null,
    subscriptionData,
    paymentHistory: subscriptionData?.history || [],
    isLoading,
    scheduledPlanChange: subscriptionData?.scheduledPlanChange || null,
    activePlan: subscriptionData?.planId || null,
    startDate: subscriptionData?.startDate || null,
    renewalDate: subscriptionData?.renewalDate || null,
    cancellationEffectiveDate: subscriptionData?.cancellationEffectiveDate || null,
    pendingPlanId: subscriptionData?.pendingPlanId || null,

    initiatePayment,
    refreshSubscription,
    subscribeToPlan,
    changePlan,
    cancelPlanChange,
    cancelScheduledChange,
    cancelSubscription,
    reactivateSubscription,
    clearSubscription,
  }), [
    subscriptionData, 
    isLoading, 
    refreshSubscription, 
    cancelScheduledChange,
    cancelSubscription, 
    reactivateSubscription,
    clearSubscription,
    // ✅ FIX: Added initiatePayment to the dependency array
    initiatePayment
  ]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};