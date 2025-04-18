import { Injectable, OnDestroy, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  Subject,
  fromEvent,
  interval,
  merge,
  takeUntil,
  debounceTime,
  switchMap,
  map,
} from 'rxjs';
import Keycloak from 'keycloak-js';
import { KEYCLOAK_EVENT_SIGNAL, KeycloakEventType } from 'keycloak-angular';

/**
 * Service to track user inactivity and show warning before logging out
 */
@Injectable({
  providedIn: 'root',
})
export class InactivityService implements OnDestroy {
  private readonly keycloak = inject(Keycloak);
  private readonly router = inject(Router);
  private readonly keycloakSignal = inject(KEYCLOAK_EVENT_SIGNAL);

  // Configuration - Testing values (shorter for easy testing)
  // TODO: Change back to 15 minutes and 14 minutes for production
  private readonly inactivityTimeout = 60 * 1000; // 1 minute for testing (should be 15 * 60 * 1000 in production)
  private readonly warningTimeout = 30 * 1000; // 30 seconds for testing (should be 14 * 60 * 1000 in production)

  // Destruction subject to clean up subscriptions
  private readonly destroy$ = new Subject<void>();
  private readonly activitySubscription$ = new Subject<void>();

  // State signals
  readonly showWarning = signal<boolean>(false);
  readonly remainingTime = signal<number>(60); // Seconds remaining
  readonly isTracking = signal<boolean>(false);

  // Track last activity time
  private lastActivityTime = Date.now();

  constructor() {
    // Listen for Keycloak events
    this.setupAuthListeners();
  }

  /**
   * Set up listeners for authentication events
   */
  private setupAuthListeners(): void {
    // Use effect to listen for Keycloak events
    effect(() => {
      const event = this.keycloakSignal();

      if (
        event.type === KeycloakEventType.Ready &&
        this.keycloak.authenticated
      ) {
        // Start tracking when authenticated
        this.startTracking();
      } else if (event.type === KeycloakEventType.AuthLogout) {
        // Stop tracking when logged out
        this.stopTracking();
      }
    });
  }

  /**
   * Initialize the inactivity tracking
   */
  startTracking(): void {
    // Only start if not already tracking
    if (this.isTracking()) {
      return;
    }

    // Reset state
    this.lastActivityTime = Date.now();
    this.showWarning.set(false);
    this.isTracking.set(true);

    // Ensure we have a valid token first
    this.refreshToken()
      .then(() => {
        // Set up proactive token refresh every 30 seconds when active
        // This helps avoid the "Client session not active" error
        interval(30000) // Check every 30 seconds
          .pipe(takeUntil(this.activitySubscription$))
          .subscribe(() => {
            // Only refresh if we're active (not in warning state)
            if (this.keycloak.authenticated && !this.showWarning()) {
              const inactiveTime = Date.now() - this.lastActivityTime;
              // Only refresh if user has been active in the last minute
              if (inactiveTime < 60000) {
                this.refreshToken().catch((err) =>
                  console.error('Error in proactive token refresh:', err),
                );
              }
            }
          });

        // Track user activity events
        const activity$ = merge(
          fromEvent(document, 'mousemove'),
          fromEvent(document, 'mousedown'),
          fromEvent(document, 'keypress'),
          fromEvent(document, 'touchstart'),
          fromEvent(document, 'scroll'),
          fromEvent(document, 'click'),
        ).pipe(debounceTime(300), takeUntil(this.activitySubscription$));

        // Subscribe to user activity
        activity$.subscribe(() => {
          this.lastActivityTime = Date.now();

          // If warning is shown but user becomes active, hide the warning
          if (this.showWarning()) {
            this.showWarning.set(false);

            // Refresh token when user becomes active during warning
            this.refreshToken().catch((err) => {
              console.error('Error refreshing token after activity:', err);
              // If token refresh fails during the warning period, log out
              this.logout();
            });
          }
        });

        // Check inactivity every second
        interval(1000)
          .pipe(
            takeUntil(this.activitySubscription$),
            map(() => Date.now() - this.lastActivityTime),
            switchMap((inactiveTime) => {
              // Only proceed if we're authenticated
              if (!this.keycloak.authenticated) {
                this.stopTracking();
                return [];
              }

              // Calculate remaining seconds before logout once warning is shown
              if (this.showWarning()) {
                const remainingMs = this.inactivityTimeout - inactiveTime;
                const remainingSec = Math.floor(remainingMs / 1000);
                this.remainingTime.set(Math.max(0, remainingSec));

                // If timer reaches 0, log out
                if (remainingSec <= 0) {
                  this.logout();
                }
              }

              // Show warning when inactive for warningTimeout
              if (inactiveTime >= this.warningTimeout && !this.showWarning()) {
                this.showWarning.set(true);
              }

              return [];
            }),
          )
          .subscribe();
      })
      .catch((err) => {
        console.error('Error starting inactivity tracking:', err);
        this.stopTracking();
      });
  }

  /**
   * Helper method to refresh the Keycloak token
   */
  private refreshToken(): Promise<boolean> {
    // Don't try to refresh if not authenticated
    if (!this.keycloak.authenticated) {
      return Promise.resolve(false);
    }

    // Minimal validity - try to refresh the token if it will expire in the next 30 seconds
    // This is the key parameter that affects refresh behavior!
    const minValidity = 30;

    return this.keycloak
      .updateToken(minValidity)
      .then((refreshed) => {
        if (refreshed) {
          console.log('Token was successfully refreshed');
        } else {
          console.log('Token is still valid, not refreshed');
        }
        return true;
      })
      .catch((error) => {
        console.error('Failed to refresh token:', error);

        // Only log out if we're still authenticated
        if (this.keycloak.authenticated) {
          console.log('Logging out due to refresh token failure');
          this.logout();
        }
        return false;
      });
  }

  /**
   * Stop tracking inactivity
   */
  stopTracking(): void {
    if (this.isTracking()) {
      this.activitySubscription$.next();
      this.isTracking.set(false);
      this.showWarning.set(false);
    }
  }

  /**
   * Reset the inactivity timer
   */
  resetTimer(): void {
    this.lastActivityTime = Date.now();
    this.showWarning.set(false);
  }

  /**
   * Log the user out due to inactivity
   */
  logout(): void {
    this.stopTracking();
    this.keycloak
      .logout()
      .catch((error) => console.error('Error logging out:', error));
  }

  /**
   * Clean up resources on service destruction
   */
  ngOnDestroy(): void {
    this.stopTracking();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get the current inactive time in milliseconds
   */
  getInactiveTime(): number {
    return this.isTracking() ? Date.now() - this.lastActivityTime : 0;
  }

  /**
   * Get the warning threshold in milliseconds
   */
  getWarningThreshold(): number {
    return this.warningTimeout;
  }

  /**
   * Get the total inactivity timeout in milliseconds
   */
  getInactivityTimeout(): number {
    return this.inactivityTimeout;
  }
}
