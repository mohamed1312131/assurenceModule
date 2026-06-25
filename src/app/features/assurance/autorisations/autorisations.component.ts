import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import { AutorisationPrealable } from '../../../models/autorisation-prealable.model';
import { ActCategory } from '../../../models/shared.model';
import { SourceBadgeComponent } from '../../../shared/source-badge/source-badge.component';
import { StatusChipComponent, StatusChipTone } from '../../../shared/status-chip/status-chip.component';
import { AutorisationsFacade } from './autorisations.facade';
import { AutorisationsFilterBarComponent } from './autorisations-filter-bar.component';

@Component({
  selector: 'app-autorisations',
  imports: [
    AutorisationsFilterBarComponent,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    SourceBadgeComponent,
    StatusChipComponent,
  ],
  template: `
    <section class="autorisations-page">
      <section class="autorisations-shell" aria-label="File des autorisations préalables">
        <header class="page-header">
          <div>
            <h1>Autorisations préalables</h1>
            <p>
              {{ stats().total }} autorisations · {{ stats().waiting }} en attente · {{ stats().month }} ce mois
            </p>
          </div>
        </header>

        <app-autorisations-filter-bar />

        <section class="queue-table" aria-label="Résultats des autorisations">
          <header class="results-header">
            <div>
              <strong>{{ filtered().length }} résultats</strong>
              <span>File d'autorisations COMAR</span>
            </div>
            <span class="sort-pill">
              <mat-icon aria-hidden="true">sort</mat-icon>
              Tri : statut, urgence ↑
            </span>
          </header>

          @if (filtered().length === 0) {
            <section class="empty-state">
              @if (activeFilterCount() > 0) {
                <mat-icon aria-hidden="true">filter_list_off</mat-icon>
                <h2>Aucun résultat pour ces filtres</h2>
                <p>Modifiez la recherche ou réinitialisez les filtres actifs.</p>
                <button mat-button color="primary" type="button" (click)="resetFilters()">
                  Réinitialiser les filtres
                </button>
              } @else {
                <mat-icon aria-hidden="true">inbox</mat-icon>
                <h2>Aucune autorisation pour le moment</h2>
                <p>Les nouvelles autorisations apparaîtront dans cette file.</p>
              }
            </section>
          } @else {
            <div class="queue-columns" aria-hidden="true">
              <span>Priorité</span>
              <span>Dossier</span>
              <span>Acte & prestataire</span>
              <span>Délai</span>
              <span>Action</span>
            </div>

            <section class="auth-list" aria-label="Liste des autorisations">
              @for (autorisation of filtered(); track autorisation.id) {
                <article
                  class="auth-row"
                  [class.accent-danger]="rowAccent(autorisation) === 'danger'"
                  [class.accent-warning]="rowAccent(autorisation) === 'warning'"
                  [class.accent-info]="rowAccent(autorisation) === 'info'"
                  [class.accent-success]="rowAccent(autorisation) === 'success'"
                >
                  <div class="priority-cell">
                    <app-status-chip
                      [status]="autorisation.status"
                      [label]="statusLabel(autorisation.status)"
                      [tone]="statusTone(autorisation.status)"
                    />
                    <app-source-badge [source]="autorisation.source" />
                  </div>

                  <div class="dossier-cell">
                    <h2>{{ autorisation.patientName }}</h2>
                    <p>{{ autorisation.planTierName }} · {{ authorizationReference(autorisation) }}</p>
                    <span>{{ autorisation.patientMemberId }}</span>
                  </div>

                  <div class="act-cell">
                    <h3>{{ autorisation.actType }}</h3>
                    <p>{{ actCategoryLabel(autorisation.actCategory) }}</p>
                    @if (autorisation.providerName) {
                      <span>{{ autorisation.providerName }}</span>
                    }
                    <span class="network-badge" [class.out]="!autorisation.providerInNetwork">
                      {{ autorisation.providerInNetwork ? 'Réseau agréé' : 'Hors réseau' }}
                    </span>
                  </div>

                  <div class="delay-cell">
                    <mat-chip
                      class="countdown-chip"
                      [class.safe]="countdownTone(autorisation) === 'safe'"
                      [class.warning]="countdownTone(autorisation) === 'warning'"
                      [class.danger]="countdownTone(autorisation) === 'danger'"
                      [class.expired]="countdownTone(autorisation) === 'expired'"
                    >
                      {{ countdownLabel(autorisation) }}
                    </mat-chip>
                    <span>Déposé le {{ formatDate(autorisation.submittedAt) }}</span>
                  </div>

                  <div class="action-cell">
                    <button mat-button color="primary" type="button" (click)="openDetail(autorisation.id)">
                      Ouvrir
                      <mat-icon aria-hidden="true">arrow_forward</mat-icon>
                    </button>
                  </div>
                </article>
              }
            </section>
          }
        </section>
      </section>
    </section>
  `,
  styles: `
    .autorisations-page {
      display: block;
    }

    .autorisations-shell {
      background: #ffffff;
      border: 1px solid rgba(15, 111, 115, 0.1);
      border-radius: 26px;
      display: grid;
      gap: 14px;
      padding: 20px;
    }

    .page-header {
      align-items: center;
      display: flex;
      gap: 18px;
      justify-content: space-between;
    }

    h1,
    h2,
    p {
      letter-spacing: 0;
    }

    h1 {
      color: var(--omnicare-text);
      font-size: 1.68rem;
      font-weight: 800;
      line-height: 1.12;
      margin: 0 0 5px;
    }

    .page-header p,
    .results-header span,
    .dossier-cell p,
    .dossier-cell span,
    .act-cell p,
    .act-cell span,
    .delay-cell span {
      color: var(--omnicare-muted);
      margin: 0;
    }

    .page-header p {
      font-size: 0.88rem;
    }

    .queue-table {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      overflow: hidden;
    }

    .results-header {
      align-items: center;
      background: #fbfcfd;
      border-bottom: 1px solid #e5e7eb;
      color: var(--omnicare-muted);
      display: flex;
      gap: 12px;
      justify-content: space-between;
      padding: 12px 14px;
    }

    .results-header div {
      display: grid;
      gap: 2px;
    }

    .results-header strong {
      color: var(--omnicare-text);
      font-size: 0.92rem;
    }

    .results-header span {
      font-size: 0.76rem;
    }

    .sort-pill {
      align-items: center;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 999px;
      color: var(--omnicare-muted);
      display: inline-flex;
      font-size: 0.76rem;
      font-weight: 800;
      gap: 7px;
      min-height: 30px;
      padding: 5px 10px;
      white-space: nowrap;
    }

    .sort-pill mat-icon {
      color: var(--omnicare-secondary);
      font-size: 17px;
      height: 17px;
      width: 17px;
    }

    .queue-columns {
      align-items: center;
      background: #f8fafc;
      border-bottom: 1px solid #e5e7eb;
      color: var(--omnicare-muted);
      display: grid;
      font-size: 0.72rem;
      font-weight: 800;
      gap: 14px;
      grid-template-columns: minmax(210px, 0.76fr) minmax(260px, 1fr) minmax(240px, 0.9fr) minmax(150px, 0.55fr) 78px;
      letter-spacing: 0.04em;
      padding: 9px 14px;
      text-transform: uppercase;
    }

    .queue-columns span:last-child {
      text-align: right;
    }

    .auth-list {
      display: grid;
    }

    .auth-row {
      align-items: center;
      background: #ffffff;
      border-left: 3px solid #94a3b8;
      border-top: 1px solid #eef2f4;
      display: grid;
      gap: 14px;
      grid-template-columns: minmax(210px, 0.76fr) minmax(260px, 1fr) minmax(240px, 0.9fr) minmax(150px, 0.55fr) 78px;
      min-height: 54px;
      padding: 9px 14px 9px 11px;
      transition: background 160ms ease;
    }

    .auth-row:first-child {
      border-top: 0;
    }

    .auth-row:hover {
      background: #fbfcfd;
      box-shadow: inset 0 0 0 1px #e5e7eb;
    }

    .auth-row.accent-danger {
      border-left-color: #b91c1c;
    }

    .auth-row.accent-warning {
      border-left-color: #b45309;
    }

    .auth-row.accent-info {
      border-left-color: #1d4ed8;
    }

    .auth-row.accent-success {
      border-left-color: #047857;
    }

    .priority-cell,
    .delay-cell {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      min-width: 0;
    }

    .dossier-cell,
    .act-cell {
      display: grid;
      gap: 3px;
      min-width: 0;
    }

    h2,
    h3 {
      color: var(--omnicare-text);
      font-size: 0.82rem;
      font-weight: 800;
      line-height: 1.22;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    h3 {
      font-size: 0.82rem;
    }

    .dossier-cell p,
    .act-cell p,
    .dossier-cell span,
    .act-cell span,
    .delay-cell span {
      font-size: 0.72rem;
      line-height: 1.28;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .network-badge {
      background: #ecfdf5;
      border: 1px solid #bbf7d0;
      border-radius: 999px;
      color: #047857 !important;
      display: inline-flex;
      font-size: 0.62rem !important;
      font-weight: 700;
      justify-self: start;
      margin-top: 2px;
      padding: 3px 7px;
      white-space: nowrap;
      width: max-content;
    }

    .network-badge.out {
      background: #fef2f2;
      border-color: #fecaca;
      color: #b91c1c !important;
    }

    .countdown-chip.safe {
      --countdown-bg: #f8fafc;
      --countdown-border: #dbe3e7;
      --countdown-text: #334155;
    }

    .countdown-chip.warning {
      --countdown-bg: #fffbeb;
      --countdown-border: #fde68a;
      --countdown-text: #b45309;
    }

    .countdown-chip.danger {
      --countdown-bg: #fef2f2;
      --countdown-border: #fecaca;
      --countdown-text: #b91c1c;
    }

    .countdown-chip.expired {
      --countdown-bg: #fef2f2;
      --countdown-border: #fecaca;
      --countdown-text: #7f1d1d;
    }

    .countdown-chip {
      --countdown-bg: #f8fafc;
      --countdown-border: #dbe3e7;
      --countdown-text: #334155;
      --mdc-chip-elevated-container-color: var(--countdown-bg);
      --mdc-chip-unselected-container-color: var(--countdown-bg);
      --mdc-chip-label-text-color: var(--countdown-text);
      background: var(--countdown-bg);
      border: 1px solid var(--countdown-border);
      border-radius: 999px;
      color: var(--countdown-text);
      font-size: 0.72rem;
      font-weight: 800;
      min-height: 24px;
      overflow: hidden;
    }

    :host ::ng-deep .countdown-chip .mdc-evolution-chip__text-label,
    :host ::ng-deep .countdown-chip .mdc-evolution-chip__action--primary {
      background: inherit !important;
      color: var(--countdown-text) !important;
    }

    :host ::ng-deep .priority-cell .status-chip,
    :host ::ng-deep .priority-cell .source-badge {
      min-height: 24px;
    }

    .action-cell {
      display: flex;
      justify-content: flex-end;
    }

    .action-cell button {
      font-size: 0.8rem;
      font-weight: 800;
      min-height: 34px;
      padding: 0 8px;
    }

    .action-cell mat-icon {
      font-size: 18px;
      height: 18px;
      width: 18px;
    }

    .empty-state {
      align-items: center;
      color: var(--omnicare-muted);
      display: grid;
      gap: 9px;
      justify-items: center;
      min-height: 250px;
      padding: 32px;
      text-align: center;
    }

    .empty-state mat-icon {
      color: #94a3b8;
      font-size: 64px;
      height: 64px;
      width: 64px;
    }

    .empty-state h2 {
      color: var(--omnicare-text);
      font-size: 1.08rem;
      margin: 0;
    }

    .empty-state p {
      color: var(--omnicare-muted);
      margin: 0;
    }

    @media (max-width: 1180px) {
      .queue-columns {
        display: none;
      }

      .auth-row {
        align-items: start;
        grid-template-columns: minmax(190px, 0.9fr) minmax(260px, 1fr) minmax(110px, auto);
      }

      .act-cell,
      .delay-cell {
        grid-column: 2;
      }

      .action-cell {
        grid-column: 3;
        grid-row: 1 / span 2;
      }
    }

    @media (max-width: 760px) {
      .autorisations-shell {
        border-radius: 20px;
        padding: 16px;
      }

      .page-header,
      .results-header {
        align-items: start;
        flex-direction: column;
      }

      .auth-row {
        grid-template-columns: 1fr;
        padding: 12px;
      }

      .delay-cell,
      .action-cell {
        grid-column: auto;
        grid-row: auto;
      }

      .action-cell {
        justify-content: flex-start;
      }
    }
  `,
})
export class AutorisationsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly facade = inject(AutorisationsFacade);
  protected readonly companyId = signal(this.routeCompanyId());
  protected readonly filtered = this.facade.filtered;
  protected readonly nearExpiry = this.facade.nearExpiry;
  protected readonly activeFilterCount = this.facade.activeFilterCount;
  protected readonly stats = computed(() => {
    const autorisations = this.facade.allAutorisations();
    const currentMonth = new Date().toISOString().slice(0, 7);

    return {
      total: autorisations.length,
      waiting: autorisations.filter((item) => item.status === 'EN_ATTENTE').length,
      month: autorisations.filter(
        (item) => item.submittedAt.startsWith(currentMonth) && item.status !== 'APPROUVEE_AUTO',
      ).length,
    };
  });

  ngOnInit(): void {
    this.facade.loadForCompany(this.companyId());
  }

  protected openDetail(id: string): void {
    void this.router.navigate(['/assurance', this.companyId(), 'autorisations', id]);
  }

  protected resetFilters(): void {
    this.facade.resetFilters();
  }

  protected authorizationReference(autorisation: AutorisationPrealable): string {
    return autorisation.authorizationNumber ?? autorisation.id;
  }

  protected formatDate(isoDate: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(isoDate));
  }

  protected countdownLabel(autorisation: AutorisationPrealable): string {
    const days = this.daysUntil(autorisation.expiresAt);

    if (days < 0) {
      return 'Expiré';
    }

    return `J-${days}`;
  }

  protected countdownTone(autorisation: AutorisationPrealable): 'safe' | 'warning' | 'danger' | 'expired' {
    const days = this.daysUntil(autorisation.expiresAt);

    if (days < 0) {
      return 'expired';
    }

    if (days <= 1) {
      return 'danger';
    }

    if (days <= 3) {
      return 'warning';
    }

    return 'safe';
  }

  protected rowAccent(autorisation: AutorisationPrealable): 'danger' | 'warning' | 'info' | 'success' {
    const countdownTone = this.countdownTone(autorisation);

    if (autorisation.status === 'REFUSEE' || countdownTone === 'danger' || countdownTone === 'expired') {
      return 'danger';
    }

    if (autorisation.status === 'EN_ATTENTE' || countdownTone === 'warning') {
      return 'warning';
    }

    if (autorisation.status === 'EN_EXAMEN') {
      return 'info';
    }

    return 'success';
  }

  protected statusLabel(status: AutorisationPrealable['status']): string {
    const labels: Record<AutorisationPrealable['status'], string> = {
      EN_ATTENTE: 'En attente',
      EN_EXAMEN: 'En examen',
      APPROUVEE: 'Approuvée',
      APPROUVEE_AUTO: 'Auto-approuvée',
      REFUSEE: 'Refusée',
    };

    return labels[status];
  }

  protected statusTone(status: AutorisationPrealable['status']): StatusChipTone {
    const tones: Record<AutorisationPrealable['status'], StatusChipTone> = {
      EN_ATTENTE: 'warning',
      EN_EXAMEN: 'info',
      APPROUVEE: 'success',
      APPROUVEE_AUTO: 'success',
      REFUSEE: 'error',
    };

    return tones[status];
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

  private daysUntil(isoDate: string): number {
    return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000);
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
