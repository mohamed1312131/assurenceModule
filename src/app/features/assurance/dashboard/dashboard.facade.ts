import { Injectable, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  AlertTriangle,
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  Clock,
  FileCheck,
  Hourglass,
  Percent,
  Plus,
  Send,
  Upload,
  Wallet,
  LucideIconData,
} from 'lucide-angular';

import { AuthService } from '../../../core/auth/auth.service';
import { LocalStorageService, STORAGE_KEYS } from '../../../core/storage/local-storage.service';
import { AutorisationPrealable } from '../../../models/autorisation-prealable.model';
import { CorporateContract } from '../../../models/corporate-contract.model';
import { DemandeRemboursement } from '../../../models/demande-remboursement.model';
import { InsuranceCompany } from '../../../models/insurance-company.model';
import { PlanTier } from '../../../models/plan-tier.model';
import {
  daysBetween,
  daysSince,
  formatTnd,
  isCurrentMonth,
} from '../../../shared/utils/formatters';

type CountUpFormat = 'integer' | 'decimal' | 'currency' | 'percent';
type KpiTone = 'primary' | 'secondary' | 'tertiary';
type InsightTone = 'info' | 'success' | 'warning' | 'error' | 'neutral';
type OperationalTone = 'info' | 'success' | 'warning' | 'error' | 'neutral';

export interface DashboardKpi {
  id: string;
  label: string;
  value: number;
  format: CountUpFormat;
  suffix?: string;
  trend?: string;
  icon: LucideIconData;
  tone: KpiTone;
  statusTone: OperationalTone;
  progress?: number;
}

export interface DashboardOperationSummary {
  treatmentCount: number;
  lateCount: number;
  pendingAuthorizations: number;
  sentence: string;
  tone: OperationalTone;
}

export interface DashboardSecondaryMetric {
  id: string;
  label: string;
  value: number;
  format: CountUpFormat;
  suffix?: string;
  trend: string;
  icon: LucideIconData;
  tone: OperationalTone;
}

export interface DashboardPriorityItem {
  id: string;
  label: string;
  value: string;
  detail: string;
  actionLabel: string;
  tone: OperationalTone;
  commands: string[];
  queryParams?: Record<string, string>;
}

export interface DashboardStatusBar {
  id: string;
  label: string;
  value: number;
  total: number;
  percent: number;
  tone: OperationalTone;
}

export interface DashboardInsight {
  id: string;
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  supportingData: string[];
  actionLabel: string;
  tone: InsightTone;
  commands: string[];
  queryParams?: Record<string, string>;
}

export interface QuickAction {
  id: string;
  label: string;
  disabled: boolean;
  icon: LucideIconData;
  helper?: string;
  commands?: string[];
  queryParams?: Record<string, string>;
}

export interface AssuranceDashboardData {
  companyId: string;
  companyName: string;
  subtitle: string;
  periodLabel: string;
  operationsSummary: DashboardOperationSummary;
  primaryKpis: DashboardKpi[];
  secondaryMetrics: DashboardSecondaryMetric[];
  treatmentPriorities: DashboardPriorityItem[];
  statusBars: DashboardStatusBar[];
  kpiRows: [DashboardKpi[], DashboardKpi[]];
  insights: DashboardInsight[];
  quickActions: QuickAction[];
}

