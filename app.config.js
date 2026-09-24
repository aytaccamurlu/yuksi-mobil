/** @type {import('expo/config').ConfigContext} */
module.exports = ({ config }) => {
  // Set GOOGLE_MAPS_API_KEY in .env (local) or via EAS Secrets (CI/CD):
  //   npx eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value <key>
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? '';

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: { apiKey: googleMapsApiKey },
      },
    },
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        googleMapsApiKey,
      },
    },
    // Single cross-platform read path for JS (Places / Geocoding fetches).
    extra: {
      ...config.extra,
      googleMapsApiKey,
    },
  };
};
