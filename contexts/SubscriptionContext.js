import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from './AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uriToBase64 } from '../utils/imageUtils'; // Import the new utility

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

  const subscribeToPlan = async (plan, paymentMethod, proofOfPaymentUri, installationAddress) => {
    let base64Proof = null;
    if (proofOfPaymentUri) {
        base64Proof = await uriToBase64(proofOfPaymentUri);
    }

    const payload = {
      plan,
      paymentMethod,
      installationAddress,
      proofOfPayment: base64Proof, // Send Base64 string
    };
    await api.post('/subscriptions/subscribe', payload);
    await refreshSubscription();
  };

  const changePlan = async (selectedPlan) => {
    await api.post('/subscriptions/change-plan', { plan: selectedPlan });
    await refreshSubscription();
  };

  const payBill = async (billId, proofOfPaymentUri) => {
    let base64Proof = null;
    if (proofOfPaymentUri) {
        base64Proof = await uriToBase64(proofOfPaymentUri);
    }

    const { data } = await api.post('/billing/pay', {
      billId,
      proofOfPayment: base64Proof, // Send Base64 string
    });
    // The backend now returns subscriptionData even for pending verification
    if (data.subscriptionData) {
      setSubscriptionData(data.subscriptionData);
    } else {
      // Fallback if backend does not return full subscription data (shouldn't happen with fixed backend)
      await refreshSubscription(); 
    }
  };

  const submitProof = async (billId, proofOfPaymentUri) => {
    let proofOfPaymentBase64 = null;
    if (proofOfPaymentUri) {
        proofOfPaymentBase64 = await uriToBase64(proofOfPaymentUri);
    } else {
        throw new Error("Proof of payment URI is required for submission.");
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