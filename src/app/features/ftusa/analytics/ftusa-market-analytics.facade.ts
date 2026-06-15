import { Injectable, computed, signal } from '@angular/core';

import {
  DemandeRemboursement,
  DemandeStatus,
} from '../../../models/demande-remboursement.model';
import { InsuranceCompany } from '../../../models/insurance-company.model';
import {
  ActCategory,
  ClaimSource,
  CompanySettings,
  PlatformSettings,
} from '../../../models/shared.model';

export interface MarketCompanyAggregate {
  company: InsuranceCompany;
  demandes: DemandeRemboursement[];
}

export interface ChartRow {
  label: string;
  value: number;
  width: number;
}

export interface MonthlyChartRow {
  label: string;
  value: number;
  height: number;
}

export interface MarketMonthRow {
  key: string;
  label: string;
  value: number;
}

export interface MarketChannelMonthRow {
  key: string;
  label: string;
  omnicare: number;
  other: number;
  OMNICARE: number;
  MANUEL: number;
  WEBSITE: number;
  EMAIL: number;
  IMPORT_CSV: number;
}

export interface MarketCompanyMetricRow {
  companyId: string;
  label: string;
  value: number;
  target?: number;
  color?: string;
}

export interface MarketCompanyStatusRow {
  companyId: string;
  label: string;
  statuses: Record<DemandeStatus, number>;
  total: number;
}

const DEMANDE_STATUS_ORDER: DemandeStatus[] = [
  'SOUMISE',
  'DOCUMENTS_INCOMPLETS',
  'EN_EXAMEN',
  'APPROUVEE',
  'APPROUVEE_PARTIELLEMENT',
  'APPROUVEE_AUTO',
  'REFUSEE',
];
const MARKET_CHANNELS: ClaimSource[] = ['OMNICARE', 'MANUEL', 'WEBSITE', 'EMAIL', 'IMPORT_CSV'];
const TRAILING_MONTH_COUNT = 12;

@Injectable({ providedIn: 'root' })
export class FtusaMarketAnalyticsFacade {
  readonly companies = signal<InsuranceCompany[]>([]);
  readonly aggregates = signal<MarketCompanyAggregate[]>([]);
  readonly allCompanyAggregates = signal<MarketCompanyAggregate[]>([]);
  readonly platformSettings = signal<PlatformSettings>({
    legalAutoApprovalDays: 15,
    mandatoryPriorAuthCategories: ['CHIRURGIE', 'HOSPITALISATION'],
    minimumMarketSlaDays: 10,
  });

  readonly allDemandes = computed(() => this.aggregates().flatMap((aggregate) => aggregate.demandes));

  readonly statusMonthOptions = computed<MarketMonthRow[]>(() => this.emptyMonthRows());

  readonly monthlyClaims = computed<MarketMonthRow[]>(() =>
    this.monthlyRows((demande) => demande.submittedAt, this.allDemandes()),
  );

  readonly demandesByMonth = computed<MonthlyChartRow[]>(() => {
    const rows = this.monthlyClaims();
    const max = Math.max(...rows.map((row) => row.value), 1);

    return rows.map((row) => ({
      height: Math.max(10, Math.round((row.value / max) * 100)),
      label: row.label,
      value: row.value,
    }));
  });

  readonly monthlyTrend = computed<MarketMonthRow[]>(() => {
    const rows = this.monthlyClaims();
    const values = rows.map((row) => row.value);

    return rows.map((row, index) => ({
      ...row,
      value: this.roundOne(this.movingAverage(values, index, 3)),
    }));
  });

  readonly channelByMonth = computed<MarketChannelMonthRow[]>(() => {
    const rows = this.emptyMonthRows().map((month) => ({
      ...month,
      EMAIL: 0,
      IMPORT_CSV: 0,
      MANUEL: 0,
      OMNICARE: 0,
      WEBSITE: 0,
      omnicare: 0,
      other: 0,
    }));
    const indexByKey = new Map(rows.map((row, index) => [row.key, index]));

    for (const demande of this.allDemandes()) {
      const monthIndex = indexByKey.get(demande.submittedAt.slice(0, 7));

      if (monthIndex === undefined) {
        continue;
      }

      const row = rows[monthIndex];

      if (demande.source === 'OMNICARE') {
        row.OMNICARE += 1;
        row.omnicare += 1;
      } else {
        row.other += 1;

        if (demande.source === 'MANUEL') {
          row.MANUEL += 1;
        } else if (demande.source === 'WEBSITE') {
          row.WEBSITE += 1;
        } else if (demande.source === 'EMAIL') {
          row.EMAIL += 1;
        } else if (demande.source === 'IMPORT_CSV') {
          row.IMPORT_CSV += 1;
        }
      }
    }

    return rows;
  });

