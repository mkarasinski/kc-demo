import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InactivityService } from '../../../keycloak/inactivity.service';

@Component({
  selector: 'app-session-warning',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './session-warning.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionWarningComponent implements OnInit {
  private readonly inactivityService = inject(InactivityService);

  readonly showWarning = this.inactivityService.showWarning;
  readonly remainingTime = this.inactivityService.remainingTime;

  ngOnInit(): void {
    // Start tracking inactivity
    this.inactivityService.startTracking();
  }

  /**
   * Continue the session by resetting the inactivity timer
   */
  continueSession(): void {
    this.inactivityService.resetTimer();
  }

  /**
   * Log out immediately
   */
  logout(): void {
    this.inactivityService.logout();
  }
}
