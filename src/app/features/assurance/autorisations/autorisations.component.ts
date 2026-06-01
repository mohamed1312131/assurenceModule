import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

import { AutorisationPrealable } from '../../../models/autorisation-prealable.model';
import { ActCategory } from '../../../models/shared.model';
import { SourceBadgeComponent } from '../../../shared/source-badge/source-badge.component';
import { StatusChipComponent } from '../../../shared/status-chip/status-chip.component';
import { AlertBannerComponent } from '../../../shared/alert-banner/alert-banner.component';
import { AutorisationsFacade } from './autorisations.facade';
import { AutorisationsFilterBarComponent } from './autorisations-filter-bar.component';

@Component({
  selector: 'app-autorisations',
  imports: [
    AutorisationsFilterBarComponent,
    AlertBannerComponent,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    SourceBadgeComponent,
    StatusChipComponent,
  ],
  template: `
    <section class="autorisations-page">
      <header class="page-header">
        <div>
          <h1>Autorisations préalables</h1>
          <p>{{ stats().total }} autorisations · {{ stats().open }} en attente · {{ stats().month }} ce mois</p>
        </div>
      </header>

      @if (nearExpiry().length > 0) {
        <app-alert-banner
          tone="error"
          icon="warning"
          [message]="nearExpiry().length + ' autorisation(s) expirent dans moins de 3 jours — décision requise.'"
        />
      }

      <app-autorisations-filter-bar />

      <section class="results-header">
        <strong>{{ filtered().length }} résultats</strong>
        <span>Tri : statut, urgence ↑</span>
      </section>

      @if (filtered().length === 0) {
        <section class="empty-state">
          <mat-icon aria-hidden="true">inbox</mat-icon>
          <h2>Aucune autorisation trouvée</h2>
        </section>
      } @else {
        <section class="auth-list" aria-label="Liste des autorisations">
          @for (autorisation of filtered(); track autorisation.id) {
            <mat-card class="auth-card" appearance="outlined">
              <mat-card-content>
                <div class="auth-top">
                  <div class="chip-row">
                    <app-status-chip [status]="autorisation.status" />
                    <app-source-badge [source]="autorisation.source" />
                    <mat-chip
                      class="countdown-chip"
                      [class.safe]="countdownTone(autorisation) === 'safe'"
                      [class.warning]="countdownTone(autorisation) === 'warning'"
                      [class.danger]="countdownTone(autorisation) === 'danger'"
                      [class.expired]="countdownTone(autorisation) === 'expired'"
                    >
                      {{ countdownLabel(autorisation) }}
                    </mat-chip>
                  </div>

                  <button mat-button type="button" (click)="openDetail(autorisation.id)">
                    Ouvrir
                    <mat-icon aria-hidden="true">arrow_forward</mat-icon>
                  </button>
                </div>

                <div class="auth-main">
                  <div>
                    <h2>{{ autorisation.patientName }}</h2>
                    <p>{{ autorisation.planTierName }} · {{ autorisation.patientMemberId }}</p>
                    <p>{{ autorisation.actType }} · {{ actCategoryLabel(autorisation.actCategory) }}</p>
                    @if (autorisation.providerName) {
                      <p>{{ autorisation.providerName }}</p>
                    }
                  </div>

                  <div class="network-badge" [class.out]="!autorisation.providerInNetwork">
                    {{ autorisation.providerInNetwork ? 'Réseau agréé' : 'Hors réseau' }}
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </section>
      }
    </section>
  `,
  styles: `
    .autorisations-page {
      display: grid;
      gap: 22px;
    }

    .page-header {
      align-items: end;
      display: flex;
      justify-content: space-between;
    }

    h1,
    h2,
    p {
      letter-spacing: 0;
    }

    h1 {
      color: var(--omnicare-text);
      font-size: 2rem;
      margin: 0 0 8px;
    }

    .page-header p,
    .results-header span,
    .auth-main p {
      color: var(--omnicare-muted);
      margin: 0;
    }

    .alert-banner {
      align-items: center;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 16px;
      color: #b91c1c;
      display: flex;
      font-weight: 800;
      gap: 10px;
      padding: 14px 16px;
    }

    .results-header {
      align-items: center;
      display: flex;
      justify-content: space-between;
    }

    .results-header strong {
      color: var(--omnicare-text);
    }

    .auth-list {
      display: grid;
      gap: 14px;
    }

    .auth-card {
      background: #ffffff;
      border-color: rgba(15, 111, 115, 0.12);
      border-radius: 16px;
      transition:
        box-shadow 180ms ease,
        transform 180ms ease;
    }

    .auth-card:hover {
      box-shadow: 0 14px 30px rgba(15, 111, 115, 0.1);
      transform: translateY(-2px);
    }

    .auth-top,
    .auth-main,
    .chip-row {
      align-items: center;
      display: flex;
      gap: 12px;
      justify-content: space-between;
    }

    .chip-row {
      flex-wrap: wrap;
      justify-content: start;
    }

    .auth-main {
      align-items: end;
      margin-top: 16px;
    }

    h2 {
      color: var(--omnicare-text);
      font-size: 1.15rem;
      margin: 0 0 6px;
    }

    .network-badge {
      background: #ecfdf5;
      border: 1px solid #bbf7d0;
      border-radius: 999px;
      color: #047857;
      font-size: 0.8rem;
      font-weight: 800;
      padding: 7px 10px;
      white-space: nowrap;
    }

    .network-badge.out {
      background: #fef2f2;
      border-color: #fecaca;
      color: #b91c1c;
    }

    .countdown-chip.safe {
      --mdc-chip-elevated-container-color: #ecfdf5;
      --mdc-chip-label-text-color: #047857;
    }

    .countdown-chip.warning {
      --mdc-chip-elevated-container-color: #fffbeb;
      --mdc-chip-label-text-color: #b45309;
    }

    .countdown-chip.danger {
      --mdc-chip-elevated-container-color: #fef2f2;
      --mdc-chip-label-text-color: #b91c1c;
    }

    .countdown-chip.expired {
      --mdc-chip-elevated-container-color: #7f1d1d;
      --mdc-chip-label-text-color: #ffffff;
    }

    .empty-state {
      align-items: center;
      background: #ffffff;
      border: 1px solid rgba(15, 111, 115, 0.12);
      border-radius: 16px;
      color: var(--omnicare-muted);
      display: grid;
      justify-items: center;
      min-height: 280px;
      text-align: center;
    }

    .empty-state mat-icon {
      color: #94a3b8;
      font-size: 64px;
      height: 64px;
      width: 64px;
    }

    @media (max-width: 760px) {
      .auth-top,
      .auth-main {
        align-items: start;
        flex-direction: column;
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
  protected readonly stats = computed(() => {
    const autorisations = this.facade.allAutorisations();
    const currentMonth = new Date().toISOString().slice(0, 7);

    return {
      total: autorisations.length,
      open: autorisations.filter((item) => ['EN_ATTENTE', 'EN_EXAMEN'].includes(item.status)).length,
      month: autorisations.filter((item) => item.submittedAt.startsWith(currentMonth)).length,
    };
  });

  ngOnInit(): void {
    this.facade.loadForCompany(this.companyId());
  }

  protected openDetail(id: string): void {
    void this.router.navigate(['/assurance', this.companyId(), 'autorisations', id]);
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

    return 'star';
  }
}