  readonly omnicareEvolution = computed(() =>
    this.channelByMonth().map((row) => ({
      key: row.key,
      label: row.label,
      omnicare: row.omnicare,
      other: row.other,
    })),
  );

  readonly volumeByCompany = computed(() =>
    this.horizontalRows(
      this.companyVolumeRows().map((row) => ({
        label: row.label,
        value: row.value,
      })),
    ),
  );

  readonly companyVolumeRows = computed<MarketCompanyMetricRow[]>(() =>
    this.aggregates()
      .map((aggregate, index) => ({
        companyId: aggregate.company.id,
        label: this.companyDisplayLabel(aggregate.company, index),
        value: aggregate.demandes.length,
      }))
      .sort((left, right) => right.value - left.value),
  );

  readonly sourceDistribution = computed(() =>
    this.horizontalRows(
      MARKET_CHANNELS.map((source) => ({
        label: this.sourceLabel(source),
        value: this.allDemandes().filter((demande) => demande.source === source).length,
      })),
    ),
  );

  readonly channelDistributionRows = computed<ChartRow[]>(() => this.sourceDistribution());

  readonly delayByCompany = computed(() =>
    this.horizontalRows(
      this.companyDelayRows().map((row) => ({
        label: row.label,
        value: row.value,
      })),
    ),
  );

  readonly companyDelayRows = computed<MarketCompanyMetricRow[]>(() =>
    this.aggregates()
      .map((aggregate, index) => {
        const value = this.roundOne(this.averageDelay(aggregate.demandes));
        const target = this.readSettings(aggregate.company.id)?.defaultSlaDays ?? this.marketSlaTarget();

        return {
          color: this.delayColor(value, target),
          companyId: aggregate.company.id,
          label: this.companyDisplayLabel(aggregate.company, index),
          target,
          value,
        };
      })
      .sort((left, right) => right.value - left.value),
  );

  readonly approvalByCompany = computed(() =>
    this.horizontalRows(
      this.companyApprovalRows().map((row) => ({
        label: row.label,
        value: row.value,
      })),
    ),
  );

  readonly companyApprovalRows = computed<MarketCompanyMetricRow[]>(() =>
    this.aggregates()
      .map((aggregate, index) => ({
        companyId: aggregate.company.id,
        label: this.companyDisplayLabel(aggregate.company, index),
        value: Math.round(this.approvalRate(aggregate.demandes) * 100),
      }))
      .sort((left, right) => right.value - left.value),
  );

  readonly slaCompliance = computed(() => {
    const rows = this.companyDelayRows().map((row) => ({
      label: row.label,
      value:
        row.value <= (row.target ?? this.marketSlaTarget())
          ? 100
          : Math.max(0, Math.round(((row.target ?? this.marketSlaTarget()) / Math.max(row.value, 1)) * 100)),
    }));

    return this.horizontalRows(rows);
  });

  readonly categoriesByVolume = computed(() =>
    this.horizontalRowsFromLabels(
      this.allDemandes().map((demande) => this.actLabel(demande.actCategory)),
    ).slice(0, 10),
  );

  readonly categoriesByAmount = computed(() => {
    const totals = new Map<string, number>();

    for (const demande of this.allDemandes()) {
      const label = this.actLabel(demande.actCategory);
      totals.set(label, (totals.get(label) ?? 0) + demande.totalAmount);
    }

    return this.horizontalRows(
      Array.from(totals.entries()).map(([label, value]) => ({ label, value })),
    ).slice(0, 10);
  });

