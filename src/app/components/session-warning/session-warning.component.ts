import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import Keycloak from 'keycloak-js';
import { InactivityService } from '../../../keycloak/inactivity.service';

@Component({
  selector: 'app-session-warning',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './session-warning.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionWarningComponent {
  private readonly inactivityService = inject(InactivityService);
  readonly keycloak = inject(Keycloak);

  readonly showWarning = this.inactivityService.showWarning;
  readonly remainingTime = this.inactivityService.remainingTime;

  /**
   * Continue the session by resetting the inactivity timer and refreshing the token
   */
  continueSession(): void {
    // First refresh the token with a higher minValidity to ensure a refresh happens
    this.keycloak
      .updateToken(60) // Force refresh if token expires in less than 60 seconds
      .then((refreshed) => {
        if (refreshed) {
          console.log('Token was successfully refreshed on continue session');
        } else {
          console.log(
            'Token still valid, no refresh needed on continue session',
          );
        }
        // Then reset the inactivity timer
        this.inactivityService.resetTimer();
      })
      .catch((error) => {
        console.error('Error refreshing token on continue session:', error);
        // If token refresh fails, log out
        this.logout();
      });
  }

  /**
   * Log out immediately
   */
  logout(): void {
    this.inactivityService.logout();
  }
}
