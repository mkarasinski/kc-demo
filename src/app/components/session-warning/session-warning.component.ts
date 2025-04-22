import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import Keycloak from 'keycloak-js';
import { interval, Subject, takeUntil } from 'rxjs';
import { InactivityService } from '../../../keycloak/inactivity.service';

@Component({
  selector: 'app-session-warning',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './session-warning.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionWarningComponent implements OnDestroy {
  private readonly inactivityService = inject(InactivityService);
  readonly keycloak = inject(Keycloak);

  // Create a local timer that's more reliable for UI updates
  readonly countdown = signal<number>(60);
  readonly showWarning = this.inactivityService.showWarning;
  private readonly previousWarningState = signal<boolean>(false);
  private readonly destroy$ = new Subject<void>();
  private readonly timerReset$ = new Subject<void>();

  // For screen reader announcements
  readonly sessionStatusAnnouncement = computed(() => {
    if (this.showWarning() && !this.previousWarningState()) {
      return `Alert: Your session will expire in ${this.countdown()} seconds due to inactivity. Please move your mouse or press any key to continue.`;
    } else if (!this.showWarning() && this.previousWarningState()) {
      return 'Your session has been refreshed.';
    }
    return '';
  });

  constructor() {
    // Set up warning state monitoring in the constructor (injection context)
    effect(() => {
      const warningState = this.showWarning();

      if (warningState && !this.previousWarningState()) {
        // When warning first appears
        this.previousWarningState.set(true);
        this.resetCountdown();
        this.startCountdown();
      } else if (!warningState && this.previousWarningState()) {
        // When warning disappears
        this.previousWarningState.set(false);
        this.timerReset$.next(); // Stop the current timer
      }
    });
  }

  // Initialize countdown with the remaining time from service
  resetCountdown(): void {
    // Cancellation to avoid multiple intervals
    this.timerReset$.next();

    // Reset to initial value
    const timeUntilTimeout = this.inactivityService.getSecondsUntilTimeout();
    console.log('Setting countdown to:', timeUntilTimeout);
    this.countdown.set(timeUntilTimeout);
  }

  // Start a local countdown for UI updates
  startCountdown(): void {
    // Create a new timer, cancellable by timerReset$
    interval(1000)
      .pipe(takeUntil(this.destroy$), takeUntil(this.timerReset$))
      .subscribe(() => {
        if (this.showWarning()) {
          // Make sure we don't go below zero
          const currentValue = this.countdown();
          const newValue = Math.max(0, currentValue - 1);
          console.log('Countdown:', currentValue, '->', newValue);
          this.countdown.set(newValue);

          // If we reach zero, let the service handle the logout
          if (newValue === 0) {
            console.log('Countdown reached zero, logging out');
            this.inactivityService.logout();
          }
        } else {
          // If warning disappeared, stop the countdown
          this.timerReset$.next();
        }
      });
  }

  ngOnDestroy(): void {
    this.timerReset$.next();
    this.timerReset$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
