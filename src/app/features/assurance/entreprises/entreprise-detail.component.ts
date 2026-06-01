import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { ApexOptions } from 'ng-apexcharts';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CorporateContract } from '../../../models/corporate-contract.model';
import {
  ClaimFlag,
  DemandeRemboursement,
} from '../../../models/demande-remboursement.model';
import { PlanTier } from '../../../models/plan-tier.model';
import { ChartCardComponent } from '../../../shared/chart-card/chart-card.component';
import { StatusChipComponent } from '../../../shared/status-chip/status-chip.component';
import {
  FTUSA_CHART_COLORS as OMNICARE_CHART_COLORS,
  ftusaChartBase as omnicareChartBase,
  ftusaDataLabels as omnicareDataLabels,
  ftusaGrid as omnicareGrid,
  ftusaStates as omnicareStates,
  ftusaTheme as omnicareTheme,
  ftusaTooltip as omnicareTooltip,
} from '../../ftusa/charts/ftusa-apex-theme';
import { EntreprisesFacade } from './entreprises.facade';

interface ContractActivity {
  total: number;
  approved: number;
  rejected: number;
  reimbursed: number;
  ratio: number;
}

interface ContractMonthlyAmountRow {
  key: string;
  label: string;
  value: number;
}

interface ProviderStat {
  providerName: string;
  count: number;
  total: number;
}

