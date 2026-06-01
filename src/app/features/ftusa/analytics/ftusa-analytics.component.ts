import { Component, OnInit, computed, inject } from '@angular/core';
import type { ApexOptions } from 'ng-apexcharts';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ChartCardComponent } from '../../../shared/chart-card/chart-card.component';
import {
  FTUSA_CHART_COLORS,
  ftusaChartBase,
  ftusaDataLabels,
  ftusaGrid,
  ftusaLegend,
  ftusaStates,
  ftusaTheme,
  ftusaTooltip,
} from '../charts/ftusa-apex-theme';
import { ChartRow, FtusaMarketAnalyticsFacade, MonthlyChartRow } from './ftusa-market-analytics.facade';

@Component({
  selector: 'app-ftusa-analytics',
  imports: [ChartCardComponent, MatButtonModule, MatCardModule, MatIconModule, MatSnackBarModule],
  templateUrl: './ftusa-analytics.component.html',
  styleUrl: './ftusa-analytics.component.scss',
})
export class FtusaAnalyticsComponent implements OnInit {
  private readonly snackBar = inject(MatSnackBar);

  protected readonly facade = inject(FtusaMarketAnalyticsFacade);
  protected readonly privacyNote =
    'Comparaison limitée aux compagnies opt-in. Les libellés réels sont autorisés pour les participantes analytiques ; les autres restent anonymisées.';
  private readonly sourceLabels = ['OmniCare', 'Manuel', 'Site web', 'Email', 'Import CSV'];

