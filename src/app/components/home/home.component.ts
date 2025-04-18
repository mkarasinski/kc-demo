import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  readonly copyMessage = signal<string | null>(null);

  copyToClipboard(text: string): void {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.copyMessage.set(`"${text}" copied to clipboard!`);
        setTimeout(() => this.copyMessage.set(null), 3000);
      })
      .catch(() => {
        this.copyMessage.set('Failed to copy text. Please try again.');
      });
  }
}
