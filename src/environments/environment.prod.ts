export const environment = {
  production: true,

  // Session timeout settings (in milliseconds)
  sessionTimeouts: {
    inactivity: 15 * 60 * 1000, // 15 minutes
    warning: 14 * 60 * 1000, // 14 minutes (1 minute before logout)
  },
};
