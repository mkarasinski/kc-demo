/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subject, takeUntil } from 'rxjs';
import Keycloak from 'keycloak-js';
import { InactivityService } from '../../../keycloak/inactivity.service';

@Component({
  selector: 'app-inactivity-timer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inactivity-timer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InactivityTimerComponent implements OnInit, OnDestroy {
  private readonly inactivityService = inject(InactivityService);
  private readonly keycloak = inject(Keycloak);
  private readonly destroy$ = new Subject<void>();

  // Signals for timer display
  readonly inactiveSeconds = signal<number>(0);
  readonly timeUntilWarning = signal<number>(0);
  readonly showDebug = signal<boolean>(true); // Set this to false in production

  // Computed signal to determine if the timer should be displayed
  readonly shouldShow = computed(
    () =>
      this.showDebug() &&
      this.keycloak.authenticated &&
      this.inactivityService.isTracking(),
  );

  ngOnInit(): void {
    // Update timers every second if authenticated
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Only update if authenticated
        if (
          this.keycloak.authenticated &&
          this.inactivityService.isTracking()
        ) {
          const inactiveMs = this.inactivityService.getInactiveTime();
          const inactiveSec = Math.floor(inactiveMs / 1000);
          this.inactiveSeconds.set(inactiveSec);

          const warningThresholdMs =
            this.inactivityService.getWarningThreshold();
          const timeUntilWarningSec = Math.floor(
            (warningThresholdMs - inactiveMs) / 1000,
          );
          this.timeUntilWarning.set(Math.max(0, timeUntilWarningSec));
        } else {
          // Reset values when not authenticated
          this.inactiveSeconds.set(0);
          this.timeUntilWarning.set(0);
        }
      });
  }

  /**
   * Reset the inactivity timer for testing
   */
  resetTimer(): void {
    this.inactivityService.resetTimer();
  }

  /**
   * Simulate inactivity by manipulating the warning time threshold
   * This is for testing only!
   */
  simulateInactivity(): void {
    // Access the private service property for testing
    const service = this.inactivityService as any;

    // Force the last activity time to be in the past (just before warning threshold)
    const warningThreshold = this.inactivityService.getWarningThreshold();
    service.lastActivityTime = Date.now() - (warningThreshold - 2000); // 2 seconds before warning

    // Log for debugging
    console.log('Simulating inactivity - warning should appear in 2 seconds');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
