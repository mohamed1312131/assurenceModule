import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';

import { Adherent } from '../../../models/adherent.model';
import { AutorisationPrealable } from '../../../models/autorisation-prealable.model';
import {
  ClaimFlag,
  DemandeRemboursement,
} from '../../../models/demande-remboursement.model';
import { PlanTier } from '../../../models/plan-tier.model';
import { ActCategory } from '../../../models/shared.model';
import { SourceBadgeComponent } from '../../../shared/source-badge/source-badge.component';
import { StatusChipComponent } from '../../../shared/status-chip/status-chip.component';

interface BudgetRow {
  category: ActCategory;
  label: string;
  used: number;
  max: number;
  percent: number;
  remaining: number;
}

@Component({
  selector: 'app-adherent-detail-drawer',
  imports: [
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
    MatSidenavModule,
    SourceBadgeComponent,
    StatusChipComponent,
  ],
  template: `
    @if (adherent()) {
      <mat-drawer-container class="drawer-shell" hasBackdrop (backdropClick)="close()">
        <mat-drawer
          class="member-drawer"
          mode="over"
          position="end"
          [opened]="true"
          [autoFocus]="false"
          (closedStart)="close()"
        >
          <header class="drawer-header">
            <div>
              <p>Fiche adhérent</p>
              <h2>{{ adherent()?.patientName }}</h2>
            </div>
            <button mat-icon-button type="button" aria-label="Fermer" (click)="close()">
              <mat-icon aria-hidden="true">close</mat-icon>
            </button>
          </header>

          <section class="info-card">
            <div class="info-grid">
              <span>Matricule</span>
              <strong>{{ adherent()?.membershipId }}</strong>
              <span>Police</span>
              <strong>{{ adherent()?.policyNumber }}</strong>
              <span>Plan</span>
              <strong>{{ adherent()?.planTierName }}</strong>
              <span>Type</span>
              <strong>{{ enrollmentLabel(adherent()?.enrollmentType) }}</strong>
              <span>Employeur</span>
              <strong>{{ adherent()?.employer?.employerName ?? 'Individuel' }}</strong>
            </div>

            <div class="badge-row">
              <app-status-chip [status]="adherent()?.verificationStatus ?? 'EN_ATTENTE'" />
              <app-source-badge [source]="adherent()?.source ?? 'AUTRE'" />
            </div>
          </section>

          <section class="drawer-section">
            <h3>Budget annuel par acte</h3>
            @if (budgetRows().length === 0) {
              <p class="muted">Aucune règle de couverture disponible.</p>
            } @else {
              <div class="budget-list">
                @for (row of budgetRows(); track row.category) {
                  <article class="budget-row">
                    <div>
                      <strong>{{ row.label }}</strong>
                      <span>{{ row.percent }} % utilisé · {{ formatCurrency(row.remaining) }} restant</span>
                    </div>
                    <mat-progress-bar mode="determinate" [value]="row.percent" />
                  </article>
                }
              </div>
            }
          </section>

          <section class="drawer-section">
            <h3>Demandes récentes</h3>
            @if (recentClaims().length === 0) {
              <p class="muted">Aucune demande récente.</p>
            } @else {
              <div class="compact-list">
                @for (demande of recentClaims(); track demande.id) {
                  <article class="compact-row">
                    <div>
                      <span>{{ formatDate(demande.submittedAt) }}</span>
                      <strong>{{ actLabel(demande.actCategory) }} · {{ formatCurrency(demande.totalAmount) }}</strong>
                    </div>
                    <app-status-chip [status]="demande.status" />
                  </article>
                }
              </div>
            }
          </section>

          <section class="drawer-section">
            <h3>Autorisations préalables</h3>
            @if (priorAuths().length === 0) {
              <p class="muted">Aucun historique d’autorisation.</p>
            } @else {
              <div class="compact-list">
                @for (autorisation of priorAuths(); track autorisation.id) {
                  <article class="compact-row">
                    <div>
                      <span>{{ formatDate(autorisation.submittedAt) }}</span>
                      <strong>{{ autorisation.actType }}</strong>
                    </div>
                    <app-status-chip [status]="autorisation.status" />
                  </article>
                }
              </div>
            }
          </section>

          <section class="drawer-section">
            <h3>Historique des drapeaux</h3>
            @if (flagEntries().length === 0) {
              <p class="muted">Aucun drapeau sur cet adhérent.</p>
            } @else {
              <mat-chip-set aria-label="Drapeaux">
                @for (flag of flagEntries(); track flag.key) {
                  <mat-chip>{{ flagLabel(flag.key) }} · {{ flag.count }}</mat-chip>
                }
              </mat-chip-set>
            }
          </section>
        </mat-drawer>
      </mat-drawer-container>
    }
  `,
  styles: `
    .drawer-shell {
      background: rgba(15, 23, 42, 0.28);
      inset: 0;
      position: fixed;
      z-index: 1000;
    }

    .member-drawer {
      background: #ffffff;
      border-left: 1px solid #e5e7eb;
      max-width: min(480px, 100vw);
      padding: 0;
      width: 480px;
    }

    .drawer-header {
      align-items: center;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      padding: 22px 24px;
    }

    .drawer-header p {
      color: var(--omnicare-muted);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      margin: 0 0 6px;
      text-transform: uppercase;
    }

    .drawer-header h2 {
      color: var(--omnicare-text);
      font-size: 1.35rem;
      margin: 0;
    }

    .info-card,
    .drawer-section {
      border-bottom: 1px solid #e5e7eb;
      padding: 22px 24px;
    }

    .info-grid {
      display: grid;
      gap: 10px 16px;
      grid-template-columns: 120px 1fr;
    }

    .info-grid span,
    .muted,
    .compact-row span,
    .budget-row span {
      color: var(--omnicare-muted);
    }

    .info-grid strong,
    .compact-row strong,
    .budget-row strong {
      color: var(--omnicare-text);
      font-weight: 700;
    }

    .badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 18px;
    }

    h3 {
      color: var(--omnicare-text);
      font-size: 1rem;
      font-weight: 700;
      margin: 0 0 14px;
    }

    .budget-list,
    .compact-list {
      display: grid;
      gap: 12px;
    }

    .budget-row,
    .compact-row {
      display: grid;
      gap: 8px;
    }

    .compact-row {
      align-items: center;
      border: 1px solid #edf2f7;
      border-radius: 14px;
      grid-template-columns: 1fr auto;
      padding: 12px;
    }

    .compact-row div,
    .budget-row div {
      display: grid;
      gap: 4px;
    }
  `,
})
export class AdherentDetailDrawerComponent {
  readonly companyId = input.required<string>();
  readonly adherent = input<Adherent | null>(null);
  readonly drawerClosed = output<void>();

