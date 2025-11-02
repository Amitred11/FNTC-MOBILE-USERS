import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
const { API_URL, CONFIG_INTERNAL_API_KEY } = extra;

if (!API_URL) {
  console.warn("⚠️ [apiConfig] API_URL is missing — check your .env or app.config.js setup");
}
export default {
  API_URL,
  CONFIG_INTERNAL_API_KEY,
  CHATBOT_API_ENDPOINT: API_URL ? `${API_URL}/chat` : null,
};
