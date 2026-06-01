import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

type InsightTone = 'info' | 'success' | 'warning' | 'error' | 'neutral';

@Component({
  selector: 'app-insight-card',
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './insight-card.component.html',
  styleUrl: './insight-card.component.scss',
})
export class InsightCardComponent {
  readonly icon = input('insights');
  readonly eyebrow = input('');
  readonly title = input.required<string>();
  readonly description = input('');
  readonly supportingData = input<string[]>([]);
  readonly actionLabel = input('');
  readonly tone = input<InsightTone>('info');

  readonly action = output<void>();

  protected onAction(): void {
    this.action.emit();
  }
}
