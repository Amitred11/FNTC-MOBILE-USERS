import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SubscriptionContext = createContext();
export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider = ({ children }) => {
  const { user, api } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSubscription = useCallback(async () => {
    if (!user?._id) {
      setSubscriptionData(null);
      setIsLoading(false);
      await AsyncStorage.removeItem('cachedSubscription');
      return;
    }
    setIsLoading(true);
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
      console.error(
        'Failed to fetch subscription:',
        error.response?.data?.message || error.message
      );
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
      refreshSubscription();
    } else {
      setSubscriptionData(null);
      setIsLoading(false);
    }
  }, [user, refreshSubscription]);

  const subscribeToPlan = async (plan, paymentMethod, proofOfPaymentBase64, installationAddress) => {
    // The `proofOfPaymentBase64` argument is already the correct data URI or null.
    // No more conversion is needed.
    
    const payload = {
      plan,
      paymentMethod,
      installationAddress,
      proofOfPayment: proofOfPaymentBase64, // Pass the Base64 string directly.
    };
    
    // Wrap in try...catch to handle potential API errors gracefully.
    try {
        await api.post('/subscriptions/subscribe', payload);
        await refreshSubscription();
    } catch (error) {
        console.error("Failed to subscribe:", error.response?.data?.message || error.message);
        throw error; // Re-throw the error so the calling component can catch it.
    }
  };

  const changePlan = async (selectedPlan) => {
    await api.post('/subscriptions/change-plan', { plan: selectedPlan });
    await refreshSubscription();
  };

  const payBill = async (billId, proofOfPaymentBase64) => {
    const { data } = await api.post('/billing/pay', {
      billId,
      proofOfPayment: proofOfPaymentBase64, // Pass Base64 string directly
    });
    if (data.subscriptionData) {
      setSubscriptionData(data.subscriptionData);
    } else {
      await refreshSubscription(); 
    }
  };

  const submitProof = async (billId, proofOfPaymentBase64) => {
    if (!proofOfPaymentBase64) {
        throw new Error("Proof of payment is required for submission.");
    }
    await api.post('/billing/submit-proof', { billId, proofOfPaymentBase64 });
    await refreshSubscription();
  };

  const cancelPlanChange = async () => {
    await api.post('/subscriptions/cancel-change');
    await refreshSubscription();
  };

  const cancelSubscription = useCallback(async () => {
    if (!api) throw new Error('Not authenticated');
    await api.post('/subscriptions/cancel');
    await refreshSubscription();
  }, [api, refreshSubscription]);

  const reactivateSubscription = useCallback(async () => {
    if (!api) throw new Error('Not authenticated');
    await api.post('/subscriptions/reactivate');
    await refreshSubscription();
  }, [api, refreshSubscription]);

  const clearSubscription = useCallback(async () => {
    if (!api) throw new Error('Not authenticated');
    await api.delete('/subscriptions/clear-inactive');
    setSubscriptionData(null);
    await AsyncStorage.removeItem('cachedSubscription');
  }, [api]);

  const value = {
    subscriptionStatus: subscriptionData?.status || null,
    subscriptionData: subscriptionData,
    paymentHistory: subscriptionData?.history || [],
    isLoading,
    scheduledPlanChange: subscriptionData?.scheduledPlanChange || null,
    activePlan: subscriptionData?.planId || null,
    startDate: subscriptionData?.startDate || null,
    renewalDate: subscriptionData?.renewalDate || null,
    dataUsage: subscriptionData?.dataUsage || null, 
    cancellationEffectiveDate: subscriptionData?.cancellationEffectiveDate || null,
    // Action functions
    refreshSubscription,
    subscribeToPlan,
    changePlan,
    cancelPlanChange,
    payBill,
    submitProof,
    cancelSubscription,
    reactivateSubscription,
    clearSubscription,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};