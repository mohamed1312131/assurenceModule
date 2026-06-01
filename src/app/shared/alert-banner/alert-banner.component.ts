import { Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type AlertBannerTone = 'info' | 'warning' | 'error' | 'success';

@Component({
  selector: 'app-alert-banner',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './alert-banner.component.html',
  styleUrl: './alert-banner.component.scss',
})
export class AlertBannerComponent {
  readonly tone = input<AlertBannerTone>('info');
  readonly icon = input<string | null>(null);
  readonly message = input.required<string>();
  readonly actionLabel = input<string | null>(null);
  readonly dismissible = input(false);

  readonly action = output<void>();
  readonly dismissed = output<void>();

  protected readonly hidden = signal(false);
  protected readonly displayIcon = computed(() => {
    if (this.icon()) {
      return this.icon();
    }

    const icons: Record<AlertBannerTone, string> = {
      error: 'error',
      info: 'info',
      success: 'check_circle',
      warning: 'warning',
    };

    return icons[this.tone()];
  });

  protected dismiss(): void {
    this.hidden.set(true);
    this.dismissed.emit();
  }
}