  protected readonly planTier = computed(() =>
    this.readPlanTiers().find((plan) => plan.id === this.adherent()?.planTierId),
  );

  protected readonly patientClaims = computed(() =>
    this.readDemandes()
      .filter((demande) => demande.patientMemberId === this.adherent()?.membershipId)
      .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime()),
  );

  protected readonly recentClaims = computed(() => this.patientClaims().slice(0, 5));

  protected readonly priorAuths = computed(() =>
    this.readAutorisations()
      .filter((autorisation) => autorisation.patientMemberId === this.adherent()?.membershipId)
      .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())
      .slice(0, 3),
  );

  protected readonly budgetRows = computed<BudgetRow[]>(() => {
    const adherent = this.adherent();
    const plan = this.planTier();

    if (!adherent || !plan) {
      return [];
    }

    return plan.coverageRules
      .filter((rule) => !!rule.maxAmountPerYear)
      .map((rule) => {
        const max = rule.maxAmountPerYear ?? 0;
        const used = Math.min(adherent.totalReimbursedThisYear, max);
        const percent = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;

        return {
          category: rule.actCategory,
          label: this.actLabel(rule.actCategory),
          used,
          max,
          percent,
          remaining: Math.max(0, max - used),
        };
      });
  });

  protected readonly flagEntries = computed(() => {
    const counts = new Map<ClaimFlag, number>();

    for (const demande of this.patientClaims()) {
      for (const flag of demande.flags) {
        counts.set(flag, (counts.get(flag) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries()).map(([key, count]) => ({ key, count }));
  });

  protected close(): void {
    this.drawerClosed.emit();
  }

  protected enrollmentLabel(type: Adherent['enrollmentType'] | undefined): string {
    return type === 'GROUPE' ? 'Groupe' : 'Individuel';
  }

  protected actLabel(category: ActCategory): string {
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

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      maximumFractionDigits: 0,
      style: 'currency',
      currency: 'TND',
    }).format(value);
  }

  protected formatDate(isoDate: string): string {
    return new Intl.DateTimeFormat('fr-TN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(isoDate));
  }

  private readPlanTiers(): PlanTier[] {
    return this.readJson<PlanTier[]>(`omnicare_ins_${this.companyId()}_plan_tiers`, []);
  }

  private readDemandes(): DemandeRemboursement[] {
    return this.readJson<DemandeRemboursement[]>(`omnicare_ins_${this.companyId()}_demandes`, []);
  }

  private readAutorisations(): AutorisationPrealable[] {
    return this.readJson<AutorisationPrealable[]>(
      `omnicare_ins_${this.companyId()}_autorisations`,
      [],
    );
  }

  private readJson<T>(key: string, fallback: T): T {
    if (typeof localStorage === 'undefined') {
      return fallback;
    }

    const raw = localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
}
