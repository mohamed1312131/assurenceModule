import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import type { ApexOptions } from 'ng-apexcharts';

import { DemandeRemboursement } from '../../../../models/demande-remboursement.model';
import { ChartCardComponent } from '../../../../shared/chart-card/chart-card.component';
import { StatusChipComponent } from '../../../../shared/status-chip/status-chip.component';
import {
  FTUSA_CHART_COLORS,
  ftusaChartBase,
  ftusaDataLabels,
  ftusaGrid,
  ftusaLegend,
  ftusaStates,
  ftusaTheme,
  ftusaTooltip,
} from '../../charts/ftusa-apex-theme';
import {
  AmountRow,
  CompanyAnalyticsService,
  CompanyAnalyticsSummary,
  CountRow,
  SourcePerformanceRow,
} from './company-analytics.service';

interface KpiTile {
  label: string;
  value: string;
  helper: string;
  tone?: 'success' | 'warning' | 'error' | 'info';
}

@Component({
  selector: 'app-company-360',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatTabsModule,
    ChartCardComponent,
    StatusChipComponent,
  ],
  templateUrl: './company-360.component.html',
  styleUrl: './company-360.component.scss',
})
export class Company360Component {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly analytics = inject(CompanyAnalyticsService);

  protected readonly companyId = computed(() => this.route.snapshot.paramMap.get('companyId') ?? '');
  protected readonly summary = computed(() => this.analytics.getSummary(this.companyId()));
  protected readonly topKpis = computed<KpiTile[]>(() => {
    const summary = this.summary();

    if (!summary) {
      return [];
    }

    return [
      {
        helper: `${this.signedPercent(summary.claims.monthlyGrowthPercent)} vs mois précédent`,
        label: 'Demandes ce mois',
        tone: 'info',
        value: this.formatNumber(summary.claims.totalThisMonth),
      },
      {
        helper: `${summary.operations.overdueClaims} dossier(s) hors délai`,
        label: 'SLA respecté',
        tone: summary.operations.slaComplianceRate >= 90 ? 'success' : 'warning',
        value: this.formatPercent(summary.operations.slaComplianceRate),
      },
      {
        helper: `Médiane ${this.formatNumber(summary.operations.medianProcessingDays)} j`,
        label: 'Délai moyen traitement',
        value: `${this.formatNumber(summary.operations.averageProcessingDays)} j`,
      },
      {
        helper: `${this.formatPercent(summary.claims.rejectionRate)} refusées`,
        label: 'Taux d’approbation',
        tone: summary.claims.approvalRate >= 72 ? 'success' : 'warning',
        value: this.formatPercent(summary.claims.approvalRate),
      },
      {
        helper: `${this.formatCurrency(summary.claims.totalApprovedAmount)} approuvé YTD`,
        label: 'Montant approuvé ce mois',
        value: this.formatCurrency(summary.claims.approvedThisMonthAmount),
      },
      {
        helper: `${this.formatCurrency(summary.risk.amountAtRisk)} à risque`,
        label: 'Alertes risque ouvertes',
        tone: summary.risk.highRiskClaims > 4 ? 'error' : 'warning',
        value: this.formatNumber(summary.risk.highRiskClaims),
      },
    ];
  });

