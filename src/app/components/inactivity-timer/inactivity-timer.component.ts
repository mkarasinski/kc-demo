import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { interval, Subject, takeUntil } from 'rxjs';
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
  private readonly destroy$ = new Subject<void>();

  // Signals for timer display
  readonly inactiveSeconds = signal<number>(0);
  readonly timeUntilWarning = signal<number>(0);
  readonly showDebug = signal<boolean>(true); // Set this to false in production

  ngOnInit(): void {
    // Update timers every second
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const inactiveMs = this.inactivityService.getInactiveTime();
        const inactiveSec = Math.floor(inactiveMs / 1000);
        this.inactiveSeconds.set(inactiveSec);

        const warningThresholdMs = this.inactivityService.getWarningThreshold();
        const timeUntilWarningSec = Math.floor(
          (warningThresholdMs - inactiveMs) / 1000,
        );
        this.timeUntilWarning.set(Math.max(0, timeUntilWarningSec));
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
