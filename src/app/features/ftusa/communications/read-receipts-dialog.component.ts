import { Component, computed, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CommunicationsService } from '../../../core/communications/communications.service';
import { Communication } from '../../../models/communication.model';

@Component({
  selector: 'app-read-receipts-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, MatSnackBarModule],
  template: `
    <h2 mat-dialog-title>Destinataires</h2>
    <mat-dialog-content>
      <section class="receipt-grid">
        <div>
          <h3>Lu</h3>
          @for (item of readList(); track item.companyId) {
            <article class="read">
              <mat-icon aria-hidden="true">check_circle</mat-icon>
              <div>
                <strong>{{ item.companyName }}</strong>
                <span>{{ item.adminName }} · {{ formatDate(item.readAt) }}</span>
              </div>
            </article>
          }
        </div>
        <div>
          <h3>Non lu</h3>
          @for (item of unreadList(); track item.companyId) {
            <article>
              <mat-icon aria-hidden="true">schedule</mat-icon>
              <div>
                <strong>{{ item.companyName }}</strong>
                <span>{{ item.adminName }}</span>
              </div>
            </article>
          }
        </div>
      </section>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="remindUnread()">
        Rappel automatique aux non-lecteurs
      </button>
      <button mat-flat-button color="primary" type="button" mat-dialog-close>Fermer</button>
    </mat-dialog-actions>
  `,
  styles: `
    .receipt-grid {
      display: grid;
      gap: 18px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      min-width: min(720px, 82vw);
    }

    h3 {
      color: var(--omnicare-text);
      margin: 0 0 12px;
    }

    article {
      align-items: center;
      border: 1px solid #edf2f7;
      border-radius: 12px;
      display: grid;
      gap: 10px;
      grid-template-columns: auto 1fr;
      margin-bottom: 8px;
      padding: 10px;
    }

    article.read mat-icon {
      color: #047857;
    }

    mat-icon {
      color: #b45309;
    }

    div div {
      display: grid;
      gap: 4px;
    }

    span {
      color: var(--omnicare-muted);
    }
  `,
})
export class ReadReceiptsDialogComponent {
  private readonly data = inject(MAT_DIALOG_DATA) as Communication;
  private readonly snackBar = inject(MatSnackBar);
  protected readonly comms = inject(CommunicationsService);

  protected readonly readList = computed(() =>
    this.data.readReceipts.map((receipt) => ({
      adminName: receipt.readBy,
      companyId: receipt.companyId,
      companyName: this.comms.readCompanyName(receipt.companyId),
      readAt: receipt.readAt,
    })),
  );

  protected readonly unreadList = computed(() =>
    this.comms
      .recipientsFor(this.data)
      .filter(
        (company) =>
          !this.data.readReceipts.some((receipt) => receipt.companyId === company.id),
      )
      .map((company) => ({
        adminName: this.comms.adminFor(company.id)?.name ?? 'Administrateur non configuré',
        companyId: company.id,
        companyName: company.name,
      })),
  );

  protected remindUnread(): void {
    this.snackBar.open('Rappel automatique envoyé aux non-lecteurs (simulation)', 'Fermer', {
      duration: 3000,
    });
  }

  protected formatDate(isoDate: string): string {
    return new Intl.DateTimeFormat('fr-TN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoDate));
  }
}
