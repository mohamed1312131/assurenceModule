import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
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
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';

import { AuthService } from '../../../core/auth/auth.service';
import { Adherent } from '../../../models/adherent.model';
import { CorporateContract } from '../../../models/corporate-contract.model';
import {
  ClaimFlag,
  DemandeRemboursement,
  DemandeStatus,
  RejectionReason,
} from '../../../models/demande-remboursement.model';
import { CoverageRule, PlanTier } from '../../../models/plan-tier.model';
import { RequestDocument } from '../../../models/request-document.model';
import { ActCategory } from '../../../models/shared.model';
import { SourceBadgeComponent } from '../../../shared/source-badge/source-badge.component';
import { StatusChipComponent } from '../../../shared/status-chip/status-chip.component';
import {
  ComarBulletinPdfMode,
  ComarBulletinPdfService,
} from '../services/comar-bulletin-pdf.service';
import { DemandesFacade } from './demandes.facade';
import { MockPdfDialogComponent } from './mock-pdf-dialog.component';

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  tone: 'success' | 'warning' | 'error' | 'info';
}

interface BudgetRow {
  category: ActCategory;
  label: string;
  used: number;
  max: number;
  progress: number;
}

@Component({
  selector: 'app-demande-detail-placeholder',
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
        Retour aux demandes
      </button>

      @if (demandeSignal(); as demande) {
        <header class="detail-header">
          <div>
            <p class="eyebrow">Dossier {{ demande.id }}</p>
            <h1>{{ demande.patientName }}</h1>
            <p>{{ demande.actDescription }} · {{ amountLabel(demande.totalAmount) }}</p>
          </div>
          <div class="header-chips">
            <app-source-badge [source]="demande.source" />
            <app-status-chip [status]="demande.status" />
          </div>
        </header>

        <section class="summary-strip" aria-label="Synthèse du dossier">
          <article class="summary-card">
            <span>Montant demandé</span>
            <strong>{{ amountLabel(demande.totalAmount) }}</strong>
          </article>
          <article class="summary-card">
            <span>Montant calculé</span>
            <strong>{{ amountLabel(calculatedCoverageAmount()) }}</strong>
          </article>
          <article class="summary-card">
            <span>Acte médical</span>
            <strong>{{ actCategoryLabel(demande.actCategory) }}</strong>
          </article>
          <article class="summary-card">
            <span>Dépôt</span>
            <strong>{{ dateLabel(demande.submittedAt) }}</strong>
          </article>
        </section>

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
                          <dd>{{ demande.patientName }}</dd>
                        </div>
                        <div>
                          <dt>Matricule</dt>
                          <dd>{{ demande.patientMemberId }}</dd>
                        </div>
                        <div>
                          <dt>Plan tarifaire</dt>
                          <dd>{{ demande.planTierName }}</dd>
                        </div>
                        <div>
                          <dt>Type adhésion</dt>
                          <dd>{{ adherent()?.enrollmentType ?? 'Non renseigné' }}</dd>
                        </div>
                        @if (demande.employerName) {
                          <div>
                            <dt>Employeur</dt>
                            <dd>{{ demande.employerName }}</dd>
                          </div>
                        }
                      </dl>
                    </article>

                    <article class="info-block">
                      <h2>Source</h2>
                      <div class="stack">
                        <app-source-badge [source]="demande.source" />
                        <p>Soumise le {{ dateLabel(demande.submittedAt) }}</p>
                      </div>
                    </article>

                    <article class="info-block wide">
                      <h2>Facture</h2>
                      <dl class="two-cols">
                        <div>
                          <dt>N° facture</dt>
                          <dd>{{ demande.factureNumber }}</dd>
                        </div>
                        <div>
                          <dt>Date facture</dt>
                          <dd>{{ dateLabel(demande.factureDate) }}</dd>
                        </div>
                        <div>
                          <dt>Prestataire</dt>
                          <dd>{{ demande.providerName }}</dd>
                        </div>
                        <div>
                          <dt>Type prestataire</dt>
                          <dd>{{ providerTypeLabel(demande.providerType) }}</dd>
                        </div>
                        <div>
                          <dt>Réseau agréé</dt>
                          <dd>
                            <mat-chip class="network-chip" [class.out]="!demande.providerInNetwork">
                              {{ demande.providerInNetwork ? 'Oui' : 'Non' }}
                            </mat-chip>
                          </dd>
                        </div>
                        <div>
                          <dt>Montant total</dt>
                          <dd>{{ amountLabel(demande.totalAmount) }}</dd>
                        </div>
                      </dl>
                    </article>
                  </section>

                  @if (demande.priorAuthorizationRef) {
                    <div class="notice info">
                      <mat-icon aria-hidden="true">verified</mat-icon>
                      Autorisation liée : {{ demande.priorAuthorizationRef }}
                    </div>
                  }

                  @if (filingDeadline(); as deadline) {
                    <div class="notice" [class.success]="deadline.valid" [class.error]="!deadline.valid">
                      <mat-icon aria-hidden="true">{{ deadline.valid ? 'check_circle' : 'error' }}</mat-icon>
                      {{ deadline.label }}
                    </div>
                  }

                  @if (demande.flags.includes('SEUIL_REASSURANCE')) {
                    <div class="notice warning">
                      <mat-icon aria-hidden="true">payments</mat-icon>
                      Seuil de réassurance atteint — revue financière recommandée.
                    </div>
                  }
                </div>
              </mat-tab>

              <mat-tab label="Documents PDF">
                <div class="tab-content">
                  <article class="document-row generated-document-row">
                    <mat-icon aria-hidden="true">picture_as_pdf</mat-icon>
                    <div>
                      <strong>Bulletin de soins COMAR</strong>
                      <p>Document généré · Pré-rempli patient</p>
                    </div>
                    <mat-chip class="document-mode-chip">Pré-rempli patient</mat-chip>
                    <div class="document-actions">
                      <button mat-stroked-button type="button" (click)="previewComarBulletin(demande, 'PATIENT_PREFILLED')">
                        <mat-icon aria-hidden="true">visibility</mat-icon>
                        Prévisualiser
                      </button>
                      <button mat-stroked-button type="button" (click)="downloadComarBulletin(demande, 'PATIENT_PREFILLED')">
                        <mat-icon aria-hidden="true">download</mat-icon>
                        Télécharger
                      </button>
                    </div>
                  </article>

                  @if (isApprovedStatus(demande.status)) {
                    <article class="document-row generated-document-row">
                      <mat-icon aria-hidden="true">picture_as_pdf</mat-icon>
                      <div>
                        <strong>Bulletin de soins COMAR</strong>
                        <p>Document généré · Version finale assurance</p>
                      </div>
                      <mat-chip class="document-mode-chip final">Version finale assurance</mat-chip>
                      <div class="document-actions">
                        <button mat-stroked-button type="button" (click)="previewComarBulletin(demande, 'ASSURANCE_FINAL')">
                          <mat-icon aria-hidden="true">visibility</mat-icon>
                          Prévisualiser
                        </button>
                        <button mat-stroked-button type="button" (click)="downloadComarBulletin(demande, 'ASSURANCE_FINAL')">
                          <mat-icon aria-hidden="true">download</mat-icon>
                          Télécharger
                        </button>
                      </div>
                    </article>
                  }

                  @if (demande.documents.length === 0) {
                    <div class="empty-inline">Aucun document associé à ce dossier.</div>
                  } @else {
                    <div class="document-list">
                      @for (document of demande.documents; track document.id) {
                        <article class="document-row">
                          <mat-icon aria-hidden="true">description</mat-icon>
                          <div>
                            <strong>{{ document.label }}</strong>
                            <p>{{ document.uploadedBy }} · {{ dateLabel(document.uploadedAt) }}</p>
                          </div>
                          <app-status-chip [status]="document.status" />
                          @if (document.status === 'RECU') {
                            <button mat-stroked-button type="button" (click)="openPdf(document, demande)">
                              Voir PDF
                            </button>
                          } @else {
                            <button mat-stroked-button type="button" (click)="requestDocument(document)">
                              Demander ce document
                            </button>
                          }
                        </article>
                      }
                    </div>
                  }
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

                    <section class="panel-section">
                      <h2>Budgets annuels par catégorie</h2>
                      <div class="budget-list">
                        @for (row of budgetRows(); track row.category) {
                          <div class="budget-row">
                            <div>
                              <strong>{{ row.label }}</strong>
                              <span>{{ amountLabel(row.used) }} / {{ amountLabel(row.max) }}</span>
                            </div>
                            <mat-progress-bar mode="determinate" [value]="row.progress" />
                          </div>
                        }
                      </div>
                    </section>

                    <section class="panel-section">
                      <h2>5 dernières demandes</h2>
                      <div class="compact-list">
                        @for (item of patientPreviousDemandes(); track item.id) {
                          <div>
                            <strong>{{ item.actDescription }}</strong>
                            <span>{{ dateLabel(item.submittedAt) }} · {{ amountLabel(item.totalAmount) }}</span>
                          </div>
                        }
                      </div>
                    </section>

                    <section class="panel-section">
                      <h2>Signaux précédents</h2>
                      @if (previousFlagSummary().length) {
                        <mat-chip-set>
                          @for (flag of previousFlagSummary(); track flag) {
                            <mat-chip>{{ flagLabel(flag) }}</mat-chip>
                          }
                        </mat-chip-set>
                      } @else {
                        <p class="muted">Aucun signal antérieur.</p>
                      }
                    </section>
                  } @else {
                    <div class="empty-inline">Adhérent introuvable dans les données de démonstration.</div>
                  }
                </div>
              </mat-tab>

              @if (demande.employerName) {
                <mat-tab label="Contexte employeur">
                  <div class="tab-content">
                    @if (contract(); as currentContract) {
                      <section class="info-grid">
                        <article class="info-block wide">
                          <h2>Contrat groupe</h2>
                          <dl class="two-cols">
                            <div>
                              <dt>Début</dt>
                              <dd>{{ dateLabel(currentContract.contractStartDate) }}</dd>
                            </div>
                            <div>
                              <dt>Fin</dt>
                              <dd>{{ dateLabel(currentContract.contractEndDate) }}</dd>
                            </div>
                            <div>
                              <dt>Adhérents couverts</dt>
                              <dd>{{ currentContract.enrolledEmployees }} / {{ currentContract.totalEmployees }}</dd>
                            </div>
                            <div>
                              <dt>Prime annuelle</dt>
                              <dd>{{ amountLabel(currentContract.annualPremium) }}</dd>
                            </div>
                            <div>
                              <dt>Ratio sinistres</dt>
                              <dd>{{ percentLabel(currentContract.claimsRatio * 100) }}</dd>
                            </div>
                            <div>
                              <dt>Renouvellement</dt>
                              <dd>{{ daysUntil(currentContract.renewalNoticeDate) }} jours</dd>
                            </div>
                          </dl>
                        </article>
                      </section>

                      <section class="metric-grid">
                        <article class="metric-card">
                          <span>Demandes employeur cette année</span>
                          <strong>{{ employerClaims().count }}</strong>
                        </article>
                        <article class="metric-card">
                          <span>Total engagé</span>
                          <strong>{{ amountLabel(employerClaims().total) }}</strong>
                        </article>
                      </section>

                      <div class="recommendation">
                        <mat-icon aria-hidden="true">tips_and_updates</mat-icon>
                        <div>
                          <strong>Recommandation renouvellement</strong>
                          <p>{{ renewalRecommendation(currentContract) }}</p>
                        </div>
                      </div>
                    } @else {
                      <div class="empty-inline">Contrat employeur introuvable.</div>
                    }
                  </div>
                </mat-tab>
              }

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
                  <app-status-chip [status]="demande.status" />
                </div>

                @if (isPanelLocked()) {
                  <div class="decision-lock">
                    <mat-icon aria-hidden="true">lock</mat-icon>
                    <strong>Décision enregistrée</strong>
                    <p>{{ decisionSummary() }}</p>
                  </div>
                } @else {
                  <label class="field-label" for="approvedAmount">Montant à approuver (TND)</label>
                  <input
                    id="approvedAmount"
                    matInput
                    class="amount-input"
                    type="number"
                    min="0"
                    [value]="approvedAmount()"
                    (input)="setApprovedAmount($event)"
                  />

                  <button class="link-button" mat-button type="button" (click)="toggleCoverage()">
                    <mat-icon aria-hidden="true">lightbulb</mat-icon>
                    Voir le calcul de couverture
                  </button>

                  @if (showCoverage()) {
                    <div class="coverage-box">
                      @if (coverageRule(); as rule) {
                        <p>Couverture : {{ rule.coveragePercent }}%</p>
                        <p>Montant calculé : {{ amountLabel(calculatedCoverageAmount()) }}</p>
                        @if (rule.maxAmountPerClaim && calculatedCoverageRaw() > rule.maxAmountPerClaim) {
                          <p class="warning-text">Plafond par dossier : {{ amountLabel(rule.maxAmountPerClaim) }}</p>
                        }
                        @if (rule.maxAmountPerYear) {
                          <p>Plafond annuel : {{ amountLabel(rule.maxAmountPerYear) }}</p>
                        }
                      } @else {
                        <p>Aucune règle dédiée pour cette catégorie.</p>
                      }
                    </div>
                  }

                  <label class="field-label" for="internalNotes">Notes internes</label>
                  <textarea
                    id="internalNotes"
                    matInput
                    rows="4"
                    [value]="internalNotes()"
                    (input)="setInternalNotes($event)"
                  ></textarea>

                  <div class="action-stack">
                    <button mat-flat-button color="primary" type="button" (click)="approve('APPROUVEE')">
                      Approuver
                    </button>
                    <button mat-stroked-button type="button" (click)="approve('APPROUVEE_PARTIELLEMENT')">
                      Approbation partielle
                    </button>
                    <button mat-stroked-button type="button" (click)="requestMissingDocuments()">
                      Demander documents
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
            <h1>Dossier introuvable.</h1>
            <button mat-button type="button" (click)="goBack()">Retour aux demandes</button>
          </mat-card-content>
        </mat-card>
      }
    </section>
  `,
  styles: `
    .detail-page {
      background: #ffffff;
      border: 1px solid rgba(15, 111, 115, 0.1);
      border-radius: 26px;
      display: grid;
      gap: 16px;
      padding: 22px;
    }

    .back-button {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 999px;
      color: #334155;
      font-weight: 800;
      justify-self: start;
      min-height: 34px;
    }

    .detail-header {
      align-items: end;
      border-bottom: 1px solid #eef2f4;
      display: flex;
      gap: 18px;
      justify-content: space-between;
      padding-bottom: 14px;
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
      font-size: 1.72rem;
      font-weight: 800;
      line-height: 1.12;
      margin: 0 0 6px;
    }

    .detail-header p,
    .muted {
      color: var(--omnicare-muted);
      margin: 0;
    }

    .header-chips {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .summary-strip {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .summary-card {
      background: #fbfcfd;
      border: 1px solid #e5e7eb;
      border-left: 3px solid var(--omnicare-secondary);
      border-radius: 12px;
      display: grid;
      gap: 7px;
      min-height: 86px;
      padding: 12px 13px;
    }

    .summary-card span {
      color: #64748b;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .summary-card strong {
      color: var(--omnicare-text);
      font-size: 1rem;
      font-weight: 800;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .detail-layout {
      align-items: start;
      display: grid;
      gap: 14px;
      grid-template-columns: minmax(0, 1fr) 340px;
    }

    .tabs-card,
    .action-panel mat-card,
    .error-card {
      background: #ffffff;
      border-color: #e5e7eb;
      border-radius: 14px;
      box-shadow: none;
    }

    .tab-content {
      display: grid;
      gap: 14px;
      padding: 18px;
    }

    :host ::ng-deep .tabs-card .mat-mdc-tab-header {
      border-bottom: 1px solid #eef2f4;
      margin: 0 18px;
    }

    :host ::ng-deep .tabs-card .mat-mdc-tab-header-pagination {
      display: none !important;
    }

    :host ::ng-deep .tabs-card .mat-mdc-tab-label-container {
      overflow: visible;
    }

    :host ::ng-deep .tabs-card .mat-mdc-tab {
      flex: 0 1 auto;
      min-width: max-content;
      padding: 0 16px;
    }

    :host ::ng-deep .tabs-card .mdc-tab__text-label {
      color: #334155;
      font-size: 0.8rem;
      font-weight: 800;
      letter-spacing: 0;
    }

    .info-grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .info-block,
    .metric-card,
    .panel-section,
    .recommendation,
    .notice,
    .document-row,
    .coverage-box,
    .decision-lock {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px;
    }

    .info-block,
    .metric-card,
    .panel-section,
    .document-row,
    .coverage-box {
      background: #ffffff;
    }

    .info-block,
    .panel-section,
    .document-row {
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
    }

    .wide {
      grid-column: 1 / -1;
    }

    h2 {
      color: var(--omnicare-text);
      font-size: 0.96rem;
      font-weight: 800;
      margin: 0 0 12px;
    }

    dl {
      display: grid;
      gap: 12px;
      margin: 0;
    }

    .two-cols {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    dt {
      color: #64748b;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    dd {
      color: var(--omnicare-text);
      font-size: 0.84rem;
      font-weight: 800;
      margin: 4px 0 0;
    }

    .stack,
    .document-list,
    .compact-list,
    .budget-list,
    .timeline,
    .action-stack,
    .rejection-box {
      display: grid;
      gap: 12px;
    }

    .network-chip {
      --mdc-chip-outline-color: #bbf7d0;
      --mdc-chip-elevated-container-color: #ecfdf5;
      --mdc-chip-label-text-color: #047857;
      border: 1px solid #bbf7d0;
    }

    .network-chip.out {
      --mdc-chip-outline-color: #fecaca;
      --mdc-chip-elevated-container-color: #fef2f2;
      --mdc-chip-label-text-color: #b91c1c;
      border-color: #fecaca;
    }

    .notice {
      align-items: center;
      background: #eef7f6;
      border-color: #cde8e6;
      color: var(--omnicare-secondary);
      display: flex;
      gap: 10px;
      font-size: 0.84rem;
      font-weight: 800;
    }

    .notice.success {
      background: #ecfdf5;
      border-color: #bbf7d0;
      color: #047857;
    }

    .notice.error {
      background: #fef2f2;
      border-color: #fecaca;
      color: #b91c1c;
    }

    .notice.warning,
    .warning-text {
      background: #fffbeb;
      border-color: #fde68a;
      color: #b45309;
    }

    .document-row {
      align-items: center;
      display: grid;
      gap: 12px;
      grid-template-columns: auto minmax(0, 1fr) auto auto;
    }

    .generated-document-row {
      background: #fbfcfd;
      border-color: #dbe3e7;
    }

    .generated-document-row > mat-icon {
      color: var(--omnicare-secondary);
    }

    .document-mode-chip {
      --mdc-chip-elevated-container-color: #eef7f6;
      --mdc-chip-label-text-color: #0f6f73;
      font-weight: 700;
    }

    .document-mode-chip.final {
      --mdc-chip-elevated-container-color: #ecfdf5;
      --mdc-chip-label-text-color: #047857;
    }

    .document-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: end;
    }

    .document-row p,
    .compact-list span,
    .budget-row span,
    .timeline-event p,
    .timeline-event time {
      color: var(--omnicare-muted);
      display: block;
      margin: 4px 0 0;
    }

    .metric-grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .metric-card span {
      color: var(--omnicare-muted);
      font-size: 0.82rem;
      font-weight: 700;
    }

    .metric-card strong {
      color: var(--omnicare-text);
      display: block;
      font-size: 1.45rem;
      margin-top: 8px;
    }

    .budget-row {
      display: grid;
      gap: 8px;
    }

    .compact-list > div {
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 10px;
    }

    .compact-list > div:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }

    .recommendation {
      align-items: start;
      background: #eef7f6;
      border-color: #cde8e6;
      color: var(--omnicare-secondary);
      display: flex;
      gap: 12px;
    }

    .recommendation p {
      margin: 4px 0 0;
    }

    .timeline-event {
      display: grid;
      gap: 12px;
      grid-template-columns: auto 1fr;
      position: relative;
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
      top: 78px;
    }

    .panel-title {
      align-items: center;
      display: flex;
      gap: 10px;
      justify-content: space-between;
      margin-bottom: 18px;
    }

    .panel-title h2 {
      margin: 0;
    }

    .field-label {
      color: var(--omnicare-muted);
      display: block;
      font-size: 0.78rem;
      font-weight: 800;
      margin: 14px 0 6px;
      text-transform: uppercase;
    }

    .amount-input,
    textarea {
      background: #fbfcfd;
      border: 1px solid #d8e1e4;
      border-radius: 10px;
      font: inherit;
      padding: 12px;
      width: 100%;
    }

    .amount-input:focus,
    textarea:focus {
      border-color: var(--omnicare-secondary);
      box-shadow: 0 0 0 3px rgba(15, 111, 115, 0.12);
      outline: none;
    }

    .link-button {
      justify-content: start;
      margin-top: 8px;
      padding-left: 0;
    }

    .coverage-box,
    .decision-lock {
      background: #fbfcfd;
      display: grid;
      gap: 6px;
      margin-top: 8px;
    }

    .coverage-box p,
    .decision-lock p {
      margin: 0;
    }

    .action-stack {
      margin-top: 16px;
    }

    .action-stack button,
    .rejection-box button {
      border-radius: 999px;
      font-weight: 800;
      min-height: 36px;
      width: 100%;
    }

    .rejection-box {
      margin-top: 14px;
    }

    .decision-lock {
      justify-items: start;
    }

    .decision-lock mat-icon {
      color: var(--omnicare-secondary);
    }

    .empty-inline,
    .error-card mat-card-content {
      align-items: center;
      color: var(--omnicare-muted);
      display: grid;
      justify-items: center;
      min-height: 260px;
      text-align: center;
    }

    .error-card {
      justify-self: center;
      max-width: 680px;
      width: 100%;
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

      .summary-strip {
        grid-template-columns: repeat(2, minmax(0, 1fr));
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
        grid-template-columns: 1fr;
      }

      .document-actions {
        justify-content: start;
      }

      .info-grid,
      .two-cols,
      .metric-grid,
      .summary-strip {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class DemandeDetailPlaceholderComponent implements OnDestroy, OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(DemandesFacade);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  private readonly comarBulletinPdf = inject(ComarBulletinPdfService);
  private lastComarBulletinUrl: string | null = null;

  protected readonly demandeSignal = signal<DemandeRemboursement | undefined>(undefined);
  protected readonly approvedAmount = signal(0);
  protected readonly internalNotes = signal('');
  protected readonly showCoverage = signal(false);
  protected readonly panelLocked = signal(false);
  protected readonly rejectionMode = signal(false);
  protected readonly rejectionTouched = signal(false);
  protected readonly rejectionReason = signal<RejectionReason | null>(null);

  protected readonly rejectionReasons: Array<{ value: RejectionReason; label: string }> = [
    { value: 'DOCUMENT_MANQUANT', label: 'Document manquant' },
    { value: 'ACTE_NON_COUVERT', label: 'Acte non couvert' },
    { value: 'DOUBLON', label: 'Doublon' },
    { value: 'PLAFOND_ATTEINT', label: 'Plafond atteint' },
    { value: 'AUTORISATION_MANQUANTE', label: 'Autorisation manquante' },
    { value: 'DELAI_DEPASSE', label: 'Délai dépassé' },
    { value: 'PRESTATAIRE_NON_AGREE', label: 'Prestataire non agréé' },
    { value: 'MONTANT_NON_CONFORME', label: 'Montant non conforme' },
    { value: 'FRAUDE_SUSPECTEE', label: 'Fraude suspectée' },
    { value: 'AUTRE', label: 'Autre' },
  ];

  private readonly companyId = signal('comar');
  private readonly adherents = signal<Adherent[]>([]);
  private readonly planTiers = signal<PlanTier[]>([]);
  private readonly contracts = signal<CorporateContract[]>([]);

  protected readonly adherent = computed(() => {
    const demande = this.demandeSignal();

    return demande
      ? this.adherents().find((item) => item.membershipId === demande.patientMemberId)
      : undefined;
  });
  protected readonly planTier = computed(() => {
    const demande = this.demandeSignal();

    return demande
      ? this.planTiers().find((plan) => plan.name === demande.planTierName)
      : undefined;
  });
  protected readonly contract = computed(() => {
    const demande = this.demandeSignal();

    return demande?.contractId
      ? this.contracts().find((contract) => contract.id === demande.contractId)
      : undefined;
  });
  protected readonly coverageRule = computed(() => {
    const demande = this.demandeSignal();

    return demande
      ? this.planTier()?.coverageRules.find((rule) => rule.actCategory === demande.actCategory)
      : undefined;
  });
  protected readonly calculatedCoverageRaw = computed(() => {
    const demande = this.demandeSignal();
    const rule = this.coverageRule();

    if (!demande || !rule) {
      return 0;
    }

    return demande.totalAmount * (rule.coveragePercent / 100);
  });
  protected readonly calculatedCoverageAmount = computed(() => {
    const rule = this.coverageRule();

    if (!rule?.maxAmountPerClaim) {
      return this.calculatedCoverageRaw();
    }

    return Math.min(this.calculatedCoverageRaw(), rule.maxAmountPerClaim);
  });
  protected readonly filingDeadline = computed(() => {
    const demande = this.demandeSignal();
    const plan = this.planTier();

    if (!demande || !plan) {
      return null;
    }

    const deadlineDate = new Date(demande.actDate);
    deadlineDate.setDate(deadlineDate.getDate() + plan.claimFilingDeadlineDays);
    const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / 86_400_000);
    const valid = daysLeft >= 0;

    return {
      valid,
      label: valid
        ? `Délai de dépôt respecté · ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}`
        : `Délai de dépôt dépassé de ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? 's' : ''}`,
    };
  });
  protected readonly budgetRows = computed(() => {
    const plan = this.planTier();
    const demande = this.demandeSignal();

    if (!plan || !demande) {
      return [];
    }

    const patientDemandes = this.patientPreviousDemandes();

    return plan.coverageRules
      .filter((rule) => rule.maxAmountPerYear || rule.maxAmountPerClaim)
      .slice(0, 7)
      .map((rule) => this.toBudgetRow(rule, patientDemandes));
  });
  protected readonly patientPreviousDemandes = computed(() => {
    const demande = this.demandeSignal();

    if (!demande) {
      return [];
    }

    return this.facade
      .allDemandes()
      .filter((item) => item.patientMemberId === demande.patientMemberId)
      .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())
      .slice(0, 5);
  });
  protected readonly previousFlagSummary = computed(() => {
    const flags = this.patientPreviousDemandes().flatMap((demande) => demande.flags);

    return [...new Set(flags)];
  });
  protected readonly employerClaims = computed(() => {
    const demande = this.demandeSignal();

    if (!demande?.employerName) {
      return { count: 0, total: 0 };
    }

    const year = new Date().getFullYear();
    const claims = this.facade
      .allDemandes()
      .filter(
        (item) =>
          item.employerName === demande.employerName &&
          new Date(item.submittedAt).getFullYear() === year,
      );

    return {
      count: claims.length,
      total: claims.reduce((total, item) => total + item.totalAmount, 0),
    };
  });
  protected readonly timeline = computed(() => {
    const demande = this.demandeSignal();

    if (!demande) {
      return [];
    }

    return this.buildTimeline(demande);
  });
  protected readonly isPanelLocked = computed(() => {
    const demande = this.demandeSignal();

    return this.panelLocked() || !!demande?.status && this.isTerminalStatus(demande.status);
  });
  protected readonly decisionSummary = computed(() => {
    const demande = this.demandeSignal();

    if (!demande) {
      return '';
    }

    if (demande.status === 'REFUSEE') {
      return `Refus : ${this.rejectionReasonLabel(demande.rejectionReason)}`;
    }

    if (this.isTerminalStatus(demande.status)) {
      return `Montant retenu : ${this.amountLabel(demande.approvedAmount ?? 0)}`;
    }

    return 'Documents complémentaires demandés.';
  });

  ngOnInit(): void {
    const companyId = this.routeCompanyId();
    const id = this.route.snapshot.paramMap.get('id') ?? '';

    this.companyId.set(companyId);
    this.facade.loadForCompany(companyId);
    this.adherents.set(this.readTenantData<Adherent>('adherents'));
    this.planTiers.set(this.readTenantData<PlanTier>('plan_tiers'));
    this.contracts.set(this.readTenantData<CorporateContract>('contracts'));

    const demande = this.facade.getById(id);

    if (!demande) {
      return;
    }

    if (demande.status === 'SOUMISE') {
      const updated = {
        ...demande,
        status: 'EN_EXAMEN' as const,
        lastUpdatedAt: new Date().toISOString(),
      };
      this.facade.updateDemande(updated);
      this.demandeSignal.set(updated);
    } else {
      this.demandeSignal.set(demande);
    }

    this.approvedAmount.set(this.demandeSignal()?.totalAmount ?? 0);
    this.internalNotes.set(this.demandeSignal()?.internalNotes ?? '');
  }

  ngOnDestroy(): void {
    this.revokeLastComarBulletinUrl();
  }

  protected goBack(): void {
    void this.router.navigate(['/assurance', this.companyId(), 'demandes']);
  }

  protected openPdf(document: RequestDocument, demande: DemandeRemboursement): void {
    this.dialog.open(MockPdfDialogComponent, {
      data: {
        docType: document.type,
        record: demande,
      },
      width: '860px',
    });
  }

  protected async previewComarBulletin(
    demande: DemandeRemboursement,
    mode: ComarBulletinPdfMode,
  ): Promise<void> {
    const previewWindow = window.open('about:blank', '_blank');

    if (previewWindow) {
      previewWindow.opener = null;
    }

    try {
      const result = await this.generateComarBulletin(demande, mode);

      if (previewWindow) {
        previewWindow.location.href = result.objectUrl;
      } else {
        this.snackBar.open('Autorisez les pop-ups pour prévisualiser le bulletin COMAR.', 'Fermer', {
          duration: 3500,
          horizontalPosition: 'end',
          verticalPosition: 'top',
          panelClass: 'notification-info',
        });
      }
    } catch (error) {
      previewWindow?.close();
      this.notifyPdfError(error);
    }
  }

  protected async downloadComarBulletin(
    demande: DemandeRemboursement,
    mode: ComarBulletinPdfMode,
  ): Promise<void> {
    try {
      const result = await this.generateComarBulletin(demande, mode);
      const anchor = document.createElement('a');

      anchor.href = result.objectUrl;
      anchor.download = this.comarBulletinPdf.filename(demande, mode);
      anchor.click();
    } catch (error) {
      this.notifyPdfError(error);
    }
  }

  protected requestDocument(document: RequestDocument): void {
    this.snackBar.open(`Demande envoyée (simulation) · ${document.label}`, 'Fermer', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: 'notification-info',
    });
  }

  protected setApprovedAmount(event: Event): void {
    this.approvedAmount.set(Number((event.target as HTMLInputElement).value || 0));
  }

  protected setInternalNotes(event: Event): void {
    this.internalNotes.set((event.target as HTMLTextAreaElement).value);
  }

  protected toggleCoverage(): void {
    this.showCoverage.update((value) => !value);
  }

  protected approve(status: 'APPROUVEE' | 'APPROUVEE_PARTIELLEMENT'): void {
    const demande = this.demandeSignal();

    if (!demande) {
      return;
    }

    this.saveDecision({
      ...demande,
      status,
      approvedAmount: this.approvedAmount(),
      internalNotes: this.internalNotes() || undefined,
      respondedAt: new Date().toISOString(),
      respondedBy: this.currentReviewerName(),
      lastUpdatedAt: new Date().toISOString(),
    });
  }

  protected requestMissingDocuments(): void {
    const demande = this.demandeSignal();

    if (!demande) {
      return;
    }

    this.saveDecision({
      ...demande,
      status: 'DOCUMENTS_INCOMPLETS',
      internalNotes: this.internalNotes() || undefined,
      lastUpdatedAt: new Date().toISOString(),
    });
    this.snackBar.open('Demande de documents envoyée (simulation)', 'Fermer', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: 'notification-info',
    });
  }

  protected showRejectionForm(): void {
    this.rejectionMode.set(true);
  }

  protected setRejectionReason(reason: RejectionReason): void {
    this.rejectionReason.set(reason);
  }

  protected confirmReject(): void {
    const demande = this.demandeSignal();

    this.rejectionTouched.set(true);

    if (!demande || !this.rejectionReason()) {
      return;
    }

    this.saveDecision({
      ...demande,
      status: 'REFUSEE',
      rejectionReason: this.rejectionReason() ?? undefined,
      rejectionNotes: this.internalNotes() || undefined,
      internalNotes: this.internalNotes() || undefined,
      respondedAt: new Date().toISOString(),
      respondedBy: this.currentReviewerName(),
      lastUpdatedAt: new Date().toISOString(),
    });
  }

  protected amountLabel(amount: number): string {
    return new Intl.NumberFormat('fr-TN', {
      currency: 'TND',
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(amount);
  }

  protected percentLabel(value: number): string {
    return `${new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 1 }).format(value)}%`;
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

  protected providerTypeLabel(providerType: DemandeRemboursement['providerType']): string {
    const labels: Record<DemandeRemboursement['providerType'], string> = {
      AUTRE: 'Autre',
      CLINIQUE: 'Clinique',
      INFIRMIER: 'Infirmier',
      KINE: 'Kinésithérapeute',
      MEDECIN: 'Médecin',
    };

    return labels[providerType];
  }

  protected flagLabel(flag: ClaimFlag): string {
    const labels: Record<ClaimFlag, string> = {
      AUTORISATION_MANQUANTE: 'Autorisation manquante',
      DELAI_SOUMISSION: 'Délai dépassé',
      DOCUMENTS_MANQUANTS: 'Documents manquants',
      DOUBLON_SUSPECT: 'Doublon suspect',
      MONTANT_ELEVE: 'Montant élevé',
      PRESTATAIRE_HORS_RESEAU: 'Hors réseau',
      SEUIL_REASSURANCE: 'Seuil réassurance',
    };

    return labels[flag];
  }

  protected daysUntil(isoDate: string): number {
    return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000));
  }

  protected renewalRecommendation(contract: CorporateContract): string {
    if (contract.claimsRatio >= 0.8) {
      return 'Renouvellement sous conditions : revoir les plafonds et les exclusions avant proposition.';
    }

    if (contract.claimsRatio >= 0.5) {
      return 'Renouvellement à surveiller : proposer un ajustement tarifaire modéré.';
    }

    if (contract.status === 'EXPIRATION_PROCHE') {
      return 'Renouvellement recommandé : préparer l’offre et contacter les RH cette semaine.';
    }

    return 'Contrat sain : maintenir les conditions actuelles et suivre le ratio mensuellement.';
  }

  private saveDecision(updated: DemandeRemboursement): void {
    this.facade.updateDemande(updated);
    this.demandeSignal.set(updated);
    this.panelLocked.set(true);
    this.rejectionMode.set(false);
  }

  protected isApprovedStatus(status: DemandeStatus): boolean {
    return ['APPROUVEE', 'APPROUVEE_PARTIELLEMENT', 'APPROUVEE_AUTO'].includes(status);
  }

  private async generateComarBulletin(
    demande: DemandeRemboursement,
    mode: ComarBulletinPdfMode,
  ) {
    const result = await this.comarBulletinPdf.generateComarBulletinPdf(demande, mode);

    this.revokeLastComarBulletinUrl();
    this.lastComarBulletinUrl = result.objectUrl;

    return result;
  }

  private revokeLastComarBulletinUrl(): void {
    if (this.lastComarBulletinUrl) {
      URL.revokeObjectURL(this.lastComarBulletinUrl);
      this.lastComarBulletinUrl = null;
    }
  }

  private notifyPdfError(error: unknown): void {
    console.error(error);
    this.snackBar.open('Le bulletin COMAR n’a pas pu être généré.', 'Fermer', {
      duration: 3500,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: 'notification-error',
    });
  }

  private currentReviewerName(): string {
    return this.auth.currentUser()?.name ?? 'Ahmed Direche';
  }

  private toBudgetRow(rule: CoverageRule, demandes: DemandeRemboursement[]): BudgetRow {
    const max = rule.maxAmountPerYear ?? rule.maxAmountPerClaim ?? 1;
    const used = demandes
      .filter((demande) => demande.actCategory === rule.actCategory)
      .reduce((total, demande) => total + (demande.approvedAmount ?? 0), 0);

    return {
      category: rule.actCategory,
      label: this.actCategoryLabel(rule.actCategory),
      used,
      max,
      progress: Math.min(100, Math.round((used / max) * 100)),
    };
  }

  private buildTimeline(demande: DemandeRemboursement): TimelineEvent[] {
    const submittedAt = new Date(demande.submittedAt);
    const inReviewAt = new Date(submittedAt.getTime() + 6 * 3_600_000);
    const documentAt = new Date(submittedAt.getTime() + 18 * 3_600_000);
    const currentAt = new Date(demande.respondedAt ?? demande.lastUpdatedAt);
    const events: TimelineEvent[] = [
      {
        id: 'submitted',
        title: 'Demande soumise',
        description: `Canal ${demande.source}`,
        date: submittedAt.toISOString(),
        tone: 'info',
      },
      {
        id: 'review',
        title: 'Passage en examen',
        description: 'Contrôle administratif initial lancé.',
        date: inReviewAt.toISOString(),
        tone: 'warning',
      },
    ];

    if (demande.status === 'DOCUMENTS_INCOMPLETS') {
      events.push({
        id: 'documents',
        title: 'Documents demandés',
        description: 'Pièces complémentaires requises avant décision.',
        date: documentAt.toISOString(),
        tone: 'warning',
      });
    }

    if (this.isTerminalStatus(demande.status)) {
      events.push({
        id: 'decision',
        title: this.statusLabel(demande.status),
        description:
          demande.status === 'REFUSEE'
            ? this.rejectionReasonLabel(demande.rejectionReason)
            : `Montant validé : ${this.amountLabel(demande.approvedAmount ?? 0)}`,
        date: currentAt.toISOString(),
        tone: demande.status === 'REFUSEE' ? 'error' : 'success',
      });
    } else if (demande.status === 'EN_EXAMEN') {
      events.push({
        id: 'current',
        title: 'Examen en cours',
        description: 'Dossier en attente de décision.',
        date: currentAt.toISOString(),
        tone: 'info',
      });
    }

    return events;
  }

  private isTerminalStatus(status: DemandeStatus): boolean {
    return ['APPROUVEE', 'APPROUVEE_PARTIELLEMENT', 'APPROUVEE_AUTO', 'REFUSEE'].includes(status);
  }

  private statusLabel(status: DemandeStatus): string {
    const labels: Record<DemandeStatus, string> = {
      APPROUVEE: 'Demande approuvée',
      APPROUVEE_AUTO: 'Demande auto-approuvée',
      APPROUVEE_PARTIELLEMENT: 'Approbation partielle',
      DOCUMENTS_INCOMPLETS: 'Documents incomplets',
      EN_EXAMEN: 'En examen',
      REFUSEE: 'Demande refusée',
      SOUMISE: 'Demande soumise',
    };

    return labels[status];
  }

  private rejectionReasonLabel(reason?: RejectionReason): string {
    return this.rejectionReasons.find((item) => item.value === reason)?.label ?? 'Motif non renseigné';
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

  private readTenantData<T>(resource: 'adherents' | 'contracts' | 'plan_tiers'): T[] {
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