  readonly crossCompanyDuplicatesByMonth = computed<MarketMonthRow[]>(() => {
    const rows = this.emptyMonthRows();
    const indexByKey = new Map(rows.map((row, index) => [row.key, index]));
    const grouped = new Map<
      string,
      Array<{ companyId: string; submittedAt: string }>
    >();

    for (const aggregate of this.aggregates()) {
      const settings = this.readSettings(aggregate.company.id);

      if (!settings?.participatesInCrossFraudDetection) {
        continue;
      }

      for (const demande of aggregate.demandes) {
        const key = this.duplicateHash(demande);
        grouped.set(key, [
          ...(grouped.get(key) ?? []),
          { companyId: aggregate.company.id, submittedAt: demande.submittedAt },
        ]);
      }
    }

    for (const cases of grouped.values()) {
      if (new Set(cases.map((item) => item.companyId)).size < 2) {
        continue;
      }

      const latestSubmittedAt = cases
        .map((item) => item.submittedAt)
        .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0];
      const monthIndex = indexByKey.get(latestSubmittedAt.slice(0, 7));

      if (monthIndex !== undefined) {
        rows[monthIndex].value += 1;
      }
    }

    return rows;
  });

  readonly marketSlaTarget = computed(() => this.platformSettings().minimumMarketSlaDays);

  readonly marketApprovalAverage = computed(() => {
    const rows = this.companyApprovalRows();

    if (rows.length === 0) {
      return 0;
    }

    return Math.round(rows.reduce((total, row) => total + row.value, 0) / rows.length);
  });

  readonly regions = computed(() =>
    this.horizontalRows([
      { label: 'Tunis', value: 38 },
      { label: 'Sousse', value: 18 },
      { label: 'Sfax', value: 16 },
      { label: 'Ariana', value: 12 },
      { label: 'Nabeul', value: 8 },
      { label: 'Monastir', value: 6 },
    ]),
  );

  load(): void {
    const companies = this.readJson<InsuranceCompany[]>('omnicare_ftusa_companies', []);
    this.companies.set(companies);
    this.platformSettings.set(
      this.readJson<PlatformSettings>('omnicare_ftusa_platform_settings', this.platformSettings()),
    );
    this.allCompanyAggregates.set(
      companies.map((company) => ({
        company,
        demandes: this.readJson<DemandeRemboursement[]>(
          `omnicare_ins_${company.id}_demandes`,
          [],
        ),
      })),
    );
    this.aggregates.set(
      companies
        .filter((company) => this.readSettings(company.id)?.participatesInMarketAnalytics)
        .map((company) => ({
          company,
          demandes: this.readJson<DemandeRemboursement[]>(
            `omnicare_ins_${company.id}_demandes`,
            [],
          ),
        })),
    );
  }

  companyStatusRows(monthKey: string): MarketCompanyStatusRow[] {
    return this.allCompanyAggregates()
      .map((aggregate) => {
        const statuses = this.emptyStatusCounts();

        for (const demande of aggregate.demandes) {
          if (demande.submittedAt.startsWith(monthKey)) {
            statuses[demande.status] += 1;
          }
        }

        const total = DEMANDE_STATUS_ORDER.reduce((sum, status) => sum + statuses[status], 0);

        return {
          companyId: aggregate.company.id,
          label: aggregate.company.name,
          statuses,
          total,
        };
      })
      .filter((row) => row.total > 0)
      .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label, 'fr'));
  }

  exportCsv(name: string, rows: Array<Array<string | number>>): void {
    const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${name}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  csvRows(title: string, rows: Array<ChartRow | MonthlyChartRow>): Array<Array<string | number>> {
    return [[title, 'Valeur'], ...rows.map((row) => [row.label, row.value])];
  }

  csvMatrix(
    headers: string[],
    rows: Array<Array<string | number>>,
  ): Array<Array<string | number>> {
    return [headers, ...rows];
  }

  private emptyMonthRows(): MarketMonthRow[] {
    const now = new Date();

    return Array.from({ length: TRAILING_MONTH_COUNT }, (_, index) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - TRAILING_MONTH_COUNT + 1 + index,
        1,
      );

      return {
        key: this.monthKey(date),
        label: this.monthLabel(date),
        value: 0,
      };
    });
  }

  private emptyStatusCounts(): Record<DemandeStatus, number> {
    return {
      APPROUVEE: 0,
      APPROUVEE_AUTO: 0,
      APPROUVEE_PARTIELLEMENT: 0,
      DOCUMENTS_INCOMPLETS: 0,
      EN_EXAMEN: 0,
      REFUSEE: 0,
      SOUMISE: 0,
    };
  }

  private monthlyRows(
    dateSelector: (demande: DemandeRemboursement) => string,
    demandes: DemandeRemboursement[],
  ): MarketMonthRow[] {
    const rows = this.emptyMonthRows();
    const indexByKey = new Map(rows.map((row, index) => [row.key, index]));

    for (const demande of demandes) {
      const monthIndex = indexByKey.get(dateSelector(demande).slice(0, 7));

      if (monthIndex !== undefined) {
        rows[monthIndex].value += 1;
      }
    }

    return rows;
  }

  private movingAverage(values: number[], index: number, windowSize: number): number {
    const start = Math.max(0, index - windowSize + 1);
    const window = values.slice(start, index + 1);

    return window.reduce((total, value) => total + value, 0) / Math.max(window.length, 1);
  }

  private monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private monthLabel(date: Date): string {
    return new Intl.DateTimeFormat('fr-TN', {
      month: 'short',
      year: '2-digit',
    })
      .format(date)
      .replace('.', '');
  }

  private companyDisplayLabel(company: InsuranceCompany, index: number): string {
    const settings = this.readSettings(company.id);

    return settings?.participatesInMarketAnalytics ? company.name : `Compagnie ${this.alphaLabel(index)}`;
  }

  private alphaLabel(index: number): string {
    return String.fromCharCode(65 + (index % 26));
  }

  private delayColor(value: number, target: number): string {
    if (value <= target) {
      return '#1FBF9A';
    }

    if (value <= target + 2) {
      return '#F59E0B';
    }

    return '#EF4444';
  }

  private roundOne(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private duplicateHash(demande: DemandeRemboursement): string {
    return `${demande.patientName}|${demande.factureNumber}|${demande.factureDate}|${demande.totalAmount}`;
  }

  private horizontalRowsFromLabels(labels: string[]): ChartRow[] {
    const counts = new Map<string, number>();

    for (const label of labels) {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    return this.horizontalRows(Array.from(counts.entries()).map(([label, value]) => ({ label, value })));
  }

  private horizontalRows(rows: Array<{ label: string; value: number }>): ChartRow[] {
    const max = Math.max(...rows.map((row) => row.value), 1);

    return rows
      .sort((left, right) => right.value - left.value)
      .map((row) => ({
        ...row,
        width: Math.max(6, Math.round((row.value / max) * 100)),
      }));
  }

  private averageDelay(demandes: DemandeRemboursement[]): number {
    const completed = demandes.filter((demande) => demande.respondedAt);

    if (completed.length === 0) {
      return 0;
    }

    return (
      completed.reduce(
        (total, demande) =>
          total + this.daysBetween(demande.submittedAt, demande.respondedAt ?? demande.lastUpdatedAt),
        0,
      ) / completed.length
    );
  }

  private approvalRate(demandes: DemandeRemboursement[]): number {
    const decided = demandes.filter((demande) =>
      ['APPROUVEE', 'APPROUVEE_AUTO', 'APPROUVEE_PARTIELLEMENT', 'REFUSEE'].includes(
        demande.status,
      ),
    );

    if (decided.length === 0) {
      return 0;
    }

    return (
      decided.filter((demande) =>
        ['APPROUVEE', 'APPROUVEE_AUTO', 'APPROUVEE_PARTIELLEMENT'].includes(demande.status),
      ).length / decided.length
    );
  }

  private daysBetween(startIso: string, endIso: string): number {
    return Math.max(
      1,
      Math.ceil((new Date(endIso).getTime() - new Date(startIso).getTime()) / 86_400_000),
    );
  }

  private readSettings(companyId: string): CompanySettings | null {
    return this.readJson<CompanySettings | null>(`omnicare_ins_${companyId}_settings`, null);
  }

  private actLabel(category: ActCategory): string {
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

  private sourceLabel(source: ClaimSource): string {
    const labels: Record<ClaimSource, string> = {
      AUTRE: 'Autre',
      EMAIL: 'Email',
      IMPORT_CSV: 'Import CSV',
      MANUEL: 'Manuel',
      OMNICARE: 'OmniCare',
      WEBSITE: 'Site web',
    };

    return labels[source];
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
