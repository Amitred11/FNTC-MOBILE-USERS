import * as Linking from 'expo-linking';
import api from './api'; // Assuming you have a configured axios instance

export const initiatePayment = async (billId, paymentMethod, customer) => {
  try {
    // Dynamically create the deep link URLs.
    // Linking.createURL() correctly generates 'exp://...' in development
    // and 'fibear://...' in production.
    const successRedirectUrl = Linking.createURL('payment-success');
    const failureRedirectUrl = Linking.createURL('payment-failure');

    console.log('Redirect URLs:', { successRedirectUrl, failureRedirectUrl });

    const response = await api.post('/billing/initiate-payment', {
      billId,
      paymentMethod,
      customer,
      successRedirectUrl,
      failureRedirectUrl,
    });

    const { redirectUrl } = response.data;

    if (redirectUrl) {
      // Open the Xendit payment page in the browser
      Linking.openURL(redirectUrl);
    }

    return response.data;
  } catch (error) {
    console.error('Failed to initiate payment:', error.response?.data || error.message);
    throw error;
  }
};