  protected readonly configurationRows = computed(() => {
    const summary = this.summary();

    if (!summary) {
      return [];
    }

    const config = summary.configuration;
    return [
      { label: 'Numéro CGA', ok: config.cgaNumberPresent, value: config.cgaNumberPresent ? 'Complet' : 'À compléter' },
      { label: 'Numéro INPDP', ok: config.inpdpNumberPresent, value: config.inpdpNumberPresent ? 'Complet' : 'À compléter' },
      { label: 'Admin actif', ok: config.adminActive, value: config.adminActive ? 'Complet' : 'À compléter' },
      { label: 'Onboarding terminé', ok: config.onboardingCompleted, value: config.onboardingCompleted ? 'Complet' : 'À compléter' },
      { label: 'Plans tarifaires configurés', ok: config.plansConfigured > 0, value: `${config.plansConfigured} plan(s)` },
      { label: 'SLA configuré', ok: config.slaConfigured, value: config.slaConfigured ? 'Complet' : 'Non configuré' },
      { label: 'Seuil réassurance configuré', ok: config.reinsuranceThresholdConfigured, value: config.reinsuranceThresholdConfigured ? 'Complet' : 'Non configuré' },
      { label: 'Règles autorisation préalable', ok: config.priorAuthRulesConfigured, value: config.priorAuthRulesConfigured ? 'Complet' : 'Non configuré' },
      { label: 'Signature/cachet document configuré', ok: config.documentSignatureConfigured, value: config.documentSignatureConfigured ? 'Complet' : 'Non configuré' },
      { label: 'Partage fraude', ok: config.fraudSharingEnabled, value: config.fraudSharingEnabled ? 'Complet' : 'Désactivé' },
      { label: 'Inclusion analytique marché', ok: config.marketAnalyticsEnabled, value: config.marketAnalyticsEnabled ? 'Complet' : 'Désactivé' },
    ];
  });
  protected readonly monthlyClaimsOptions = computed<ApexOptions>(() => {
    const summary = this.summary();
    const rows = summary?.claims.byMonth ?? [];

    return {
      chart: ftusaChartBase('line', 340),
      colors: [FTUSA_CHART_COLORS.primary, FTUSA_CHART_COLORS.deepTeal],
      dataLabels: ftusaDataLabels(false),
      grid: ftusaGrid(),
      legend: ftusaLegend('top'),
      plotOptions: {
        bar: {
          borderRadius: 5,
          columnWidth: '46%',
        },
      },
      series: [
        {
          data: rows.map((row) => row.count),
          name: 'Demandes',
          type: 'column',
        },
        {
          data: rows.map((row) => row.amount),
          name: 'Montant',
          type: 'line',
        },
      ],
      states: ftusaStates(),
      stroke: {
        curve: 'smooth',
        width: [0, 3],
      },
      theme: ftusaTheme,
      tooltip: {
        ...ftusaTooltip(),
        y: [
          { formatter: (value) => `${Number(value).toFixed(0)} demandes` },
          { formatter: (value) => this.formatCurrency(Number(value)) },
        ],
      },
      xaxis: {
        categories: rows.map((row) => row.month),
        tooltip: { enabled: false },
      },
      yaxis: [
        {
          labels: {
            formatter: (value) => this.formatNumber(value),
          },
          title: { text: 'Demandes' },
        },
        {
          opposite: true,
          labels: {
            formatter: (value) => this.compactCurrency(value),
          },
          title: { text: 'Montant' },
        },
      ],
    };
  });
  protected readonly sourceDistributionOptions = computed<ApexOptions>(() => {
    const rows = this.summary()?.claims.bySource ?? [];

    return {
      chart: ftusaChartBase('donut', 320),
      colors: [
        FTUSA_CHART_COLORS.primary,
        FTUSA_CHART_COLORS.deepTeal,
        FTUSA_CHART_COLORS.mint,
        FTUSA_CHART_COLORS.amber,
        '#94A3B8',
        '#64748B',
      ],
      dataLabels: {
        ...ftusaDataLabels(true),
        formatter: (value) => `${Number(value).toFixed(1)} %`,
      },
      labels: rows.map((row) => row.label),
      legend: ftusaLegend('bottom'),
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: true,
              total: {
                color: FTUSA_CHART_COLORS.text,
                formatter: () => this.formatNumber(rows.reduce((total, row) => total + row.count, 0)),
                label: 'Demandes',
                show: true,
              },
            },
            size: '64%',
          },
        },
      },
      series: rows.map((row) => row.count),
      states: ftusaStates(),
      theme: ftusaTheme,
      tooltip: {
        ...ftusaTooltip(),
        y: {
          formatter: (value) => `${Number(value).toFixed(0)} demandes`,
        },
      },
    };
  });
  protected readonly sourceQualityOptions = computed<ApexOptions>(() => {
    const rows = this.summary()?.claims.bySource ?? [];

    return {
      chart: ftusaChartBase('bar', 330),
      colors: [FTUSA_CHART_COLORS.primary, FTUSA_CHART_COLORS.amber, FTUSA_CHART_COLORS.deepTeal],
      dataLabels: ftusaDataLabels(false),
      grid: ftusaGrid(),
      legend: ftusaLegend('top'),
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: '52%',
        },
      },
      series: [
        { data: rows.map((row) => row.approvalRate), name: 'Approbation' },
        { data: rows.map((row) => row.incompleteDocumentsRate), name: 'Docs incomplets' },
        { data: rows.map((row) => row.averageProcessingDays), name: 'Délai moyen (j)' },
      ],
      states: ftusaStates(),
      theme: ftusaTheme,
      tooltip: {
        ...ftusaTooltip(),
      },
      xaxis: {
        categories: rows.map((row) => row.label),
        tooltip: { enabled: false },
      },
      yaxis: {
        labels: {
          formatter: (value) => this.formatNumber(value),
        },
      },
    };
  });
  protected readonly slaByCategoryOptions = computed<ApexOptions>(() => {
    const rows = this.summary()?.operations.slaByActCategory ?? [];

    return this.horizontalBarOptions(
      'SLA respecté',
      rows.map((row) => row.label),
      rows.map((row) => row.rate),
      [FTUSA_CHART_COLORS.primary],
      (value) => `${Number(value).toFixed(0)}%`,
      340,
    );
  });
  protected readonly topCategoriesAmountOptions = computed<ApexOptions>(() => {
    const rows = this.summary()?.claims.byActCategory.slice(0, 8) ?? [];

    return this.horizontalBarOptions(
      'Montant',
      rows.map((row) => row.label),
      rows.map((row) => row.amount),
      [FTUSA_CHART_COLORS.deepTeal],
      (value) => this.formatCurrency(Number(value)),
      360,
    );
  });
  protected readonly authorizationTypesOptions = computed<ApexOptions>(() => {
    const rows = this.summary()?.authorizations.topActTypes ?? [];

    return this.horizontalBarOptions(
      'Autorisations',
      rows.map((row) => row.label),
      rows.map((row) => row.count),
      [FTUSA_CHART_COLORS.amber],
      (value) => `${Number(value).toFixed(0)} autorisations`,
      320,
    );
  });
  protected readonly memberPlanOptions = computed<ApexOptions>(() =>
    this.donutRowsOptions(this.summary()?.members.planDistribution ?? [], 'Adhérents'),
  );
  protected readonly memberSourceOptions = computed<ApexOptions>(() =>
    this.donutRowsOptions(this.summary()?.members.sourceDistribution ?? [], 'Adhérents'),
  );
  protected readonly networkProvidersOptions = computed<ApexOptions>(() => {
    const rows = this.summary()?.network.topProviders.slice(0, 8) ?? [];

    return this.horizontalBarOptions(
      'Remboursé',
      rows.map((row) => row.providerName),
      rows.map((row) => row.reimbursedThisYear),
      [FTUSA_CHART_COLORS.primary],
      (value) => this.formatCurrency(Number(value)),
      360,
    );
  });
  protected readonly riskFlagsOptions = computed<ApexOptions>(() => {
    const rows = this.summary()?.risk.topFlags ?? [];

    return this.horizontalBarOptions(
      'Flags',
      rows.map((row) => row.label),
      rows.map((row) => row.count),
      [FTUSA_CHART_COLORS.error],
      (value) => `${Number(value).toFixed(0)} dossier(s)`,
      320,
    );
  });

  protected backToCompanies(): void {
    void this.router.navigate(['/ftusa/compagnies']);
  }

  protected healthLabel(status: CompanyAnalyticsSummary['overview']['healthStatus']): string {
    return status === 'SAIN' ? 'Sain' : status === 'A_SURVEILLER' ? 'À surveiller' : 'Critique';
  }

  protected statusLabel(status: CompanyAnalyticsSummary['company']['status']): string {
    return status === 'ACTIVE' ? 'Active' : status === 'EN_ATTENTE' ? 'Onboarding' : 'Suspendue';
  }

  protected statusTone(status: CompanyAnalyticsSummary['company']['status']): 'success' | 'warning' | 'error' {
    return status === 'ACTIVE' ? 'success' : status === 'EN_ATTENTE' ? 'warning' : 'error';
  }

  protected sourceInsight(sourceRows: SourcePerformanceRow[]): string {
    const riskiest = [...sourceRows].sort(
      (left, right) => right.incompleteDocumentsRate - left.incompleteDocumentsRate,
    )[0];
    return `Les demandes ${riskiest?.label ?? 'Email'} ont le plus fort taux de documents incomplets. Recommandation: pousser l’import structuré ou OmniCare.`;
  }

  protected topAmountLabel(rows: AmountRow[]): string {
    return rows.length ? rows[0].label : 'Aucune catégorie';
  }

  protected highAmountCategoryCount(rows: AmountRow[]): number {
    return rows.filter((row) => row.amount > 8000).length;
  }

  protected formatPriorityClaim(claim: DemandeRemboursement): string {
    return `${claim.patientName} · ${claim.providerName}`;
  }

  protected formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 1 }).format(value);
  }

  protected formatPercent(value: number): string {
    return `${this.formatNumber(value)}%`;
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      currency: 'TND',
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(value);
  }

  protected formatDate(isoDate: string | undefined): string {
    if (!isoDate) {
      return 'Non renseignée';
    }

    return new Intl.DateTimeFormat('fr-TN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(isoDate));
  }

  protected signedPercent(value: number): string {
    return `${value > 0 ? '+' : ''}${this.formatPercent(value)}`;
  }

  protected mockAction(): void {
    // Actions FTUSA simulées pour la démo statique.
  }

  private horizontalBarOptions(
    name: string,
    categories: string[],
    data: number[],
    colors: string[],
    formatter: (value: number) => string,
    height: number,
  ): ApexOptions {
    return {
      chart: ftusaChartBase('bar', height),
      colors,
      dataLabels: ftusaDataLabels(false),
      grid: ftusaGrid(),
      legend: { show: false },
      plotOptions: {
        bar: {
          barHeight: '62%',
          borderRadius: 5,
          distributed: colors.length > 1,
          horizontal: true,
        },
      },
      series: [{ data, name }],
      states: ftusaStates(),
      theme: ftusaTheme,
      tooltip: {
        ...ftusaTooltip(),
        y: { formatter },
      },
      xaxis: {
        categories,
        labels: {
          formatter: (value) => this.formatNumber(Number(value)),
        },
        tooltip: { enabled: false },
      },
      yaxis: {
        labels: {
          maxWidth: 190,
        },
      },
    };
  }

  private donutRowsOptions(rows: CountRow[], totalLabel: string): ApexOptions {
    const total = rows.reduce((sum, row) => sum + row.count, 0);

    return {
      chart: ftusaChartBase('donut', 320),
      colors: [
        FTUSA_CHART_COLORS.primary,
        FTUSA_CHART_COLORS.deepTeal,
        FTUSA_CHART_COLORS.mint,
        FTUSA_CHART_COLORS.amber,
        '#94A3B8',
      ],
      dataLabels: {
        ...ftusaDataLabels(true),
        formatter: (value) => `${Number(value).toFixed(1)} %`,
      },
      labels: rows.map((row) => row.label),
      legend: ftusaLegend('bottom'),
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: true,
              total: {
                color: FTUSA_CHART_COLORS.text,
                formatter: () => this.formatNumber(total),
                label: totalLabel,
                show: true,
              },
            },
            size: '64%',
          },
        },
      },
      series: rows.map((row) => row.count),
      states: ftusaStates(),
      theme: ftusaTheme,
      tooltip: {
        ...ftusaTooltip(),
        y: {
          formatter: (value) => `${Number(value).toFixed(0)}`,
        },
      },
    };
  }

  private compactCurrency(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      maximumFractionDigits: 0,
      notation: 'compact',
    }).format(value);
  }
}
