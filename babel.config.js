module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      // The react-native-dotenv plugin has been completely removed.
      process.env.NODE_ENV === 'production' && 'transform-remove-console',
    ].filter(Boolean),
  };
};