  protected readonly monthlyClaimsOptions = computed<ApexOptions>(() => {
    const rows = this.facade.monthlyClaims();
    const trend = this.facade.monthlyTrend();

    return {
      chart: ftusaChartBase('line', 340),
      colors: [FTUSA_CHART_COLORS.primary, FTUSA_CHART_COLORS.deepTeal],
      dataLabels: ftusaDataLabels(false),
      grid: ftusaGrid(),
      legend: ftusaLegend('top'),
      markers: {
        colors: [FTUSA_CHART_COLORS.deepTeal],
        size: [0, 4],
        strokeColors: '#ffffff',
        strokeWidth: 2,
      },
      plotOptions: {
        bar: {
          borderRadius: 5,
          columnWidth: '46%',
        },
      },
      series: [
        {
          data: rows.map((row) => row.value),
          name: 'Demandes',
          type: 'column',
        },
        {
          data: trend.map((row) => row.value),
          name: 'Tendance',
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
        y: {
          formatter: (value) => `${Number(value).toFixed(0)} demandes`,
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

  protected readonly sourceDistributionOptions = computed<ApexOptions>(() => {
    const rows = this.facade.channelDistributionRows();
    const total = rows.reduce((sum, row) => sum + row.value, 0);

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
                label: 'Demandes',
                show: true,
              },
            },
            size: '64%',
          },
        },
      },
      series: rows.map((row) => row.value),
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

  protected readonly channelTimelineOptions = computed<ApexOptions>(() => {
    const rows = this.facade.channelByMonth();

    return {
      chart: ftusaChartBase('bar', 340, true),
      colors: [
        FTUSA_CHART_COLORS.primary,
        FTUSA_CHART_COLORS.deepTeal,
        FTUSA_CHART_COLORS.mint,
        FTUSA_CHART_COLORS.amber,
        '#94A3B8',
      ],
      dataLabels: ftusaDataLabels(false),
      fill: {
        opacity: 0.95,
      },
      grid: ftusaGrid(),
      legend: ftusaLegend('top'),
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: '56%',
        },
      },
      series: [
        { data: rows.map((row) => row.OMNICARE), name: 'OmniCare' },
        { data: rows.map((row) => row.MANUEL), name: 'Manuel' },
        { data: rows.map((row) => row.WEBSITE), name: 'Site web' },
        { data: rows.map((row) => row.EMAIL), name: 'Email' },
        { data: rows.map((row) => row.IMPORT_CSV), name: 'Import CSV' },
      ],
      states: ftusaStates(),
      theme: ftusaTheme,
      tooltip: {
        ...ftusaTooltip(),
        y: {
          formatter: (value) => `${Number(value).toFixed(0)} demandes`,
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

  protected readonly volumeByCompanyOptions = computed<ApexOptions>(() =>
    this.horizontalBarOptions(
      'Volume',
      this.facade.companyVolumeRows().map((row) => row.label),
      this.facade.companyVolumeRows().map((row) => row.value),
      [FTUSA_CHART_COLORS.primary],
      (value) => `${Number(value).toFixed(0)} demandes`,
    ),
  );

  protected readonly delayByCompanyOptions = computed<ApexOptions>(() => {
    const rows = this.facade.companyDelayRows();
    const marketTarget = this.facade.marketSlaTarget();

    return {
      ...this.horizontalBarOptions(
        'Délai moyen',
        rows.map((row) => row.label),
        rows.map((row) => row.value),
        rows.map((row) => row.color ?? FTUSA_CHART_COLORS.primary),
        (value) => `${Number(value).toFixed(1)} jours`,
        true,
      ),
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
              text: `SLA ${marketTarget} j`,
            },
            strokeDashArray: 4,
            x: marketTarget,
          },
        ],
      },
      xaxis: {
        categories: rows.map((row) => row.label),
        labels: {
          formatter: (value) => `${Number(value).toFixed(0)} j`,
        },
      },
    };
  });

  protected readonly approvalByCompanyOptions = computed<ApexOptions>(() => {
    const rows = this.facade.companyApprovalRows();
    const marketAverage = this.facade.marketApprovalAverage();

    return {
      ...this.horizontalBarOptions(
        'Taux',
        rows.map((row) => row.label),
        rows.map((row) => row.value),
        [FTUSA_CHART_COLORS.deepTeal],
        (value) => `${Number(value).toFixed(0)} %`,
      ),
      annotations: {
        xaxis: [
          {
            borderColor: FTUSA_CHART_COLORS.primary,
            label: {
              borderColor: FTUSA_CHART_COLORS.primary,
              style: {
                background: FTUSA_CHART_COLORS.primary,
                color: '#043A34',
                fontFamily: 'Plus Jakarta Sans, Arial, sans-serif',
                fontWeight: 800,
              },
              text: `Moyenne ${marketAverage} %`,
            },
            strokeDashArray: 4,
            x: marketAverage,
          },
        ],
      },
      xaxis: {
        categories: rows.map((row) => row.label),
        labels: {
          formatter: (value) => `${Number(value).toFixed(0)} %`,
        },
        max: 100,
      },
    };
  });

  protected readonly categoriesByVolumeOptions = computed<ApexOptions>(() =>
    this.horizontalBarOptions(
      'Volume',
      this.facade.categoriesByVolume().map((row) => row.label),
      this.facade.categoriesByVolume().map((row) => row.value),
      [FTUSA_CHART_COLORS.primary],
      (value) => `${Number(value).toFixed(0)} demandes`,
    ),
  );

  protected readonly categoriesByAmountOptions = computed<ApexOptions>(() =>
    this.horizontalBarOptions(
      'Montant',
      this.facade.categoriesByAmount().map((row) => row.label),
      this.facade.categoriesByAmount().map((row) => row.value),
      [FTUSA_CHART_COLORS.deepTeal],
      (value) => this.formatCurrency(Number(value)),
    ),
  );

  protected readonly fraudDuplicatesOptions = computed<ApexOptions>(() => {
    const rows = this.facade.crossCompanyDuplicatesByMonth();

    return {
      chart: ftusaChartBase('bar', 320),
      colors: [FTUSA_CHART_COLORS.error],
      dataLabels: ftusaDataLabels(false),
      grid: ftusaGrid(),
      plotOptions: {
        bar: {
          borderRadius: 5,
          columnWidth: '44%',
        },
      },
      series: [
        {
          data: rows.map((row) => row.value),
          name: 'Doublons',
        },
      ],
      states: ftusaStates(),
      theme: ftusaTheme,
      tooltip: {
        ...ftusaTooltip(),
        y: {
          formatter: (value) => `${Number(value).toFixed(0)} paire(s)`,
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
          formatter: (value) => Number(value).toFixed(0),
        },
      },
    };
  });

  ngOnInit(): void {
    this.facade.load();
  }

  protected exportRows(name: string, title: string, rows: Array<ChartRow | MonthlyChartRow>): void {
    this.facade.exportCsv(name, this.facade.csvRows(title, rows));
    this.snackBar.open('Export CSV généré', 'Fermer', { duration: 2500 });
  }

  protected formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 1 }).format(value);
  }

  protected exportMonthlyClaims(): void {
    this.exportCsv(
      'demandes-par-mois-marche',
      ['Mois', 'Demandes', 'Tendance'],
      this.facade.monthlyClaims().map((row, index) => [
        row.label,
        row.value,
        this.facade.monthlyTrend()[index]?.value ?? 0,
      ]),
    );
  }

  protected exportSourceDistribution(): void {
    this.exportCsv(
      'canaux-source-marche',
      ['Canal', 'Demandes'],
      this.facade.channelDistributionRows().map((row) => [row.label, row.value]),
    );
  }

  protected exportChannelTimeline(): void {
    this.exportCsv(
      'evolution-canaux-marche',
      ['Mois', ...this.sourceLabels],
      this.facade.channelByMonth().map((row) => [
        row.label,
        row.OMNICARE,
        row.MANUEL,
        row.WEBSITE,
        row.EMAIL,
        row.IMPORT_CSV,
      ]),
    );
  }

  protected exportCompanyVolume(): void {
    this.exportCsv(
      'volume-compagnies',
      ['Compagnie', 'Demandes'],
      this.facade.companyVolumeRows().map((row) => [row.label, row.value]),
    );
  }

  protected exportCompanyDelay(): void {
    this.exportCsv(
      'delai-compagnies-vs-sla',
      ['Compagnie', 'Délai moyen jours', 'SLA cible jours'],
      this.facade.companyDelayRows().map((row) => [
        row.label,
        row.value,
        row.target ?? this.facade.marketSlaTarget(),
      ]),
    );
  }

  protected exportCompanyApproval(): void {
    this.exportCsv(
      'approbation-compagnies',
      ['Compagnie', 'Taux approbation %'],
      this.facade.companyApprovalRows().map((row) => [row.label, row.value]),
    );
  }

  protected exportCategoryVolume(): void {
    this.exportCsv(
      'categories-volume',
      ['Catégorie', 'Demandes'],
      this.facade.categoriesByVolume().map((row) => [row.label, row.value]),
    );
  }

  protected exportCategoryAmount(): void {
    this.exportCsv(
      'categories-montant',
      ['Catégorie', 'Montant TND'],
      this.facade.categoriesByAmount().map((row) => [row.label, row.value]),
    );
  }

  protected exportFraudDuplicates(): void {
    this.exportCsv(
      'fraude-doublons-par-mois',
      ['Mois', 'Paires de doublons'],
      this.facade.crossCompanyDuplicatesByMonth().map((row) => [row.label, row.value]),
    );
  }

  private exportCsv(
    name: string,
    headers: string[],
    rows: Array<Array<string | number>>,
  ): void {
    this.facade.exportCsv(name, this.facade.csvMatrix(headers, rows));
    this.snackBar.open('Export CSV généré', 'Fermer', { duration: 2500 });
  }

  private horizontalBarOptions(
    name: string,
    labels: string[],
    values: number[],
    colors: string[],
    tooltipFormatter: (value: number) => string,
    distributed = false,
  ): ApexOptions {
    return {
      chart: ftusaChartBase('bar', 330),
      colors,
      dataLabels: {
        ...ftusaDataLabels(false),
      },
      grid: ftusaGrid(),
      plotOptions: {
        bar: {
          borderRadius: 6,
          distributed,
          horizontal: true,
        },
      },
      series: [
        {
          data: values,
          name,
        },
      ],
      states: ftusaStates(),
      theme: ftusaTheme,
      tooltip: {
        ...ftusaTooltip(),
        y: {
          formatter: tooltipFormatter,
        },
      },
      xaxis: {
        categories: labels,
        labels: {
          formatter: (value) => this.formatNumber(Number(value)),
        },
      },
    };
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      currency: 'TND',
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(value);
  }
}
