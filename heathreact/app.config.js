const appConfig = require('./app.json').expo;

module.exports = ({ config }) => {
  const plugins = [...(config.plugins ?? appConfig.plugins ?? [])];
  if (!plugins.some((plugin) => plugin === 'expo-router' || (Array.isArray(plugin) && plugin[0] === 'expo-router'))) {
    plugins.push('expo-router');
  }
  if (process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME) {
    plugins.push(['@react-native-google-signin/google-signin', {
      iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME,
    }]);
  }

  return {
    ...config,
    ...appConfig,
    ios: {
      ...appConfig.ios,
      ...config.ios,
      infoPlist: {
        ...appConfig.ios?.infoPlist,
        ...config.ios?.infoPlist,
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
        },
      },
    },
    plugins,
    extra: {
      ...config.extra,
      ...appConfig.extra,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
    },
  };
};
