// config/apiConfig.js

// For Android Emulator, the host machine is at 10.0.2.2
// For iOS Simulator, the host machine is at 'localhost'
// For a physical device on the same Wi-Fi, use your computer's local IP (e.g., '192.168.1.5')
const API_URL = 'backend/api'; // Change this IP for your setup
const Config_INTERNAL_API_KEY = 'no';
const CHATBOT_API_ENDPOINT = 'backend';
const apiConfig = {
  API_URL,
  Config_INTERNAL_API_KEY,
  CHATBOT_API_ENDPOINT,
};
export default apiConfig;
