export const environment = {
  production: false,

  // Session timeout settings (in milliseconds)
  sessionTimeouts: {
    inactivity: 90 * 1000, // 1.5 minutes for testing (should be 15 * 60 * 1000 in production)
    warning: 30 * 1000, // 30 seconds for testing (should be 14 * 60 * 1000 in production)
  },
};
