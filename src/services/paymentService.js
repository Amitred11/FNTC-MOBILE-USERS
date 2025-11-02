// services/paymentService.js (Corrected and assuming this is the file name)

import * as Linking from 'expo-linking';

export const initiatePayment = async (api, billId, paymentMethod, customer) => {
  try {
    const successRedirectUrl = Linking.createURL('payment-success');
    const failureRedirectUrl = Linking.createURL('payment-failure');

    const response = await api.post('/billing/initiate-payment', {
      billId,
      paymentMethod,
      customer,
      successRedirectUrl,
      failureRedirectUrl,
    });

    const { redirectUrl } = response.data;

    if (redirectUrl) {
      await Linking.openURL(redirectUrl);
    }

    return response.data; 
  } catch (error) {
    console.error('Failed to initiate payment:', error.response?.data || error.message);
    throw error; 
  }
};