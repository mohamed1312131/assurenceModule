import { Component, computed, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ClaimSource } from '../../models/shared.model';

@Component({
  selector: 'app-source-badge',
  imports: [MatChipsModule, MatIconModule, MatTooltipModule],
  templateUrl: './source-badge.component.html',
  styleUrl: './source-badge.component.scss',
})
export class SourceBadgeComponent {
  readonly source = input<ClaimSource>('AUTRE');
  readonly compact = input(false);

  protected readonly label = computed(() => {
    switch (this.source()) {
      case 'OMNICARE':
        return 'OmniCare';
      case 'MANUEL':
        return 'Manuel';
      case 'IMPORT_CSV':
        return 'Import CSV';
      case 'WEBSITE':
        return 'Site web';
      case 'EMAIL':
        return 'Email';
      default:
        return 'Autre';
    }
  });

  protected readonly icon = computed(() => {
    switch (this.source()) {
      case 'OMNICARE':
        return 'smartphone';
      case 'MANUEL':
        return 'edit';
      case 'IMPORT_CSV':
        return 'upload_file';
      case 'WEBSITE':
        return 'public';
      case 'EMAIL':
        return 'mail';
      default:
        return 'help';
    }
  });

  protected readonly tooltip = computed(() => `Source : ${this.label()}`);
}
