import { Component, OnInit, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import type { ApexOptions } from 'ng-apexcharts';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ChartCardComponent } from '../../../shared/chart-card/chart-card.component';
import { InsightCardComponent } from '../../../shared/insight-card/insight-card.component';
import {
  FTUSA_CHART_COLORS as OMNICARE_CHART_COLORS,
  ftusaChartBase as omnicareChartBase,
  ftusaDataLabels as omnicareDataLabels,
  ftusaGrid as omnicareGrid,
  ftusaLegend as omnicareLegend,
  ftusaStates as omnicareStates,
  ftusaStroke as omnicareStroke,
  ftusaTheme as omnicareTheme,
  ftusaTooltip as omnicareTooltip,
} from '../../ftusa/charts/ftusa-apex-theme';
import {
  AssuranceAnalytiqueFacade,
  AssuranceMonthValueRow,
} from './assurance-analytique.facade';

@Component({
  selector: 'app-assurance-analytique',
  imports: [ChartCardComponent, InsightCardComponent, MatCardModule, MatSnackBarModule],
  providers: [AssuranceAnalytiqueFacade],
  templateUrl: './assurance-analytique.component.html',
  styleUrl: './assurance-analytique.component.scss',
})
export class AssuranceAnalytiqueComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly facade = inject(AssuranceAnalytiqueFacade);

  protected readonly monthlyDemandesOptions = computed<ApexOptions>(() => {
    const rows = this.facade.monthlyDemandes();
    const trend = this.monthlyTrend(rows);

    return {
      chart: omnicareChartBase('line', 340),
      colors: [OMNICARE_CHART_COLORS.primary, OMNICARE_CHART_COLORS.deepTeal],
      dataLabels: omnicareDataLabels(false),
      grid: omnicareGrid(),
      legend: omnicareLegend('top'),
      markers: {
        colors: [OMNICARE_CHART_COLORS.deepTeal],
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
      states: omnicareStates(),
      stroke: {
        curve: 'smooth',
        width: [0, 3],
      },
      theme: omnicareTheme,
      tooltip: {
        ...omnicareTooltip(),
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
          formatter: (value) => this.formatNumber(Number(value)),
        },
      },
    };
  });

  protected readonly channelMixOptions = computed<ApexOptions>(() => {
    const rows = this.facade.channelMix();
    const total = rows.reduce((sum, row) => sum + row.value, 0);

    return {
      chart: omnicareChartBase('donut', 320),
      colors: [
        OMNICARE_CHART_COLORS.primary,
        OMNICARE_CHART_COLORS.deepTeal,
        OMNICARE_CHART_COLORS.mint,
        OMNICARE_CHART_COLORS.amber,
        '#94A3B8',
        '#A78BFA',
      ],
      dataLabels: {
        ...omnicareDataLabels(true),
        formatter: (value) => `${Number(value).toFixed(1)} %`,
      },
      labels: rows.map((row) => row.label),
      legend: {
        ...omnicareLegend('bottom'),
        formatter: (
          seriesName: string,
          opts?: { seriesIndex: number; w: { globals: { series: number[] } } },
        ) => {
          const value = opts?.w.globals.series[opts.seriesIndex] ?? 0;
          const percent = total > 0 ? (value / total) * 100 : 0;

          return `${seriesName} · ${percent.toFixed(1)} %`;
        },
      },
      plotOptions: {
        pie: {
          donut: {
            labels: {
              show: true,
              total: {
                color: OMNICARE_CHART_COLORS.text,
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
      states: omnicareStates(),
      theme: omnicareTheme,
      tooltip: {
        ...omnicareTooltip(),
        y: {
          formatter: (value) => `${Number(value).toFixed(0)} demandes`,
        },
      },
    };
  });

  protected readonly approvalByMonthOptions = computed<ApexOptions>(() => {
    const rows = this.facade.approvalByMonth();

    return {
      chart: omnicareChartBase('line', 320),
      colors: [OMNICARE_CHART_COLORS.deepTeal],
      dataLabels: omnicareDataLabels(false),
      grid: omnicareGrid(),
      markers: {
        size: 4,
        strokeColors: '#ffffff',
        strokeWidth: 2,
      },
      series: [
        {
          data: rows.map((row) => row.value),
          name: "Taux d'approbation",
        },
      ],
      states: omnicareStates(),
      stroke: omnicareStroke(3),
      theme: omnicareTheme,
      tooltip: {
        ...omnicareTooltip(),
        y: {
          formatter: (value, opts) => {
            const row = rows[opts?.dataPointIndex ?? 0];

            return row
              ? `${Number(value).toFixed(1)} % · ${row.approved}/${row.decided} décisions`
              : `${Number(value).toFixed(1)} %`;
          },
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
          formatter: (value) => `${Number(value).toFixed(0)} %`,
        },
        max: 100,
      },
    };
  });

  protected readonly delayByMonthOptions = computed<ApexOptions>(() => {
    const rows = this.facade.delayByMonth();
    const slaTarget = this.facade.companySlaTarget();

    return {
      annotations: {
        yaxis: [
          {
            borderColor: OMNICARE_CHART_COLORS.deepTeal,
            label: {
              borderColor: OMNICARE_CHART_COLORS.deepTeal,
              style: {
                background: OMNICARE_CHART_COLORS.deepTeal,
                color: '#ffffff',
                fontFamily: 'Plus Jakarta Sans, Arial, sans-serif',
                fontWeight: 700,
              },
              text: `SLA ${slaTarget} j`,
            },
            strokeDashArray: 4,
            y: slaTarget,
          },
        ],
      },
      chart: omnicareChartBase('bar', 320),
      colors: [OMNICARE_CHART_COLORS.amber],
      dataLabels: omnicareDataLabels(false),
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
          name: 'Délai moyen',
        },
      ],
      states: omnicareStates(),
      theme: omnicareTheme,
      tooltip: {
        ...omnicareTooltip(),
        y: {
          formatter: (value, opts) => {
            const row = rows[opts?.dataPointIndex ?? 0];

            return row
              ? `${Number(value).toFixed(1)} jours · ${row.completed} décision(s)`
              : `${Number(value).toFixed(1)} jours`;
          },
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
          formatter: (value) => `${Number(value).toFixed(0)} j`,
        },
      },
    };
  });

  protected readonly categoryVolumeOptions = computed<ApexOptions>(() =>
    this.horizontalBarOptions(
      'Volume',
      this.facade.categoryVolumeRows().map((row) => row.label),
      this.facade.categoryVolumeRows().map((row) => row.value),
      [OMNICARE_CHART_COLORS.primary],
      (value) => `${Number(value).toFixed(0)} demandes`,
    ),
  );

  protected readonly categoryAmountOptions = computed<ApexOptions>(() =>
    this.horizontalBarOptions(
      'Montant',
      this.facade.categoryAmountRows().map((row) => row.label),
      this.facade.categoryAmountRows().map((row) => row.value),
      [OMNICARE_CHART_COLORS.deepTeal],
      (value) => this.formatCurrency(Number(value)),
    ),
  );

  ngOnInit(): void {
    this.facade.loadForCompany(this.routeCompanyId());
  }

  protected exportMonthlyDemandes(): void {
    const trend = this.monthlyTrend(this.facade.monthlyDemandes());

    this.exportCsv(
      'demandes-par-mois',
      ['Mois', 'Demandes', 'Tendance'],
      this.facade.monthlyDemandes().map((row, index) => [
        row.label,
        row.value,
        trend[index]?.value ?? 0,
      ]),
    );
  }

  protected exportChannelMix(): void {
    const rows = this.facade.channelMix();
    const total = rows.reduce((sum, row) => sum + row.value, 0);

    this.exportCsv(
      'repartition-canaux-source',
      ['Canal', 'Demandes', 'Part %'],
      rows.map((row) => [
        row.label,
        row.value,
        total > 0 ? Math.round((row.value / total) * 1000) / 10 : 0,
      ]),
    );
  }

  protected exportApprovalByMonth(): void {
    this.exportCsv(
      'taux-approbation-par-mois',
      ['Mois', 'Taux approbation %', 'Approuvées', 'Décidées'],
      this.facade.approvalByMonth().map((row) => [
        row.label,
        row.value,
        row.approved,
        row.decided,
      ]),
    );
  }

  protected exportDelayByMonth(): void {
    this.exportCsv(
      'delai-traitement-par-mois',
      ['Mois', 'Délai moyen jours', 'Dossiers décidés', 'SLA cible jours'],
      this.facade.delayByMonth().map((row) => [
        row.label,
        row.value,
        row.completed,
        this.facade.companySlaTarget(),
      ]),
    );
  }

  protected exportCategoryVolume(): void {
    this.exportCsv(
      'categories-volume',
      ['Catégorie', 'Demandes'],
      this.facade.categoryVolumeRows().map((row) => [row.label, row.value]),
    );
  }

  protected exportCategoryAmount(): void {
    this.exportCsv(
      'categories-montant',
      ['Catégorie', 'Montant TND'],
      this.facade.categoryAmountRows().map((row) => [row.label, row.value]),
    );
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      maximumFractionDigits: 0,
      style: 'currency',
      currency: 'TND',
    }).format(value);
  }

  protected formatPercent(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      maximumFractionDigits: 1,
      style: 'percent',
    }).format(value);
  }

  protected formatNumber(value: number): string {
    return new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 1 }).format(value);
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
  ): ApexOptions {
    return {
      chart: omnicareChartBase('bar', 340),
      colors,
      dataLabels: omnicareDataLabels(false),
      grid: omnicareGrid(),
      plotOptions: {
        bar: {
          borderRadius: 6,
          horizontal: true,
        },
      },
      series: [
        {
          data: values,
          name,
        },
      ],
      states: omnicareStates(),
      theme: omnicareTheme,
      tooltip: {
        ...omnicareTooltip(),
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

  private monthlyTrend(rows: AssuranceMonthValueRow[]): AssuranceMonthValueRow[] {
    const values = rows.map((row) => row.value);

    return rows.map((row, index) => ({
      ...row,
      value: this.roundOne(this.movingAverage(values, index, 3)),
    }));
  }

  private movingAverage(values: number[], index: number, windowSize: number): number {
    const start = Math.max(0, index - windowSize + 1);
    const window = values.slice(start, index + 1);

    return window.reduce((total, value) => total + value, 0) / Math.max(window.length, 1);
  }

  private roundOne(value: number): number {
    return Math.round(value * 10) / 10;
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
