import { Injectable, computed, inject, signal } from '@angular/core';

import { LocalStorageService } from '../../../core/storage/local-storage.service';
import { DemandeRemboursement } from '../../../models/demande-remboursement.model';
import { PlanTier } from '../../../models/plan-tier.model';
import { ActCategory, ClaimSource, CompanySettings } from '../../../models/shared.model';

export interface AssuranceAnalyticsKpis {
  approvalRate: number;
  averageDelay: number;
  flagged: number;
  reimbursed: number;
  volumeMonth: number;
}

export interface AssuranceChartRow {
  label: string;
  value: number;
  width: number;
}

export interface AssuranceMonthValueRow {
  key: string;
  label: string;
  value: number;
}

export interface AssuranceMonthlyApprovalRow extends AssuranceMonthValueRow {
  approved: number;
  decided: number;
}

export interface AssuranceMonthlyDelayRow extends AssuranceMonthValueRow {
  completed: number;
}

type InsightTone = 'info' | 'success' | 'warning' | 'error' | 'neutral';

export interface AssuranceAnalyticsInsight {
  actionLabel: string;
  description: string;
  eyebrow: string;
  icon: string;
  title: string;
  tone: InsightTone;
}

const TRAILING_MONTH_COUNT = 12;
const CHANNELS: ClaimSource[] = ['OMNICARE', 'MANUEL', 'WEBSITE', 'EMAIL', 'IMPORT_CSV', 'AUTRE'];

@Injectable()
export class AssuranceAnalytiqueFacade {
  private readonly storage = inject(LocalStorageService);

  readonly companyId = signal('star');
  readonly demandes = signal<DemandeRemboursement[]>([]);
  readonly settings = signal<CompanySettings | null>(null);
  readonly planTiers = signal<PlanTier[]>([]);

  readonly companySlaTarget = computed(() => {
    const settingsTarget = this.settings()?.defaultSlaDays;

    if (settingsTarget) {
      return settingsTarget;
    }

    const planTargets = this.planTiers().map((plan) => plan.slaTargetDays);

    if (planTargets.length === 0) {
      return 10;
    }

    return Math.round(planTargets.reduce((total, target) => total + target, 0) / planTargets.length);
  });

  readonly kpis = computed<AssuranceAnalyticsKpis>(() => {
    const demandes = this.demandes();
    const currentMonth = this.monthKey(new Date());
    const decided = demandes.filter((demande) => this.isDecided(demande));
    const approved = decided.filter((demande) => this.isApproved(demande));
    const completed = demandes.filter((demande) => this.decisionDate(demande) !== null);
    const delayTotal = completed.reduce((total, demande) => {
      const endDate = this.decisionDate(demande);

      return endDate ? total + this.daysBetween(demande.submittedAt, endDate) : total;
    }, 0);

    return {
      approvalRate: decided.length > 0 ? approved.length / decided.length : 0,
      averageDelay: completed.length > 0 ? delayTotal / completed.length : 0,
      flagged: demandes.filter((demande) => demande.flags.length > 0).length,
      reimbursed: demandes.reduce((total, demande) => total + (demande.approvedAmount ?? 0), 0),
      volumeMonth: demandes.filter((demande) => demande.submittedAt.startsWith(currentMonth)).length,
    };
  });

  readonly monthlyDemandes = computed<AssuranceMonthValueRow[]>(() =>
    this.monthlyRows(this.demandes(), (demande) => demande.submittedAt, () => 1),
  );

  readonly channelMix = computed<AssuranceChartRow[]>(() => {
    const demandes = this.demandes();

    return this.horizontalRows(
      CHANNELS.map((source) => ({
        label: this.sourceLabel(source),
        value: demandes.filter((demande) => demande.source === source).length,
      })).filter((row) => row.value > 0),
    );
  });

  readonly approvalByMonth = computed<AssuranceMonthlyApprovalRow[]>(() => {
    const rows = this.emptyApprovalMonthRows();
    const indexByKey = new Map(rows.map((row, index) => [row.key, index]));

    for (const demande of this.demandes()) {
      if (!this.isDecided(demande)) {
        continue;
      }

      const monthIndex = indexByKey.get((this.decisionDate(demande) ?? demande.submittedAt).slice(0, 7));

      if (monthIndex === undefined) {
        continue;
      }

      rows[monthIndex].decided += 1;

      if (this.isApproved(demande)) {
        rows[monthIndex].approved += 1;
      }
    }

    return rows.map((row) => ({
      ...row,
      value: row.decided > 0 ? this.roundOne((row.approved / row.decided) * 100) : 0,
    }));
  });

  readonly delayByMonth = computed<AssuranceMonthlyDelayRow[]>(() => {
    const rows = this.emptyDelayMonthRows();
    const delayTotals = Array.from({ length: rows.length }, () => 0);
    const indexByKey = new Map(rows.map((row, index) => [row.key, index]));

    for (const demande of this.demandes()) {
      const endDate = this.decisionDate(demande);

      if (!endDate) {
        continue;
      }

      const monthIndex = indexByKey.get(endDate.slice(0, 7));

      if (monthIndex === undefined) {
        continue;
      }

      rows[monthIndex].completed += 1;
      delayTotals[monthIndex] += this.daysBetween(demande.submittedAt, endDate);
    }

    return rows.map((row, index) => ({
      ...row,
      value: row.completed > 0 ? this.roundOne(delayTotals[index] / row.completed) : 0,
    }));
  });

  readonly categoryVolumeRows = computed<AssuranceChartRow[]>(() =>
    this.horizontalRowsFromLabels(
      this.demandes().map((demande) => this.actLabel(demande.actCategory)),
    ),
  );

