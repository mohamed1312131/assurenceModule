import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ChartComponent, type ApexOptions } from 'ng-apexcharts';

@Component({
  selector: 'app-chart-card',
  host: {
    '[class.wide]': 'wide()',
  },
  imports: [ChartComponent, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './chart-card.component.html',
  styleUrl: './chart-card.component.scss',
})
export class ChartCardComponent {
  readonly title = input.required<string>();
  readonly note = input('');
  readonly options = input.required<ApexOptions>();
  readonly height = input(320);
  readonly wide = input(false);

  readonly exportCsv = output<void>();

  protected onExport(): void {
    this.exportCsv.emit();
  }
}
