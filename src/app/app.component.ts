import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

import { MenuComponent } from './components/menu/menu.component';
import { SessionWarningComponent } from './components/session-warning/session-warning.component';

@Component({
  selector: 'app-root',
  imports: [MenuComponent, RouterModule, SessionWarningComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-menu></app-menu>
    <main>
      <router-outlet></router-outlet>
    </main>
    <app-session-warning></app-session-warning>
  `,
})
export class AppComponent {}
