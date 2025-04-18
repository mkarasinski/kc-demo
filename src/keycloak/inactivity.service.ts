import { Injectable, OnDestroy, inject, signal } from '@angular/core';
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

/**
 * Service to track user inactivity and show warning before logging out
 */
@Injectable({
  providedIn: 'root',
})
export class InactivityService implements OnDestroy {
  private readonly keycloak = inject(Keycloak);
  private readonly router = inject(Router);

  // Configuration - Testing values (shorter for easy testing)
  // TODO: Change back to 15 minutes and 14 minutes for production
  private readonly inactivityTimeout = 60 * 1000; // 1 minute for testing (should be 15 * 60 * 1000 in production)
  private readonly warningTimeout = 30 * 1000; // 30 seconds for testing (should be 14 * 60 * 1000 in production)

  // Destruction subject to clean up subscriptions
  private readonly destroy$ = new Subject<void>();

  // State signals
  readonly showWarning = signal<boolean>(false);
  readonly remainingTime = signal<number>(60); // Seconds remaining

  // Track last activity time
  private lastActivityTime = Date.now();

  /**
   * Initialize the inactivity tracking
   */
  startTracking(): void {
    // Track user activity events
    const activity$ = merge(
      fromEvent(document, 'mousemove'),
      fromEvent(document, 'mousedown'),
      fromEvent(document, 'keypress'),
      fromEvent(document, 'touchstart'),
      fromEvent(document, 'scroll'),
      fromEvent(document, 'click'),
    ).pipe(debounceTime(300), takeUntil(this.destroy$));

    // Subscribe to user activity
    activity$.subscribe(() => {
      this.lastActivityTime = Date.now();

      // If warning is shown but user becomes active, hide the warning
      if (this.showWarning()) {
        this.showWarning.set(false);
      }
    });

    // Check inactivity every second
    interval(1000)
      .pipe(
        takeUntil(this.destroy$),
        map(() => Date.now() - this.lastActivityTime),
        switchMap((inactiveTime) => {
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
    this.keycloak
      .logout()
      .catch((error) => console.error('Error logging out:', error));
  }

  /**
   * Clean up resources on service destruction
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get the current inactive time in milliseconds
   */
  getInactiveTime(): number {
    return Date.now() - this.lastActivityTime;
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
