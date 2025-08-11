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


  const subscribeToPlan = async (plan, paymentMethod, proofOfPaymentBase64, installationAddress) => {
    const payload = { plan, paymentMethod, installationAddress, proofOfPayment: proofOfPaymentBase64 };
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

  const payBill = async (billId, proofOfPaymentBase64) => {
    try {
      const { data } = await api.post('/billing/pay', { billId, proofOfPayment: proofOfPaymentBase64 });
      if (data.subscriptionData) {
        setSubscriptionData(data.subscriptionData);
      } else {
        await refreshSubscription(); 
      }
    } catch (error) {
      console.error("Failed to pay bill:", error.response?.data?.message || error.message);
      throw error;
    }
  };

  const submitProof = async (billId, proofOfPaymentBase64) => {
    try {
      if (!proofOfPaymentBase64) throw new Error("Proof of payment is required for submission.");
      await api.post('/billing/submit-proof', { billId, proofOfPaymentBase64 });
      await refreshSubscription();
    } catch (error) {
      console.error("Failed to submit proof:", error.response?.data?.message || error.message);
      throw error;
    }
  };

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
    subscriptionData: subscriptionData,
    paymentHistory: subscriptionData?.history || [],
    isLoading,
    scheduledPlanChange: subscriptionData?.scheduledPlanChange || null,
    activePlan: subscriptionData?.planId || null,
    startDate: subscriptionData?.startDate || null,
    renewalDate: subscriptionData?.renewalDate || null,
    cancellationEffectiveDate: subscriptionData?.cancellationEffectiveDate || null,
    
    refreshSubscription,
    subscribeToPlan,
    changePlan,
    cancelPlanChange,
    cancelScheduledChange,
    payBill,
    submitProof,
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
    clearSubscription
  ]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};