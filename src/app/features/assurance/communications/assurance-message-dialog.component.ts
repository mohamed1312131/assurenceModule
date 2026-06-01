import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';

import { Communication } from '../../../models/communication.model';

@Component({
  selector: 'app-assurance-message-dialog',
  imports: [MatButtonModule, MatChipsModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>{{ message.subject }}</h2>
    <mat-dialog-content>
      <mat-chip-set aria-label="Priorité">
        <mat-chip>{{ priorityLabel(message.priority) }}</mat-chip>
        <mat-chip>{{ categoryLabel(message.category) }}</mat-chip>
      </mat-chip-set>
      <p>{{ message.body }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" type="button" mat-dialog-close>Fermer</button>
    </mat-dialog-actions>
  `,
  styles: `
    p {
      color: var(--omnicare-text);
      line-height: 1.6;
      margin: 18px 0 0;
      min-width: min(560px, 76vw);
      white-space: pre-wrap;
    }
  `,
})
export class AssuranceMessageDialogComponent {
  protected readonly message = inject(MAT_DIALOG_DATA) as Communication;

  protected priorityLabel(priority: Communication['priority']): string {
    return priority === 'URGENT' ? 'Urgent' : priority === 'IMPORTANT' ? 'Important' : 'Info';
  }

  protected categoryLabel(category: Communication['category']): string {
    const labels: Record<Communication['category'], string> = {
      ALERTE_FRAUDE: 'Alerte fraude',
      ANNONCE_SYSTEME: 'Annonce système',
      INFORMATION: 'Information générale',
      REGLEMENTAIRE: 'Réglementaire',
    };

    return labels[category];
  }
}
