import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';

import { CommunicationsService } from '../../../core/communications/communications.service';
import { Communication } from '../../../models/communication.model';

@Component({
  selector: 'app-communication-composer-dialog',
  imports: [
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Nouveau message</h2>
    <mat-dialog-content>
      <section class="dialog-grid">
        <div>
          <label>Catégorie</label>
          <mat-radio-group [value]="category()" (change)="category.set($event.value)">
            <mat-radio-button value="ALERTE_FRAUDE">Alerte Fraude</mat-radio-button>
            <mat-radio-button value="REGLEMENTAIRE">Réglementaire</mat-radio-button>
            <mat-radio-button value="ANNONCE_SYSTEME">Annonce Système</mat-radio-button>
            <mat-radio-button value="INFORMATION">Information Générale</mat-radio-button>
          </mat-radio-group>
        </div>

        <div>
          <label>Priorité</label>
          <mat-radio-group [value]="priority()" (change)="priority.set($event.value)">
            <mat-radio-button value="URGENT">Urgent — popup à la connexion</mat-radio-button>
            <mat-radio-button value="IMPORTANT">Important — bannière tableau de bord</mat-radio-button>
            <mat-radio-button value="INFO">Info — standard</mat-radio-button>
          </mat-radio-group>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Destinataires</mat-label>
          <mat-select multiple [value]="recipientCompanyIds()" (selectionChange)="recipientCompanyIds.set($event.value)">
            <mat-option value="ALL">Toutes les compagnies ({{ comms.companies().length }})</mat-option>
            @for (company of comms.companies(); track company.id) {
              <mat-option [value]="company.id">{{ company.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Sujet</mat-label>
          <input matInput [value]="subject()" (input)="subject.set($any($event.target).value)" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Message</mat-label>
          <textarea matInput rows="7" [value]="body()" (input)="body.set($any($event.target).value)"></textarea>
          <mat-hint>Markdown supporté dans une version future.</mat-hint>
        </mat-form-field>

        <p class="disclaimer">
          Tous les messages sont à titre informatif et non contraignants sur le plan contractuel ou réglementaire.
        </p>
      </section>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" [disabled]="!canSend()" (click)="send()">
        Envoyer
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .dialog-grid {
      display: grid;
      gap: 16px;
      min-width: min(680px, 82vw);
      padding-top: 4px;
    }

    label {
      color: var(--omnicare-muted);
      display: block;
      font-size: 0.78rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    mat-radio-group {
      display: grid;
      gap: 8px;
    }

    .disclaimer {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 12px;
      color: #92400e;
      margin: 0;
      padding: 12px;
    }
  `,
})
export class CommunicationComposerDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<CommunicationComposerDialogComponent>);
  protected readonly comms = inject(CommunicationsService);

  protected readonly category = signal<Communication['category']>('INFORMATION');
  protected readonly priority = signal<Communication['priority']>('INFO');
  protected readonly recipientCompanyIds = signal<string[]>(['ALL']);
  protected readonly subject = signal('');
  protected readonly body = signal('');
  protected readonly canSend = computed(
    () => this.subject().trim().length > 0 && this.body().trim().length > 0,
  );

  protected send(): void {
    const recipients = this.recipientCompanyIds().includes('ALL')
      ? []
      : this.recipientCompanyIds();
    const communication: Communication = {
      body: this.body().trim(),
      category: this.category(),
      id: `comm-${Date.now()}`,
      isMandatory: false,
      priority: this.priority(),
      readReceipts: [],
      recipientCompanyIds: recipients,
      sentAt: new Date().toISOString(),
      sentBy: 'FTUSA',
      subject: this.subject().trim(),
    };

    this.comms.send(communication);
    this.dialogRef.close({ sent: true });
  }
}
