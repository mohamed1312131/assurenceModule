import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

import { AuthService } from '../../../core/auth/auth.service';
import { CommunicationsService } from '../../../core/communications/communications.service';
import { Communication } from '../../../models/communication.model';
import { AssuranceMessageDialogComponent } from './assurance-message-dialog.component';

@Component({
  selector: 'app-assurance-communications',
  imports: [MatButtonModule, MatCardModule, MatDialogModule, MatIconModule],
  template: `
    <section class="communications-page">
      <header class="page-header">
        <div>
          <h1>Communications</h1>
          <p>{{ messages().length }} message(s) FTUSA reçus.</p>
        </div>
      </header>

      <section class="message-list">
        @for (message of messages(); track message.id) {
          <mat-card class="message-row" [class.unread]="!isRead(message)" [class.urgent]="message.priority === 'URGENT'" [class.important]="message.priority === 'IMPORTANT'">
            <div>
              <strong>{{ message.subject }}</strong>
              <span>{{ priorityLabel(message.priority) }} · {{ relativeDate(message.sentAt) }}</span>
            </div>
            <button mat-button color="primary" type="button" (click)="openMessage(message)">
              Ouvrir
            </button>
          </mat-card>
        }
      </section>
    </section>
  `,
  styles: `
    .communications-page {
      display: grid;
      gap: 22px;
    }

    h1,
    p {
      letter-spacing: 0;
    }

    h1 {
      color: var(--omnicare-text);
      font-size: 2rem;
      font-weight: 700;
      margin: 0 0 8px;
    }

    .page-header p,
    .message-row span {
      color: var(--omnicare-muted);
      margin: 0;
    }

    .message-list {
      display: grid;
      gap: 12px;
    }

    .message-row {
      align-items: center;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-left: 4px solid #94a3b8;
      border-radius: 16px;
      box-shadow: none;
      display: flex;
      justify-content: space-between;
      padding: 16px;
    }

    .message-row.unread {
      border-left-color: #1fbf9a;
    }

    .message-row.urgent {
      border-left-color: #ef4444;
    }

    .message-row.important {
      border-left-color: #f59e0b;
    }

    .message-row div {
      display: grid;
      gap: 4px;
    }
  `,
})
export class AssuranceCommunicationsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);
  protected readonly comms = inject(CommunicationsService);
  protected readonly companyId = signal(this.routeCompanyId());
  protected readonly messages = computed(() => this.comms.targetedFor(this.companyId()));

  ngOnInit(): void {
    this.comms.load();
  }

  protected openMessage(message: Communication): void {
    this.comms.markRead(
      message.id,
      this.companyId(),
      this.auth.currentUser()?.name ?? 'Administrateur assurance',
    );
    this.dialog.open(AssuranceMessageDialogComponent, {
      data: message,
      width: '640px',
    });
  }

  protected isRead(message: Communication): boolean {
    return message.readReceipts.some((receipt) => receipt.companyId === this.companyId());
  }

  protected priorityLabel(priority: Communication['priority']): string {
    return priority === 'URGENT' ? 'Urgent' : priority === 'IMPORTANT' ? 'Important' : 'Info';
  }

  protected relativeDate(isoDate: string): string {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const minutes = Math.max(1, Math.round(diffMs / 60_000));

    if (minutes < 60) {
      return `il y a ${minutes} min`;
    }

    const hours = Math.round(minutes / 60);
    return hours < 24 ? `il y a ${hours} h` : `il y a ${Math.round(hours / 24)} j`;
  }

  private routeCompanyId(): string {
    let currentRoute: ActivatedRoute | null = this.route;

    while (currentRoute) {
      const companyId = currentRoute.snapshot.paramMap.get('companyId');

      if (companyId) {
        return companyId;
      }

      currentRoute = currentRoute.parent;
    }

    return 'star';
  }
}