  readonly categoryAmountRows = computed<AssuranceChartRow[]>(() => {
    const totals = new Map<string, number>();

    for (const demande of this.demandes()) {
      const label = this.actLabel(demande.actCategory);
      totals.set(label, (totals.get(label) ?? 0) + demande.totalAmount);
    }

    return this.horizontalRows(Array.from(totals.entries()).map(([label, value]) => ({ label, value })));
  });

  readonly insights = computed<AssuranceAnalyticsInsight[]>(() => {
    const topCategory = this.categoryVolumeRows()[0];
    const topSource = this.channelMix()[0];
    const slaTarget = this.companySlaTarget();
    const slaTone: InsightTone = this.kpis().averageDelay <= slaTarget ? 'success' : 'warning';

    return [
      {
        actionLabel: 'Voir demandes',
        description: `Délai moyen actuel: ${this.kpis().averageDelay.toFixed(1)} jours pour une cible de ${slaTarget} jours.`,
        eyebrow: 'SLA',
        icon: 'timer',
        title: this.kpis().averageDelay <= slaTarget ? 'SLA cible tenu' : 'SLA cible à surveiller',
        tone: slaTone,
      },
      {
        actionLabel: 'Analyser',
        description: topCategory
          ? `${topCategory.label} concentre ${topCategory.value} demande(s).`
          : 'Aucune catégorie dominante.',
        eyebrow: 'Catégorie',
        icon: 'category',
        title: 'Catégorie d’acte principale',
        tone: 'info',
      },
      {
        actionLabel: 'Voir fraude',
        description: `${this.kpis().flagged} dossier(s) avec drapeaux actifs.`,
        eyebrow: 'Risque',
        icon: 'gpp_bad',
        title: 'Concentration fraude',
        tone: this.kpis().flagged > 0 ? 'error' : 'success',
      },
      {
        actionLabel: 'Exporter',
        description: topSource
          ? `${topSource.label} est le canal dominant.`
          : 'Aucun canal détecté.',
        eyebrow: 'Canal',
        icon: 'hub',
        title: 'Distribution des sources',
        tone: 'neutral',
      },
    ];
  });

  loadForCompany(companyId: string): void {
    this.companyId.set(companyId);
    this.demandes.set(
      this.storage.getItem<DemandeRemboursement[]>(
        this.storage.companyKey(companyId, 'demandes'),
        [],
      ),
    );
    this.settings.set(
      this.storage.getItem<CompanySettings | null>(
        this.storage.companyKey(companyId, 'settings'),
        null,
      ),
    );
    this.planTiers.set(
      this.storage.getItem<PlanTier[]>(this.storage.companyKey(companyId, 'plan_tiers'), []),
    );
  }

  exportCsv(name: string, rows: Array<Array<string | number>>): void {
    const blob = new Blob([rows.map((row) => row.map((cell) => this.csvCell(cell)).join(',')).join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${name}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  csvMatrix(
    headers: string[],
    rows: Array<Array<string | number>>,
  ): Array<Array<string | number>> {
    return [headers, ...rows];
  }

  private monthlyRows(
    demandes: DemandeRemboursement[],
    dateSelector: (demande: DemandeRemboursement) => string,
    valueSelector: (demande: DemandeRemboursement) => number,
  ): AssuranceMonthValueRow[] {
    const rows = this.emptyMonthRows();
    const indexByKey = new Map(rows.map((row, index) => [row.key, index]));

    for (const demande of demandes) {
      const monthIndex = indexByKey.get(dateSelector(demande).slice(0, 7));

      if (monthIndex !== undefined) {
        rows[monthIndex].value += valueSelector(demande);
      }
    }

    return rows;
  }

  private emptyMonthRows(): AssuranceMonthValueRow[] {
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

  private emptyApprovalMonthRows(): AssuranceMonthlyApprovalRow[] {
    return this.emptyMonthRows().map((row) => ({
      ...row,
      approved: 0,
      decided: 0,
    }));
  }

  private emptyDelayMonthRows(): AssuranceMonthlyDelayRow[] {
    return this.emptyMonthRows().map((row) => ({
      ...row,
      completed: 0,
    }));
  }

  private horizontalRowsFromLabels(labels: string[]): AssuranceChartRow[] {
    const counts = new Map<string, number>();

    for (const label of labels) {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    return this.horizontalRows(Array.from(counts.entries()).map(([label, value]) => ({ label, value })));
  }

  private horizontalRows(rows: Array<{ label: string; value: number }>): AssuranceChartRow[] {
    const max = Math.max(...rows.map((row) => row.value), 1);

    return rows
      .sort((left, right) => right.value - left.value)
      .map((row) => ({
        ...row,
        width: Math.max(6, Math.round((row.value / max) * 100)),
      }));
  }

  private decisionDate(demande: DemandeRemboursement): string | null {
    if (!this.isDecided(demande)) {
      return null;
    }

    return demande.respondedAt ?? demande.lastUpdatedAt ?? demande.submittedAt;
  }

  private isDecided(demande: DemandeRemboursement): boolean {
    return ['APPROUVEE', 'APPROUVEE_AUTO', 'APPROUVEE_PARTIELLEMENT', 'REFUSEE'].includes(
      demande.status,
    );
  }

  private isApproved(demande: DemandeRemboursement): boolean {
    return ['APPROUVEE', 'APPROUVEE_AUTO', 'APPROUVEE_PARTIELLEMENT'].includes(demande.status);
  }

  private daysBetween(startIso: string, endIso: string): number {
    return Math.max(
      1,
      Math.ceil((new Date(endIso).getTime() - new Date(startIso).getTime()) / 86_400_000),
    );
  }

  private roundOne(value: number): number {
    return Math.round(value * 10) / 10;
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

  private csvCell(value: string | number): string {
    const text = String(value);

    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }
}
