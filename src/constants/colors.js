// constants/colors.js

// A professional, modern, and accessible blue-centric palette.
export const lightTheme = {
  // --- Core Colors ---
  primary: '#007AFF', // A clear, standard blue for interactive elements.
  background: '#F0F2F5', // A very light, soft gray background. Softer than pure white.
  surface: '#FFFFFF', // Cards, modals, and inputs will be pure white for contrast.

  // --- Text Colors ---
  text: '#1C1C1E',
  textForNav: '#1C1C1E', // A very dark gray, softer than pure black.
  textSecondary: '#6E6E73', // A medium gray for subtitles and placeholders.
  textOnPrimary: '#FFFFFF', // White text for primary buttons.
  textBe: '#000000',

  // --- Status & Accent Colors ---
  accent: '#5856D6', // A secondary purple/blue for highlights or special features.
  success: '#34C759', // A vibrant green for success states.
  danger: '#FF3B30', // A clear red for errors and destructive actions.
  warning: '#FF9500', // A standard orange for warnings.

  // --- UI Element Colors ---
  border: '#D1D1D6', // A light gray for borders and dividers.
  disabled: '#dadadaff', // A neutral gray for disabled elements.
  gradient: null,
  bot: '#E4E6EB',
  serv: '#F0F2F5',
  ChatInput: '#E5E5EA'
};

export const darkTheme = {
  // --- Core Colors ---
  primary: '#0A84FF', // A slightly brighter blue for better visibility on dark backgrounds.
  background: '#000000', // Pure black for OLED screens.
  surface: '#1C1C1E', // A dark gray for cards and modals to give a sense of depth.

  // --- Text Colors ---
  text: '#E5E5EA',
  textForNav: '#1C1C1E', // A light off-white for primary text.
  textSecondary: '#8E8E93', // A lighter gray for subtitles.
  textOnPrimary: '#FFFFFF', // White text on primary buttons.
  textBe: '#000000',
  // --- Status & Accent Colors ---
  accent: '#5E5CE6', // A slightly brighter purple/blue accent.
  success: '#30D158', // A vibrant green.
  danger: '#FF453A', // A vibrant red.
  warning: '#FF9F0A', // A vibrant orange.

  // --- UI Element Colors ---
  border: '#38383A', // A visible but subtle border color.
  disabled: '#424242', // A dark gray for disabled elements.
  gradient: null, // Avoid gradients in dark mode too.
  bot: '#343435ff',
  serv: '#F0F2F5',
  ChatInput: '#424242'
};
