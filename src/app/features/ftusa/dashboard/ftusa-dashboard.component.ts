import { Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import type { ApexOptions } from 'ng-apexcharts';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ChartCardComponent } from '../../../shared/chart-card/chart-card.component';
import { InsightCardComponent } from '../../../shared/insight-card/insight-card.component';
import { StatusChipComponent, StatusChipTone } from '../../../shared/status-chip/status-chip.component';
import { AdhesionRequest, AdhesionRequestStatus } from '../../../models/adhesion-request.model';
import {
  FTUSA_CHART_COLORS,
  ftusaAreaFill,
  ftusaChartBase,
  ftusaDataLabels,
  ftusaGrid,
  ftusaLegend,
  ftusaStates,
  ftusaStroke,
  ftusaTheme,
  ftusaTooltip,
} from '../charts/ftusa-apex-theme';
import { FtusaMarketAnalyticsFacade } from '../analytics/ftusa-market-analytics.facade';
import { FtusaAdhesionRequestsFacade } from '../adhesion-requests/ftusa-adhesion-requests.facade';
import { FtusaDashboardFacade } from './ftusa-dashboard.facade';

@Component({
  selector: 'app-ftusa-dashboard',
  imports: [
    ChartCardComponent,
    InsightCardComponent,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    StatusChipComponent,
  ],
  templateUrl: './ftusa-dashboard.component.html',
  styleUrl: './ftusa-dashboard.component.scss',
})
export class FtusaDashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly facade = inject(FtusaDashboardFacade);
  protected readonly marketFacade = inject(FtusaMarketAnalyticsFacade);
  protected readonly adhesionFacade = inject(FtusaAdhesionRequestsFacade);
  protected readonly kpis = this.facade.kpis;
  protected readonly insights = this.facade.insights;
  protected readonly activityFeed = this.facade.activityFeed;
  protected readonly adhesionPreview = computed(() =>
    this.adhesionFacade
      .filteredRequests()
      .filter((request) => request.status !== 'CLOTUREE')
      .slice(0, 3),
  );

  protected readonly marketVolumeOptions = computed<ApexOptions>(() => {
    const rows = this.marketFacade.monthlyClaims();

    return {
      chart: ftusaChartBase('area', 330),
      colors: [FTUSA_CHART_COLORS.primary],
      dataLabels: ftusaDataLabels(false),
      fill: ftusaAreaFill(0.42, 0.05),
      grid: ftusaGrid(),
      markers: {
        colors: [FTUSA_CHART_COLORS.primary],
        size: 4,
        strokeColors: '#ffffff',
        strokeWidth: 2,
      },
      series: [
        {
          data: rows.map((row) => row.value),
          name: 'Demandes',
        },
      ],
      states: ftusaStates(),
      stroke: ftusaStroke(3),
      theme: ftusaTheme,
      tooltip: {
        ...ftusaTooltip(),
        y: {
          formatter: (value) => `${Math.round(value)} demandes`,
        },
      },
      xaxis: {
        categories: rows.map((row) => row.label),
        labels: {
          style: {
            fontFamily: 'Plus Jakarta Sans, Arial, sans-serif',
            fontWeight: 700,
          },
        },
        tooltip: {
          enabled: false,
        },
      },
      yaxis: {
        labels: {
          formatter: (value) => this.formatNumber(value),
        },
      },
    };
  });

  protected readonly omnicareShiftOptions = computed<ApexOptions>(() => {
    const rows = this.marketFacade.omnicareEvolution();

    return {
      chart: ftusaChartBase('area', 330, true),
      colors: [FTUSA_CHART_COLORS.primary, FTUSA_CHART_COLORS.deepTeal],
      dataLabels: ftusaDataLabels(false),
      fill: ftusaAreaFill(0.52, 0.08),
      grid: ftusaGrid(),
      legend: ftusaLegend('top'),
      series: [
        {
          data: rows.map((row) => row.omnicare),
          name: 'OmniCare',
        },
        {
          data: rows.map((row) => row.other),
          name: 'Autres canaux',
        },
      ],
      states: ftusaStates(),
      stroke: ftusaStroke(2.5),
      theme: ftusaTheme,
      tooltip: {
        ...ftusaTooltip(),
        y: {
          formatter: (value) => `${Math.round(value)} demandes`,
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
          formatter: (value) => this.formatNumber(value),
        },
      },
    };
  });

  protected readonly slaPerformanceOptions = computed<ApexOptions>(() => {
    const rows = this.marketFacade.companyDelayRows();
    const marketTarget = this.marketFacade.marketSlaTarget();

    return {
      annotations: {
        xaxis: [
          {
            borderColor: FTUSA_CHART_COLORS.deepTeal,
            label: {
              borderColor: FTUSA_CHART_COLORS.deepTeal,
              style: {
                background: FTUSA_CHART_COLORS.deepTeal,
                color: '#ffffff',
                fontFamily: 'Plus Jakarta Sans, Arial, sans-serif',
                fontWeight: 700,
              },
              text: `SLA marché ${marketTarget} j`,
            },
            strokeDashArray: 4,
            x: marketTarget,
          },
        ],
      },
      chart: ftusaChartBase('bar', 330),
      colors: rows.map((row) => row.color ?? FTUSA_CHART_COLORS.primary),
      dataLabels: {
        ...ftusaDataLabels(true),
        formatter: (value) => `${Number(value).toFixed(1)} j`,
      },
      grid: ftusaGrid(),
      plotOptions: {
        bar: {
          borderRadius: 6,
          dataLabels: {
            position: 'center',
          },
          distributed: true,
          horizontal: true,
        },
      },
      series: [
        {
          data: rows.map((row) => row.value),
          name: 'Délai moyen',
        },
      ],
      states: ftusaStates(),
      theme: ftusaTheme,
      tooltip: {
        ...ftusaTooltip(),
        y: {
          formatter: (value) => `${Number(value).toFixed(1)} jours`,
        },
      },
      xaxis: {
        categories: rows.map((row) => row.label),
        labels: {
          formatter: (value) => `${Number(value).toFixed(0)} j`,
        },
      },
    };
  });

  ngOnInit(): void {
    this.facade.load();
    this.marketFacade.load();
    this.adhesionFacade.load();
  }

  protected navigate(route: string): void {
    void this.router.navigateByUrl(route);
  }

  protected formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      maximumFractionDigits: 0,
    }).format(value);
  }

  protected formatPercent(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      maximumFractionDigits: 1,
      style: 'percent',
    }).format(value);
  }

  protected formatDelay(value: number): string {
    return `${value.toFixed(1)} j`;
  }

  protected adhesionStatusLabel(status: AdhesionRequestStatus): string {
    const labels: Record<AdhesionRequestStatus, string> = {
      A_COMPLETER: 'À compléter',
      CLOTUREE: 'Clôturée',
      NOUVELLE: 'Nouvelle',
      OFFRE_ENVOYEE: 'Offre envoyée',
      PRETE_A_PROPOSER: 'Prête à proposer',
    };

    return labels[status];
  }

  protected adhesionStatusTone(status: AdhesionRequestStatus): StatusChipTone {
    const tones: Record<AdhesionRequestStatus, StatusChipTone> = {
      A_COMPLETER: 'warning',
      CLOTUREE: 'neutral',
      NOUVELLE: 'info',
      OFFRE_ENVOYEE: 'success',
      PRETE_A_PROPOSER: 'success',
    };

    return tones[status];
  }

  protected adhesionMemberSummary(request: AdhesionRequest): string {
    const childCount = request.members.filter((member) => member.relationship === 'ENFANT').length;
    const spouseCount = request.members.filter((member) => member.relationship === 'CONJOINT').length;

    if (childCount === 0 && spouseCount === 0) {
      return 'Assuré seul';
    }

    return `Famille: ${spouseCount} conjoint, ${childCount} enfant(s)`;
  }

  protected adhesionPriorityLabel(request: AdhesionRequest): string {
    if (request.missingItems.length > 0 || request.status === 'A_COMPLETER') {
      return 'Attention requise';
    }

    if (request.status === 'NOUVELLE') {
      return 'À qualifier';
    }

    if (request.status === 'PRETE_A_PROPOSER') {
      return 'Prête à proposer';
    }

    if (request.status === 'OFFRE_ENVOYEE') {
      return 'Offre à suivre';
    }

    return 'Suivi standard';
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

    const days = Math.round(hours / 24);
    return `il y a ${days} j`;
  }

  protected exportMarketVolume(): void {
    this.marketFacade.exportCsv(
      'dashboard-volume-marche-par-mois',
      this.marketFacade.csvMatrix(
        ['Mois', 'Demandes'],
        this.marketFacade.monthlyClaims().map((row) => [row.label, row.value]),
      ),
    );
    this.notifyExport();
  }

  protected exportOmnicareShift(): void {
    this.marketFacade.exportCsv(
      'dashboard-evolution-canal-omnicare',
      this.marketFacade.csvMatrix(
        ['Mois', 'OmniCare', 'Autres canaux'],
        this.marketFacade.omnicareEvolution().map((row) => [
          row.label,
          row.omnicare,
          row.other,
        ]),
      ),
    );
    this.notifyExport();
  }

  protected exportSlaPerformance(): void {
    this.marketFacade.exportCsv(
      'dashboard-performance-sla-compagnies',
      this.marketFacade.csvMatrix(
        ['Compagnie', 'Délai moyen jours', 'SLA cible jours'],
        this.marketFacade.companyDelayRows().map((row) => [
          row.label,
          row.value,
          row.target ?? this.marketFacade.marketSlaTarget(),
        ]),
      ),
    );
    this.notifyExport();
  }

  private notifyExport(): void {
    this.snackBar.open('Export CSV généré', 'Fermer', { duration: 2500 });
  }
}
