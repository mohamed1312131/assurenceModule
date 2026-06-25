import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';

import {
  AutorisationPrealable,
  AutorisationStatus,
} from '../../../models/autorisation-prealable.model';
import { Adherent } from '../../../models/adherent.model';
import { DemandeRemboursement } from '../../../models/demande-remboursement.model';
import { PlanTier } from '../../../models/plan-tier.model';
import { RequestDocument } from '../../../models/request-document.model';
import { ActCategory } from '../../../models/shared.model';
import { SourceBadgeComponent } from '../../../shared/source-badge/source-badge.component';
import { StatusChipComponent } from '../../../shared/status-chip/status-chip.component';
import { MockPdfDialogComponent } from '../demandes/mock-pdf-dialog.component';
import { AutorisationsFacade } from './autorisations.facade';

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  tone: 'success' | 'warning' | 'error' | 'info';
}

@Component({
  selector: 'app-autorisation-detail',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatDividerModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTabsModule,
    SourceBadgeComponent,
    StatusChipComponent,
  ],
  template: `
    <section class="detail-page">
      <button class="back-button" mat-button type="button" (click)="goBack()">
        <mat-icon aria-hidden="true">arrow_back</mat-icon>
        Retour aux autorisations
      </button>

      @if (autorisation(); as item) {
        <header class="detail-header">
          <div>
            <p class="eyebrow">Autorisation {{ item.id }}</p>
            <h1>{{ item.patientName }}</h1>
            <p>{{ item.actType }} · {{ actCategoryLabel(item.actCategory) }}</p>
          </div>
          <div class="header-chips">
            <app-source-badge [source]="item.source" />
            <app-status-chip [status]="item.status" />
          </div>
        </header>

        <div class="detail-layout">
          <mat-card class="tabs-card" appearance="outlined">
            <mat-tab-group animationDuration="180ms">
              <mat-tab label="Dossier">
                <div class="tab-content">
                  <section class="info-grid">
                    <article class="info-block">
                      <h2>Patient</h2>
                      <dl>
                        <div>
                          <dt>Nom</dt>
                          <dd>{{ item.patientName }}</dd>
                        </div>
                        <div>
                          <dt>Matricule</dt>
                          <dd>{{ item.patientMemberId }}</dd>
                        </div>
                        <div>
                          <dt>Plan tarifaire</dt>
                          <dd>{{ item.planTierName }}</dd>
                        </div>
                        @if (item.employerName) {
                          <div>
                            <dt>Employeur</dt>
                            <dd>{{ item.employerName }}</dd>
                          </div>
                        }
                      </dl>
                    </article>

                    <article class="info-block">
                      <h2>Demande</h2>
                      <dl>
                        <div>
                          <dt>Acte</dt>
                          <dd>{{ item.actType }}</dd>
                        </div>
                        <div>
                          <dt>Catégorie</dt>
                          <dd>{{ actCategoryLabel(item.actCategory) }}</dd>
                        </div>
                        <div>
                          <dt>Date prévue</dt>
                          <dd>{{ item.plannedDate ? dateLabel(item.plannedDate) : 'Non renseignée' }}</dd>
                        </div>
                        <div>
                          <dt>Prestataire</dt>
                          <dd>{{ item.providerName ?? 'Non renseigné' }}</dd>
                        </div>
                        <div>
                          <dt>Réseau</dt>
                          <dd>{{ item.providerInNetwork ? 'Réseau agréé' : 'Hors réseau' }}</dd>
                        </div>
                      </dl>
                    </article>
                  </section>

                  <article class="info-block wide">
                    <h2>Justification clinique</h2>
                    <p>{{ item.clinicalJustification }}</p>
                  </article>

                  <article class="info-block wide">
                    <h2>Source</h2>
                    <div class="source-line">
                      <app-source-badge [source]="item.source" />
                      <span>Soumise le {{ dateLabel(item.submittedAt) }}</span>
                    </div>
                  </article>

                  <article class="rule-box" [class.danger]="daysRemaining(item) <= 3">
                    <div>
                      <h2>Règle légale des 15 jours</h2>
                      <p>
                        Soumise le {{ dateLabel(item.submittedAt) }} · expiration le {{ dateLabel(item.expiresAt) }} ·
                        {{ countdownText(item) }}
                      </p>
                    </div>
                    <mat-progress-bar mode="determinate" [value]="countdownProgress(item)" />
                  </article>
                </div>
              </mat-tab>

              <mat-tab label="Documents PDF">
                <div class="tab-content">
                  <div class="document-list">
                    @for (document of item.documents; track document.id) {
                      <article class="document-row">
                        <mat-icon aria-hidden="true">description</mat-icon>
                        <div>
                          <strong>{{ document.label }}</strong>
                          <p>{{ document.uploadedBy }} · {{ dateLabel(document.uploadedAt) }}</p>
                        </div>
                        <app-status-chip [status]="document.status" />
                        @if (document.status === 'RECU') {
                          <button mat-stroked-button type="button" (click)="openPdf(document, item)">
                            Voir PDF
                          </button>
                        } @else {
                          <button mat-stroked-button type="button">Demander ce document</button>
                        }
                      </article>
                    }
                  </div>
                </div>
              </mat-tab>

              <mat-tab label="Contexte adhérent">
                <div class="tab-content">
                  @if (adherent(); as currentAdherent) {
                    <section class="metric-grid">
                      <article class="metric-card">
                        <span>Demandes cette année</span>
                        <strong>{{ currentAdherent.totalClaimsThisYear }}</strong>
                      </article>
                      <article class="metric-card">
                        <span>Remboursé cette année</span>
                        <strong>{{ amountLabel(currentAdherent.totalReimbursedThisYear) }}</strong>
                      </article>
                    </section>
                  }

                  <section class="panel-section">
                    <h2>Historique autorisations</h2>
                    <div class="compact-list">
                      @for (history of priorAuthHistory(); track history.id) {
                        <div>
                          <strong>{{ history.actType }}</strong>
                          <span>{{ dateLabel(history.submittedAt) }} · {{ statusLabel(history.status) }}</span>
                        </div>
                      }
                    </div>
                  </section>

                  <section class="panel-section">
                    <h2>Plan et règles utiles</h2>
                    @if (planTier(); as plan) {
                      <p>Seuil auto-approbation : {{ amountLabel(plan.autoApproveThreshold) }}</p>
                      <p>Délai SLA cible : {{ plan.slaTargetDays }} jours</p>
                    } @else {
                      <p class="muted">Plan introuvable.</p>
                    }
                  </section>
                </div>
              </mat-tab>

              <mat-tab label="Activité">
                <div class="tab-content">
                  <div class="timeline">
                    @for (event of timeline(); track event.id) {
                      <article class="timeline-event" [class]="event.tone">
                        <span class="timeline-dot"></span>
                        <div>
                          <strong>{{ event.title }}</strong>
                          <p>{{ event.description }}</p>
                          <time>{{ dateTimeLabel(event.date) }}</time>
                        </div>
                      </article>
                    }
                  </div>
                </div>
              </mat-tab>
            </mat-tab-group>
          </mat-card>

          <aside class="action-panel">
            <mat-card appearance="outlined">
              <mat-card-content>
                <div class="panel-title">
                  <h2>Décision</h2>
                  <app-status-chip [status]="item.status" />
                </div>

                @if (item.status === 'APPROUVEE_AUTO') {
                  <div class="auto-lock">
                    <mat-icon aria-hidden="true">gavel</mat-icon>
                    <strong>Auto-approuvée</strong>
                    <p>Délai légal de 15 jours expiré. Décision irréversible.</p>
                  </div>
                }

                @if (isPanelLocked()) {
                  <div class="decision-lock">
                    <mat-icon aria-hidden="true">lock</mat-icon>
                    <strong>Décision enregistrée</strong>
                    <p>{{ decisionSummary() }}</p>
                  </div>
                } @else {
                  @if (daysRemaining(item) <= 3) {
                    <div class="countdown-alert">
                      <mat-icon aria-hidden="true">priority_high</mat-icon>
                      {{ countdownText(item) }} — décision requise.
                    </div>
                  }

                  <label class="field-label" for="conditions">Conditions</label>
                  <textarea id="conditions" matInput rows="3" [value]="conditions()" (input)="setConditions($event)"></textarea>

                  <label class="field-label" for="notes">Notes internes</label>
                  <textarea id="notes" matInput rows="4" [value]="internalNotes()" (input)="setInternalNotes($event)"></textarea>

                  <div class="action-stack">
                    <button mat-flat-button color="primary" type="button" (click)="approve(false)">
                      Approuver
                    </button>
                    <button mat-stroked-button type="button" (click)="approve(true)">
                      Approuver avec conditions
                    </button>
                    <button mat-stroked-button color="warn" type="button" (click)="showRejectionForm()">
                      Refuser
                    </button>
                  </div>

                  @if (rejectionMode()) {
                    <div class="rejection-box">
                      <mat-form-field appearance="outline">
                        <mat-label>Motif de refus</mat-label>
                        <mat-select
                          [value]="rejectionReason()"
                          (selectionChange)="setRejectionReason($event.value)"
                        >
                          @for (reason of rejectionReasons; track reason.value) {
                            <mat-option [value]="reason.value">{{ reason.label }}</mat-option>
                          }
                        </mat-select>
                        @if (rejectionTouched() && !rejectionReason()) {
                          <mat-error>Motif obligatoire</mat-error>
                        }
                      </mat-form-field>
                      <button mat-flat-button color="warn" type="button" (click)="confirmReject()">
                        Confirmer le refus
                      </button>
                    </div>
                  }
                }
              </mat-card-content>
            </mat-card>
          </aside>
        </div>
      } @else {
        <mat-card class="error-card" appearance="outlined">
          <mat-card-content>
            <mat-icon aria-hidden="true">search_off</mat-icon>
            <h1>Autorisation introuvable.</h1>
            <button mat-button type="button" (click)="goBack()">Retour aux autorisations</button>
          </mat-card-content>
        </mat-card>
      }
    </section>
  `,
  styles: `
    .detail-page {
      display: grid;
      gap: 20px;
    }

    .back-button {
      justify-self: start;
    }

    .detail-header,
    .source-line,
    .document-row {
      align-items: center;
      display: flex;
      gap: 12px;
      justify-content: space-between;
    }

    .eyebrow {
      color: var(--omnicare-secondary);
      font-size: 0.78rem;
      font-weight: 800;
      margin: 0 0 6px;
      text-transform: uppercase;
    }

    h1,
    h2,
    p {
      letter-spacing: 0;
    }

    h1 {
      color: var(--omnicare-text);
      font-size: 2rem;
      margin: 0 0 6px;
    }

    .detail-header p,
    .muted {
      color: var(--omnicare-muted);
      margin: 0;
    }

    .header-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .detail-layout {
      align-items: start;
      display: grid;
      gap: 20px;
      grid-template-columns: minmax(0, 1fr) 320px;
    }

    .tabs-card,
    .action-panel mat-card,
    .error-card {
      background: #ffffff;
      border-color: rgba(15, 111, 115, 0.12);
      border-radius: 16px;
    }

    .tab-content {
      display: grid;
      gap: 18px;
      padding: 22px;
    }

    .info-grid,
    .metric-grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .info-block,
    .rule-box,
    .metric-card,
    .panel-section,
    .document-row,
    .decision-lock,
    .auto-lock,
    .countdown-alert,
    .rejection-box {
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 16px;
    }

    .info-block,
    .metric-card,
    .panel-section,
    .document-row,
    .decision-lock {
      background: #f8fafc;
    }

    .wide {
      grid-column: 1 / -1;
    }

    h2 {
      color: var(--omnicare-text);
      font-size: 1.05rem;
      margin: 0 0 12px;
    }

    dl {
      display: grid;
      gap: 12px;
      margin: 0;
    }

    dt {
      color: var(--omnicare-muted);
      font-size: 0.76rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    dd {
      color: var(--omnicare-text);
      font-weight: 700;
      margin: 4px 0 0;
    }

    .rule-box {
      background: #eff6ff;
      color: #1d4ed8;
      display: grid;
      gap: 12px;
    }

    .rule-box.danger,
    .countdown-alert,
    .auto-lock {
      background: #fef2f2;
      color: #b91c1c;
    }

    .document-list,
    .compact-list,
    .timeline,
    .action-stack,
    .rejection-box {
      display: grid;
      gap: 12px;
    }

    .document-row p,
    .compact-list span,
    .timeline-event p,
    .timeline-event time {
      color: var(--omnicare-muted);
      display: block;
      margin: 4px 0 0;
    }

    .metric-card span {
      color: var(--omnicare-muted);
      font-weight: 700;
    }

    .metric-card strong {
      color: var(--omnicare-text);
      display: block;
      font-size: 1.65rem;
      margin-top: 8px;
    }

    .compact-list > div {
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 10px;
    }

    .timeline-event {
      display: grid;
      gap: 12px;
      grid-template-columns: auto 1fr;
    }

    .timeline-dot {
      background: #1d4ed8;
      border-radius: 999px;
      height: 12px;
      margin-top: 5px;
      width: 12px;
    }

    .timeline-event.success .timeline-dot {
      background: #047857;
    }

    .timeline-event.warning .timeline-dot {
      background: #b45309;
    }

    .timeline-event.error .timeline-dot {
      background: #b91c1c;
    }

    .action-panel {
      position: sticky;
      top: 86px;
    }

    .panel-title {
      align-items: center;
      display: flex;
      justify-content: space-between;
      margin-bottom: 18px;
    }

    .field-label {
      color: var(--omnicare-muted);
      display: block;
      font-size: 0.78rem;
      font-weight: 800;
      margin: 14px 0 6px;
      text-transform: uppercase;
    }

    textarea {
      border: 1px solid #d8e1e4;
      border-radius: 10px;
      font: inherit;
      padding: 12px;
      width: 100%;
    }

    .action-stack button,
    .rejection-box button {
      width: 100%;
    }

    .countdown-alert,
    .auto-lock,
    .decision-lock {
      display: grid;
      gap: 8px;
      margin-bottom: 14px;
    }

    .error-card {
      justify-self: center;
      max-width: 680px;
      width: 100%;
    }

    .error-card mat-card-content {
      align-items: center;
      color: var(--omnicare-muted);
      display: grid;
      justify-items: center;
      min-height: 260px;
      text-align: center;
    }

    .error-card mat-icon {
      color: #94a3b8;
      font-size: 64px;
      height: 64px;
      width: 64px;
    }

    @media (max-width: 980px) {
      .detail-layout {
        grid-template-columns: 1fr;
      }

      .action-panel {
        position: static;
      }
    }

    @media (max-width: 720px) {
      .detail-header,
      .document-row {
        align-items: start;
        flex-direction: column;
      }

      .info-grid,
      .metric-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AutorisationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  protected readonly facade = inject(AutorisationsFacade);
  protected readonly autorisation = signal<AutorisationPrealable | undefined>(undefined);
  protected readonly conditions = signal('');
  protected readonly internalNotes = signal('');
  protected readonly panelLocked = signal(false);
  protected readonly rejectionMode = signal(false);
  protected readonly rejectionTouched = signal(false);
  protected readonly rejectionReason = signal<string | null>(null);
  protected readonly companyId = signal('comar');
  protected readonly adherents = signal<Adherent[]>([]);
  protected readonly planTiers = signal<PlanTier[]>([]);
  protected readonly rejectionReasons = [
    { value: 'DOCUMENT_MANQUANT', label: 'Document manquant' },
    { value: 'ACTE_NON_COUVERT', label: 'Acte non couvert' },
    { value: 'AUTORISATION_NON_JUSTIFIEE', label: 'Autorisation non justifiée' },
    { value: 'PRESTATAIRE_NON_AGREE', label: 'Prestataire non agréé' },
    { value: 'AUTRE', label: 'Autre' },
  ];

  protected readonly adherent = computed(() => {
    const item = this.autorisation();

    return item ? this.adherents().find((adherent) => adherent.membershipId === item.patientMemberId) : undefined;
  });
  protected readonly planTier = computed(() => {
    const item = this.autorisation();

    return item ? this.planTiers().find((plan) => plan.name === item.planTierName) : undefined;
  });
  protected readonly priorAuthHistory = computed(() => {
    const item = this.autorisation();

    if (!item) {
      return [];
    }

    return this.facade
      .allAutorisations()
      .filter((auth) => auth.patientMemberId === item.patientMemberId)
      .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime());
  });
  protected readonly timeline = computed(() => {
    const item = this.autorisation();

    return item ? this.buildTimeline(item) : [];
  });
  protected readonly isPanelLocked = computed(() => {
    const item = this.autorisation();

    return this.panelLocked() || !!item?.status && this.isTerminalStatus(item.status);
  });
  protected readonly decisionSummary = computed(() => {
    const item = this.autorisation();

    if (!item) {
      return '';
    }

    if (item.status === 'REFUSEE') {
      return `Refus : ${item.rejectionReason ?? 'Motif non renseigné'}`;
    }

    return item.authorizationNumber
      ? `Numéro d'autorisation : ${item.authorizationNumber}`
      : 'Décision enregistrée.';
  });

  ngOnInit(): void {
    const companyId = this.routeCompanyId();
    const id = this.route.snapshot.paramMap.get('id') ?? '';

    this.companyId.set(companyId);
    this.facade.loadForCompany(companyId);
    this.adherents.set(this.readTenantData<Adherent>('adherents'));
    this.planTiers.set(this.readTenantData<PlanTier>('plan_tiers'));

    const item = this.facade.getById(id);

    if (!item) {
      return;
    }

    if (item.status === 'EN_ATTENTE') {
      this.facade.updateStatus(item.id, 'EN_EXAMEN');
      this.autorisation.set(this.facade.getById(id));
    } else {
      this.autorisation.set(item);
    }

    this.conditions.set(this.autorisation()?.conditions ?? '');
    this.internalNotes.set(this.autorisation()?.internalNotes ?? '');
  }

  protected goBack(): void {
    void this.router.navigate(['/assurance', this.companyId(), 'autorisations']);
  }

  protected openPdf(document: RequestDocument, item: AutorisationPrealable): void {
    this.dialog.open(MockPdfDialogComponent, {
      data: {
        docType: document.type,
        record: item,
      },
      width: '860px',
    });
  }

  protected setConditions(event: Event): void {
    this.conditions.set((event.target as HTMLTextAreaElement).value);
  }

  protected setInternalNotes(event: Event): void {
    this.internalNotes.set((event.target as HTMLTextAreaElement).value);
  }

  protected approve(withConditions: boolean): void {
    const item = this.autorisation();

    if (!item) {
      return;
    }

    this.facade.updateStatus(item.id, 'APPROUVEE', {
      authorizationNumber: this.generateAuthorizationNumber(),
      conditions: withConditions ? this.conditions() || 'Accord sous réserve du protocole médical.' : this.conditions() || undefined,
      internalNotes: this.internalNotes() || undefined,
      respondedAt: new Date().toISOString(),
      respondedBy: 'Admin assurance',
    });
    this.autorisation.set(this.facade.getById(item.id));
    this.panelLocked.set(true);
  }

  protected showRejectionForm(): void {
    this.rejectionMode.set(true);
  }

  protected setRejectionReason(reason: string): void {
    this.rejectionReason.set(reason);
  }

  protected confirmReject(): void {
    const item = this.autorisation();

    this.rejectionTouched.set(true);

    if (!item || !this.rejectionReason()) {
      return;
    }

    this.facade.updateStatus(item.id, 'REFUSEE', {
      rejectionReason: this.rejectionReason() ?? undefined,
      internalNotes: this.internalNotes() || undefined,
      respondedAt: new Date().toISOString(),
      respondedBy: 'Admin assurance',
    });
    this.autorisation.set(this.facade.getById(item.id));
    this.panelLocked.set(true);
  }

  protected dateLabel(isoDate: string): string {
    return new Intl.DateTimeFormat('fr-TN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(isoDate));
  }

  protected dateTimeLabel(isoDate: string): string {
    return new Intl.DateTimeFormat('fr-TN', {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(isoDate));
  }

  protected amountLabel(amount: number): string {
    return new Intl.NumberFormat('fr-TN', {
      currency: 'TND',
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(amount);
  }

  protected daysRemaining(item: AutorisationPrealable): number {
    return Math.ceil((new Date(item.expiresAt).getTime() - Date.now()) / 86_400_000);
  }

  protected countdownText(item: AutorisationPrealable): string {
    const days = this.daysRemaining(item);

    if (days < 0) {
      return 'Délai expiré';
    }

    return `${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`;
  }

  protected countdownProgress(item: AutorisationPrealable): number {
    const total = Math.max(1, new Date(item.expiresAt).getTime() - new Date(item.submittedAt).getTime());
    const remaining = Math.max(0, new Date(item.expiresAt).getTime() - Date.now());

    return Math.round((remaining / total) * 100);
  }

  protected actCategoryLabel(category: ActCategory): string {
    const labels: Record<ActCategory, string> = {
      AUTRE: 'Autre',
      BIOLOGIE: 'Biologie',
      CHIRURGIE: 'Chirurgie',
      CONSULTATION: 'Consultation',
      DENTAIRE: 'Dentaire',
      HOSPITALISATION: 'Hospitalisation',
      KINESITHERAPIE: 'Kinésithérapie',
      MATERNITE: 'Maternité',
      OPTIQUE: 'Optique',
      PSYCHIATRIE: 'Psychiatrie',
      RADIOLOGIE: 'Radiologie',
      SOINS_INFIRMIERS: 'Soins infirmiers',
      URGENCES: 'Urgences',
    };

    return labels[category];
  }

  protected statusLabel(status: AutorisationStatus): string {
    const labels: Record<AutorisationStatus, string> = {
      APPROUVEE: 'Approuvée',
      APPROUVEE_AUTO: 'Auto-approuvée',
      EN_ATTENTE: 'En attente',
      EN_EXAMEN: 'En examen',
      REFUSEE: 'Refusée',
    };

    return labels[status];
  }

  private buildTimeline(item: AutorisationPrealable): TimelineEvent[] {
    const submittedAt = new Date(item.submittedAt);
    const reviewAt = new Date(submittedAt.getTime() + 6 * 3_600_000);
    const currentAt = new Date(item.respondedAt ?? item.expiresAt);
    const events: TimelineEvent[] = [
      {
        id: 'submitted',
        title: 'Autorisation soumise',
        description: `Canal ${item.source}`,
        date: submittedAt.toISOString(),
        tone: 'info',
      },
      {
        id: 'review',
        title: 'Examen administratif',
        description: 'Contrôle de la justification clinique.',
        date: reviewAt.toISOString(),
        tone: 'warning',
      },
    ];

    if (this.isTerminalStatus(item.status)) {
      events.push({
        id: 'decision',
        title: this.statusLabel(item.status),
        description:
          item.status === 'REFUSEE'
            ? item.rejectionReason ?? 'Motif non renseigné'
            : item.authorizationNumber ?? 'Autorisation enregistrée',
        date: currentAt.toISOString(),
        tone: item.status === 'REFUSEE' ? 'error' : 'success',
      });
    } else {
      events.push({
        id: 'current',
        title: 'Décision en attente',
        description: this.countdownText(item),
        date: currentAt.toISOString(),
        tone: 'info',
      });
    }

    return events;
  }

  private isTerminalStatus(status: AutorisationStatus): boolean {
    return ['APPROUVEE', 'APPROUVEE_AUTO', 'REFUSEE'].includes(status);
  }

  private generateAuthorizationNumber(): string {
    const companyCode = this.companyId().toUpperCase();
    const year = new Date().getFullYear();
    const sequence = `${Math.floor(Math.random() * 90_000 + 10_000)}`;

    return `AUTH-${companyCode}-${year}-${sequence}`;
  }

  private readTenantData<T>(resource: 'adherents' | 'plan_tiers'): T[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const raw = localStorage.getItem(`omnicare_ins_${this.companyId()}_${resource}`);

    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as T[];
    } catch {
      return [];
    }
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

    return 'comar';
  }
}
