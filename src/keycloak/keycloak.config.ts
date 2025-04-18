import {
  provideKeycloak,
  createInterceptorCondition,
  IncludeBearerTokenCondition,
  INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
  withAutoRefreshToken,
  AutoRefreshTokenService,
  UserActivityService,
} from 'keycloak-angular';

const localhostCondition =
  createInterceptorCondition<IncludeBearerTokenCondition>({
    urlPattern: /^(http:\/\/localhost:8181)(\/.*)?$/i,
  });

export const provideKeycloakAngular = () =>
  provideKeycloak({
    config: {
      realm: 'keycloak-angular-sandbox',
      url: 'http://localhost:8080',
      clientId: 'keycloak-angular',
    },
    initOptions: {
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri:
        window.location.origin + '/silent-check-sso.html',
      redirectUri: window.location.origin + '/',
      checkLoginIframe: false, // Disable iframe check to reduce errors
    },
    features: [
      // Configure auto-refresh token with shorter timeout for testing
      // TODO: Change back to 15 minutes for production
      withAutoRefreshToken({
        sessionTimeout: 60 * 1000, // 1 minute for testing (should be 15 * 60 * 1000 in production)
        onInactivityTimeout: 'none', // We handle this in our InactivityService
      }),
    ],
    providers: [
      AutoRefreshTokenService,
      UserActivityService,
      {
        provide: INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
        useValue: [localhostCondition],
      },
    ],
  });
