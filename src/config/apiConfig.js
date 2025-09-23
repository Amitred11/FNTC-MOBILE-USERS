import Constants from 'expo-constants';

const { API_URL, Config_INTERNAL_API_KEY } =
  Constants.expoConfig.extra;

export default {
  API_URL,
  Config_INTERNAL_API_KEY,
  CHATBOT_API_ENDPOINT: `${API_URL}/chat`
};