@Injectable()
export class AssuranceDashboardFacade {
  private readonly storage = inject(LocalStorageService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly waitingStatuses: DemandeRemboursement['status'][] = [
    'SOUMISE',
    'DOCUMENTS_INCOMPLETS',
    'EN_EXAMEN',
  ];

  private readonly companyId = computed(
    () => this.auth.currentUser()?.companyId ?? this.routeCompanyId() ?? 'comar',
  );

  private readonly companies = computed(() =>
    this.storage.getItem<InsuranceCompany[]>(STORAGE_KEYS.companies, []),
  );

  private readonly demandes = computed(() =>
    this.storage.getItem<DemandeRemboursement[]>(
      this.storage.companyKey(this.companyId(), 'demandes'),
      [],
    ),
  );

  private readonly autorisations = computed(() =>
    this.storage.getItem<AutorisationPrealable[]>(
      this.storage.companyKey(this.companyId(), 'autorisations'),
      [],
    ),
  );

  private readonly contracts = computed(() =>
    this.storage.getItem<CorporateContract[]>(this.storage.companyKey(this.companyId(), 'contracts'), []),
  );

  private readonly planTiers = computed(() =>
    this.storage.getItem<PlanTier[]>(this.storage.companyKey(this.companyId(), 'plan_tiers'), []),
  );

  readonly kpis = computed(() => this.buildKpis());
  readonly insights = computed(() => this.buildInsights());

  readonly dashboardData = computed<AssuranceDashboardData>(() => {
    const companyId = this.companyId();

    return {
      companyId,
      companyName: this.companyName(),
      subtitle: `Vue opérationnelle assurance — ${this.currentMonthLabel()}`,
      periodLabel: this.currentMonthLabel(),
      operationsSummary: this.operationsSummary(),
      primaryKpis: this.kpis().slice(0, 4),
      secondaryMetrics: this.secondaryMetrics(),
      treatmentPriorities: this.treatmentPriorities(companyId),
      statusBars: this.statusBars(),
      kpiRows: [this.kpis().slice(0, 4), []],
      insights: this.insights().slice(0, 4),
      quickActions: this.quickActions(companyId),
    };
  });

  private buildKpis(): DashboardKpi[] {
    const demandes = this.demandes();
    const monthDemandes = demandes.filter((demande) => isCurrentMonth(demande.submittedAt));
    const waitingCount = demandes.filter((demande) =>
      this.waitingStatuses.includes(demande.status),
    ).length;
    const pendingAuthorizations = this.pendingAuthorizations().length;
    const lateCount = this.lateDemandes().length;

    return [
      {
        id: 'received-month',
        label: 'Demandes reçues ce mois',
        value: monthDemandes.length,
        format: 'integer',
        trend: 'Flux entrant',
        icon: ClipboardList,
        tone: 'primary',
        statusTone: 'info',
        progress: this.percent(monthDemandes.length, Math.max(demandes.length, 1)),
      },
      {
        id: 'waiting',
        label: 'En attente de traitement',
        value: waitingCount,
        format: 'integer',
        trend: 'File active',
        icon: Hourglass,
        tone: 'secondary',
        statusTone: waitingCount > 0 ? 'warning' : 'success',
        progress: this.percent(waitingCount, Math.max(demandes.length, 1)),
      },
      {
        id: 'authorizations',
        label: 'Autorisations en attente',
        value: pendingAuthorizations,
        format: 'integer',
        trend: 'Décision médicale',
        icon: FileCheck,
        tone: 'tertiary',
        statusTone: pendingAuthorizations > 0 ? 'info' : 'success',
        progress: this.percent(pendingAuthorizations, Math.max(this.autorisations().length, 1)),
      },
      {
        id: 'late',
        label: 'Retards SLA',
        value: lateCount,
        format: 'integer',
        trend: 'Urgence opérationnelle',
        icon: AlertTriangle,
        tone: 'primary',
        statusTone: lateCount > 0 ? 'error' : 'success',
        progress: this.percent(lateCount, Math.max(waitingCount, 1)),
      },
    ];
  }

  private buildInsights(): DashboardInsight[] {
    const companyId = this.companyId();
    const demandes = this.demandes();
    const monthDemandes = demandes.filter((demande) => isCurrentMonth(demande.submittedAt));
    const expiringContract = this.contracts().find(
      (contract) => contract.status === 'EXPIRATION_PROCHE',
    );
    const lateDemandes = this.lateDemandes();
    const highRiskCount = monthDemandes.filter((demande) => demande.riskScore === 'ELEVE').length;
    const approvedThisMonth = demandes
      .filter(
        (demande) =>
          this.isTerminalStatus(demande.status) &&
          isCurrentMonth(demande.respondedAt ?? demande.submittedAt),
      )
      .reduce((total, demande) => total + (demande.approvedAmount ?? 0), 0);

    return [
      {
        id: 'late-claims',
        icon: 'schedule',
        eyebrow: 'Retards SLA',
        title: 'Retards SLA',
        description: '',
        supportingData: [`${lateDemandes.length} dossier${lateDemandes.length > 1 ? 's' : ''}`],
        actionLabel: 'Voir',
        tone: lateDemandes.length > 0 ? 'error' : 'success',
        commands: ['/assurance', companyId, 'demandes'],
        queryParams: { filtre: 'retard' },
      },
      {
        id: 'contract-renewal',
        icon: 'apartment',
        eyebrow: 'Contrat groupe',
        title: expiringContract
          ? `Contrat ${expiringContract.employerName}`
          : 'Contrats groupe',
        description: '',
        supportingData: expiringContract
          ? [`Préavis: ${this.daysUntil(expiringContract.renewalNoticeDate)} jours`]
          : ['Aucun préavis proche'],
        actionLabel: 'Voir',
        tone: expiringContract ? 'warning' : 'success',
        commands: ['/assurance', companyId, 'entreprises'],
        queryParams: expiringContract ? { contrat: expiringContract.id } : undefined,
      },
      {
        id: 'fraud-alert',
        icon: 'shield_lock',
        eyebrow: 'Alerte fraude',
        title: 'Alerte fraude',
        description: '',
        supportingData: [
          `${highRiskCount} dossier${highRiskCount > 1 ? 's' : ''} élevé${highRiskCount > 1 ? 's' : ''}`,
        ],
        actionLabel: 'Voir',
        tone: highRiskCount > 0 ? 'error' : 'success',
        commands: ['/assurance', companyId, 'fraude'],
      },
      {
        id: 'financial-impact',
        icon: 'paid',
        eyebrow: 'Impact financier',
        title: 'Impact financier',
        description: '',
        supportingData: [formatTnd(approvedThisMonth)],
        actionLabel: 'Voir',
        tone: 'info',
        commands: ['/assurance', companyId, 'analytique'],
        queryParams: { vue: 'financiere' },
      },
    ];
  }

  private quickActions(companyId: string): QuickAction[] {
    return [
      {
        id: 'manual-claim',
        label: 'Nouvelle demande',
        disabled: true,
        icon: Plus,
        helper: 'Disponible depuis la file demandes.',
      },
      {
        id: 'csv-import',
        label: 'Import CSV',
        disabled: true,
        icon: Upload,
        helper: 'Import complet dans le module demandes.',
      },
      {
        id: 'late-claims',
        label: 'Voir demandes en retard',
        disabled: false,
        icon: ChartNoAxesColumnIncreasing,
        commands: ['/assurance', companyId, 'demandes'],
        queryParams: { filtre: 'retard' },
      },
      {
        id: 'adhesion-requests',
        label: 'Demandes d’adhésion',
        disabled: false,
        icon: ClipboardList,
        commands: ['/assurance', companyId, 'demandes-adhesion'],
      },
      {
        id: 'provider-reminder',
        label: 'Envoyer relance prestataire',
        disabled: true,
        icon: Send,
        helper: 'Relance prestataire prévue en workflow.',
      },
    ];
  }

  exportDashboardSnapshot(): void {
    const data = this.dashboardData();
    const rows: Array<Array<string | number>> = [
      ['Indicateur', 'Valeur'],
      ['Compagnie', data.companyName],
      ['Période', data.periodLabel],
      ['Demandes à traiter', data.operationsSummary.treatmentCount],
      ['Demandes en retard SLA', data.operationsSummary.lateCount],
      ['Autorisations en attente', data.operationsSummary.pendingAuthorizations],
      ...data.primaryKpis.map((kpi) => [kpi.label, kpi.value] as Array<string | number>),
      ...data.secondaryMetrics.map((metric) => [metric.label, metric.value] as Array<string | number>),
    ];

    this.exportCsv(`cockpit-${data.companyId}-${new Date().toISOString().slice(0, 10)}`, rows);
  }

  private operationsSummary(): DashboardOperationSummary {
    const treatmentCount = this.demandes().filter((demande) =>
      this.waitingStatuses.includes(demande.status),
    ).length;
    const lateCount = this.lateDemandes().length;
    const pendingAuthorizations = this.pendingAuthorizations().length;

    return {
      treatmentCount,
      lateCount,
      pendingAuthorizations,
      sentence: `${treatmentCount} demandes à traiter · ${lateCount} en retard SLA · ${pendingAuthorizations} autorisations en attente`,
      tone: lateCount > 0 ? 'error' : treatmentCount > 0 ? 'warning' : 'success',
    };
  }

  private secondaryMetrics(): DashboardSecondaryMetric[] {
    const completedDemandes = this.demandes().filter((demande) =>
      this.isTerminalStatus(demande.status),
    );
    const decidedDemandes = completedDemandes.filter(
      (demande) => demande.status !== 'DOCUMENTS_INCOMPLETS',
    );
    const approvedDemandes = completedDemandes.filter((demande) =>
      ['APPROUVEE', 'APPROUVEE_AUTO', 'APPROUVEE_PARTIELLEMENT'].includes(demande.status),
    );
    const approvalRate =
      decidedDemandes.length === 0 ? 0 : (approvedDemandes.length / decidedDemandes.length) * 100;
    const reimbursedThisMonth = completedDemandes
      .filter((demande) => isCurrentMonth(demande.respondedAt ?? demande.submittedAt))
      .reduce((total, demande) => total + (demande.approvedAmount ?? 0), 0);
    const avgDelay =
      completedDemandes.length === 0
        ? 0
        : completedDemandes.reduce((total, demande) => {
            if (!demande.respondedAt) {
              return total;
            }

            return total + daysBetween(demande.submittedAt, demande.respondedAt);
          }, 0) / completedDemandes.length;
    const highRiskCount = this.demandes().filter(
      (demande) => isCurrentMonth(demande.submittedAt) && demande.riskScore === 'ELEVE',
    ).length;

    return [
      {
        id: 'approval-rate',
        label: "Taux d'approbation",
        value: approvalRate,
        format: 'percent',
        trend: 'Décisions clôturées',
        icon: Percent,
        tone: approvalRate >= 70 ? 'success' : 'warning',
      },
      {
        id: 'reimbursed-month',
        label: 'Montant remboursé ce mois',
        value: reimbursedThisMonth,
        format: 'currency',
        trend: 'Impact validé',
        icon: Wallet,
        tone: 'info',
      },
      {
        id: 'avg-delay',
        label: 'Délai moyen traitement',
        value: avgDelay,
        format: 'decimal',
        suffix: ' jours',
        trend: 'Dossiers clôturés',
        icon: Clock,
        tone: avgDelay > 10 ? 'warning' : 'success',
      },
      {
        id: 'high-risk',
        label: 'Risque élevé',
        value: highRiskCount,
        format: 'integer',
        suffix: ` dossier${highRiskCount > 1 ? 's' : ''}`,
        trend: 'Ce mois',
        icon: AlertTriangle,
        tone: highRiskCount > 0 ? 'warning' : 'success',
      },
    ];
  }

  private treatmentPriorities(companyId: string): DashboardPriorityItem[] {
    const lateDemandes = this.lateDemandes();
    const incompleteCount = this.demandes().filter(
      (demande) => demande.status === 'DOCUMENTS_INCOMPLETS',
    ).length;
    const highRiskCount = this.demandes().filter(
      (demande) => isCurrentMonth(demande.submittedAt) && demande.riskScore === 'ELEVE',
    ).length;
    const pendingAuthorizations = this.pendingAuthorizations().length;

    return [
      {
        id: 'late',
        label: 'Retards SLA',
        value: `${lateDemandes.length}`,
        detail: lateDemandes[0] ? lateDemandes[0].patientName : 'Aucun retard ouvert',
        actionLabel: 'Voir demandes',
        tone: lateDemandes.length > 0 ? 'error' : 'success',
        commands: ['/assurance', companyId, 'demandes'],
        queryParams: { filtre: 'retard' },
      },
      {
        id: 'authorizations',
        label: 'Autorisations',
        value: `${pendingAuthorizations}`,
        detail: pendingAuthorizations > 0 ? 'Décisions médicales à valider' : 'File autorisations stable',
        actionLabel: 'Voir autorisations',
        tone: pendingAuthorizations > 0 ? 'info' : 'success',
        commands: ['/assurance', companyId, 'autorisations'],
      },
      {
        id: 'incomplete',
        label: 'Pièces à compléter',
        value: `${incompleteCount}`,
        detail: incompleteCount > 0 ? 'Relance adhérent ou prestataire' : 'Aucun dossier incomplet',
        actionLabel: 'Voir dossiers',
        tone: incompleteCount > 0 ? 'warning' : 'success',
        commands: ['/assurance', companyId, 'demandes'],
        queryParams: { statut: 'DOCUMENTS_INCOMPLETS' },
      },
      {
        id: 'risk',
        label: 'Risque élevé',
        value: `${highRiskCount}`,
        detail: highRiskCount > 0 ? 'Contrôle fraude recommandé' : 'Aucun signal élevé ce mois',
        actionLabel: 'Voir fraude',
        tone: highRiskCount > 0 ? 'error' : 'success',
        commands: ['/assurance', companyId, 'fraude'],
      },
    ];
  }

  private statusBars(): DashboardStatusBar[] {
    const demandes = this.demandes();
    const total = Math.max(demandes.length, 1);
    const approved = demandes.filter((demande) =>
      ['APPROUVEE', 'APPROUVEE_AUTO', 'APPROUVEE_PARTIELLEMENT'].includes(demande.status),
    ).length;
    const waiting = demandes.filter((demande) =>
      this.waitingStatuses.includes(demande.status),
    ).length;
    const rejected = demandes.filter((demande) => demande.status === 'REFUSEE').length;

    return [
      {
        id: 'approved',
        label: 'Approuvées',
        value: approved,
        total: demandes.length,
        percent: this.percent(approved, total),
        tone: 'success',
      },
      {
        id: 'waiting',
        label: 'En traitement',
        value: waiting,
        total: demandes.length,
        percent: this.percent(waiting, total),
        tone: 'warning',
      },
      {
        id: 'rejected',
        label: 'Refusées',
        value: rejected,
        total: demandes.length,
        percent: this.percent(rejected, total),
        tone: 'error',
      },
    ];
  }

  private lateDemandes(): DemandeRemboursement[] {
    const plans = this.planTiers();

    return this.demandes()
      .filter((demande) => {
        if (this.isTerminalStatus(demande.status)) {
          return false;
        }

        const plan = plans.find((planTier) => planTier.name === demande.planTierName);
        const slaTargetDays = plan?.slaTargetDays ?? 10;

        return daysSince(demande.submittedAt) > slaTargetDays;
      })
      .sort(
        (left, right) =>
          new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime(),
      );
  }

  private pendingAuthorizations(): AutorisationPrealable[] {
    return this.autorisations().filter((autorisation) =>
      ['EN_ATTENTE', 'EN_EXAMEN'].includes(autorisation.status),
    );
  }

  private companyName(): string {
    return this.companies().find((company) => company.id === this.companyId())?.name ?? 'Assurance';
  }

  private currentMonthLabel(): string {
    const label = new Intl.DateTimeFormat('fr-TN', {
      month: 'long',
      year: 'numeric',
    })
      .format(new Date());

    return `${label.charAt(0).toLocaleUpperCase('fr-TN')}${label.slice(1)}`;
  }

  private isTerminalStatus(status: DemandeRemboursement['status']): boolean {
    return ['APPROUVEE', 'APPROUVEE_PARTIELLEMENT', 'APPROUVEE_AUTO', 'REFUSEE'].includes(status);
  }

  private percent(value: number, total: number): number {
    return Math.min(100, Math.round((value / Math.max(total, 1)) * 100));
  }

  private exportCsv(name: string, rows: Array<Array<string | number>>): void {
    const blob = new Blob(
      [rows.map((row) => row.map((cell) => this.csvCell(cell)).join(',')).join('\n')],
      {
        type: 'text/csv;charset=utf-8',
      },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `${name}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private csvCell(value: string | number): string {
    const cell = `${value}`;
    return /[",\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
  }

  private daysUntil(isoDate: string): number {
    return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000));
  }

  private routeCompanyId(): string | null {
    let currentRoute: ActivatedRoute | null = this.route;

    while (currentRoute) {
      const companyId = currentRoute.snapshot.paramMap.get('companyId');

      if (companyId) {
        return companyId;
      }

      currentRoute = currentRoute.parent;
    }

    return null;
  }
}
