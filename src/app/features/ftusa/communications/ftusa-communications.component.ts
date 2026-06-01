import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CommunicationsService } from '../../../core/communications/communications.service';
import { Communication } from '../../../models/communication.model';
import { CommunicationComposerDialogComponent } from './communication-composer-dialog.component';
import { ReadReceiptsDialogComponent } from './read-receipts-dialog.component';

@Component({
  selector: 'app-ftusa-communications',
  imports: [MatButtonModule, MatCardModule, MatDialogModule, MatIconModule, MatSnackBarModule],
  templateUrl: './ftusa-communications.component.html',
  styleUrl: './ftusa-communications.component.scss',
})
export class FtusaCommunicationsComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly comms = inject(CommunicationsService);

  ngOnInit(): void {
    this.comms.load();
  }

  protected openComposer(): void {
    const ref = this.dialog.open(CommunicationComposerDialogComponent, {
      width: '760px',
    });

    ref.afterClosed().subscribe((result: { sent?: boolean } | undefined) => {
      if (result?.sent) {
        this.snackBar.open('Message envoyé', 'Fermer', { duration: 3000 });
      }
    });
  }

  protected openReceipts(communication: Communication): void {
    this.dialog.open(ReadReceiptsDialogComponent, {
      data: communication,
      width: '800px',
    });
  }

  protected openDetail(communication: Communication): void {
    this.snackBar.open(communication.body, 'Fermer', { duration: 6000 });
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

  protected priorityLabel(priority: Communication['priority']): string {
    const labels: Record<Communication['priority'], string> = {
      IMPORTANT: 'IMPORTANT',
      INFO: 'INFO',
      URGENT: 'URGENT',
    };

    return labels[priority];
  }

  protected readCount(communication: Communication): number {
    return communication.readReceipts.length;
  }

  protected recipientCount(communication: Communication): number {
    return this.comms.recipientsFor(communication).length;
  }

  protected relativeDate(isoDate: string): string {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const minutes = Math.max(1, Math.round(diffMs / 60_000));

    if (minutes < 60) {
      return `il y a ${minutes} min`;
    }

    const hours = Math.round(minutes / 60);

    if (hours < 24) {
      return `il y a ${hours} h`;
    }

    return `il y a ${Math.round(hours / 24)} j`;
  }
}
