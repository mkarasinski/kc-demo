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
import { environment } from '../../../environments/environment';

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

  // Computed signal to determine if the timer should be displayed
  // Only show in non-production environments
  readonly shouldShow = computed(
    () =>
      !environment.production &&
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
