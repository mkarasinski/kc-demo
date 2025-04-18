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
    },
    features: [
      // Configure auto-refresh token with 15 minute timeout
      // Note: We're not using the built-in logout here because we're handling
      // that in our InactivityService to show a warning first
      withAutoRefreshToken({
        sessionTimeout: 1.5 * 60 * 1000, // 15 minutes
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