@Component({
  selector: 'app-entreprise-detail',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    ChartCardComponent,
    StatusChipComponent,
  ],
  templateUrl: './entreprise-detail.component.html',
  styleUrl: './entreprise-detail.component.scss',
})
export class EntrepriseDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly facade = inject(EntreprisesFacade);
  protected readonly companyId = signal(this.routeCompanyId());
  protected readonly contractId = signal(this.route.snapshot.paramMap.get('id') ?? '');
  protected readonly demandes = signal<DemandeRemboursement[]>([]);
  protected readonly planTiers = signal<PlanTier[]>([]);

  protected readonly contract = computed(() => this.facade.getById(this.contractId()));

  protected readonly contractClaims = computed(() =>
    this.demandes().filter((demande) => demande.contractId === this.contractId()),
  );

  protected readonly activity = computed<ContractActivity>(() => {
    const contract = this.contract();
    const claims = this.contractClaims();
    const approvedStatuses = ['APPROUVEE', 'APPROUVEE_AUTO', 'APPROUVEE_PARTIELLEMENT'];
    const reimbursed = claims.reduce((total, demande) => total + (demande.approvedAmount ?? 0), 0);

    return {
      approved: claims.filter((demande) => approvedStatuses.includes(demande.status)).length,
      ratio: contract?.claimsRatio ?? 0,
      reimbursed,
      rejected: claims.filter((demande) => demande.status === 'REFUSEE').length,
      total: claims.length,
    };
  });

  protected readonly monthlyReimbursements = computed<ContractMonthlyAmountRow[]>(() => {
    const rows = this.emptyMonthRows();
    const indexByKey = new Map(rows.map((row, index) => [row.key, index]));

    for (const demande of this.contractClaims()) {
      const amount = demande.approvedAmount ?? 0;

      if (amount <= 0) {
        continue;
      }

      const monthIndex = indexByKey.get(
        (demande.respondedAt ?? demande.lastUpdatedAt ?? demande.submittedAt).slice(0, 7),
      );

      if (monthIndex !== undefined) {
        rows[monthIndex].value += amount;
      }
    }

    return rows.map((row) => ({
      ...row,
      value: Math.round(row.value),
    }));
  });

  protected readonly monthlyReimbursementsOptions = computed<ApexOptions>(() => {
    const rows = this.monthlyReimbursements();

    return {
      chart: omnicareChartBase('bar', 320),
      colors: [OMNICARE_CHART_COLORS.primary],
      dataLabels: omnicareDataLabels(false),
      fill: {
        opacity: 0.96,
      },
      grid: omnicareGrid(),
      plotOptions: {
        bar: {
          borderRadius: 5,
          columnWidth: '46%',
        },
      },
      series: [
        {
          data: rows.map((row) => row.value),
          name: 'Remboursé',
        },
      ],
      states: omnicareStates(),
      theme: omnicareTheme,
      tooltip: {
        ...omnicareTooltip(),
        y: {
          formatter: (value) => this.formatCurrency(Number(value)),
        },
      },
      xaxis: {
        categories: rows.map((row) => row.label),
        tooltip: {
          enabled: false,
        },
      },
      yaxis: {
        labels: {
          formatter: (value) => this.formatCurrency(Number(value)),
        },
      },
    };
  });

  protected readonly topProviders = computed<ProviderStat[]>(() => {
    const stats = new Map<string, ProviderStat>();

    for (const demande of this.contractClaims()) {
      const current = stats.get(demande.providerName) ?? {
        count: 0,
        providerName: demande.providerName,
        total: 0,
      };

      stats.set(demande.providerName, {
        ...current,
        count: current.count + 1,
        total: current.total + demande.totalAmount,
      });
    }

    return Array.from(stats.values())
      .sort((left, right) => right.total - left.total)
      .slice(0, 3);
  });

  protected readonly recommendations = computed(() => {
    const contract = this.contract();
    const claims = this.contractClaims();
    const recommendations: string[] = [];

    if (!contract) {
      return recommendations;
    }

    if (contract.claimsRatio < 0.35) {
      recommendations.push('Ratio favorable — opportunité de réviser les conditions');
    }

    if (!claims.some((demande) => this.hasFraudFlag(demande.flags))) {
      recommendations.push('Aucune fraude détectée sur ce groupe');
    }

    const totalClaimsAmount = claims.reduce((total, demande) => total + demande.totalAmount, 0);
    const concentratedProvider = this.topProviders().some(
      (provider) => totalClaimsAmount > 0 && provider.total / totalClaimsAmount > 0.25,
    );

    if (concentratedProvider) {
      recommendations.push('Concentration prestataire — risque à signaler');
    }

    return recommendations;
  });

  ngOnInit(): void {
    const companyId = this.companyId();
    this.facade.loadForCompany(companyId);
    this.demandes.set(this.readJson<DemandeRemboursement[]>(`omnicare_ins_${companyId}_demandes`, []));
    this.planTiers.set(this.readJson<PlanTier[]>(`omnicare_ins_${companyId}_plan_tiers`, []));
  }

  protected backToList(): void {
    void this.router.navigate(['/assurance', this.companyId(), 'entreprises']);
  }

  protected openAdherents(): void {
    void this.router.navigate(['/assurance', this.companyId(), 'adherents'], {
      queryParams: { contractId: this.contractId() },
    });
  }

  protected prepareRenewal(): void {
    this.snackBar.open('Dossier en cours de préparation (simulation)', 'Fermer', {
      duration: 3000,
    });
  }

  protected exportReport(): void {
    const contract = this.contract();

    if (!contract) {
      return;
    }

    const rows = [
      ['Employeur', 'Secteur', 'Demandes', 'Approuvées', 'Refusées', 'Remboursé TND', 'Ratio sinistres'],
      [
        contract.employerName,
        contract.employerSector,
        String(this.activity().total),
        String(this.activity().approved),
        String(this.activity().rejected),
        String(Math.round(this.activity().reimbursed)),
        this.formatPercent(contract.claimsRatio),
      ],
    ];
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `rapport-${contract.employerName.toLowerCase().replaceAll(' ', '-')}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.snackBar.open('Rapport employeur exporté', 'Fermer', { duration: 3000 });
  }

  protected exportMonthlyReimbursements(): void {
    const contract = this.contract();
    const csv = [
      ['Mois', 'Remboursé TND'],
      ...this.monthlyReimbursements().map((row) => [row.label, String(row.value)]),
    ]
      .map((row) => row.join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `remboursements-mensuels-${contract?.employerName.toLowerCase().replaceAll(' ', '-') ?? 'contrat'}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    this.snackBar.open('Export CSV généré', 'Fermer', { duration: 2500 });
  }

  protected planNames(contract: CorporateContract): string {
    const names = contract.availablePlanTiers.map(
      (planId) => this.planTiers().find((plan) => plan.id === planId)?.name ?? planId,
    );

    return names.join(', ');
  }

  protected daysUntil(isoDate: string): number {
    return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000);
  }

  protected enrollmentPercent(contract: CorporateContract): number {
    if (contract.totalEmployees === 0) {
      return 0;
    }

    return Math.round((contract.enrolledEmployees / contract.totalEmployees) * 100);
  }

  protected ratioTone(value: number): string {
    if (value < 0.3) {
      return 'success';
    }

    if (value <= 0.5) {
      return 'warning';
    }

    return 'error';
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
      month: 'long',
      year: 'numeric',
    }).format(new Date(isoDate));
  }

  protected formatPercent(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      maximumFractionDigits: 1,
      style: 'percent',
    }).format(value);
  }

  private hasFraudFlag(flags: ClaimFlag[]): boolean {
    return flags.some((flag) => ['DOUBLON_SUSPECT', 'PRESTATAIRE_HORS_RESEAU'].includes(flag));
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

  private emptyMonthRows(): ContractMonthlyAmountRow[] {
    const now = new Date();

    return Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);

      return {
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: new Intl.DateTimeFormat('fr-TN', {
          month: 'short',
          year: '2-digit',
        })
          .format(date)
          .replace('.', ''),
        value: 0,
      };
    });
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
