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
import { Communication } from '../../../models/communication.model';
import { CorporateContract } from '../../../models/corporate-contract.model';
import { DemandeRemboursement } from '../../../models/demande-remboursement.model';
import { InsuranceCompany } from '../../../models/insurance-company.model';
import { PlanTier } from '../../../models/plan-tier.model';
import {
  daysBetween,
  daysSince,
  formatDecimal,
  formatFullDate,
  formatPercent,
  formatTnd,
  isCurrentMonth,
} from '../../../shared/utils/formatters';

type CountUpFormat = 'integer' | 'decimal' | 'currency' | 'percent';
type KpiTone = 'primary' | 'secondary' | 'tertiary';
type InsightTone = 'info' | 'success' | 'warning' | 'error' | 'neutral';

export interface DashboardKpi {
  id: string;
  label: string;
  value: number;
  format: CountUpFormat;
  suffix?: string;
  trend?: string;
  icon: LucideIconData;
  tone: KpiTone;
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
  commands?: string[];
  queryParams?: Record<string, string>;
}

export interface AssuranceDashboardData {
  companyId: string;
  companyName: string;
  subtitle: string;
  kpiRows: [DashboardKpi[], DashboardKpi[]];
  insights: DashboardInsight[];
  quickActions: QuickAction[];
}

@Injectable()
export class AssuranceDashboardFacade {
  private readonly storage = inject(LocalStorageService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  private readonly companyId = computed(
    () => this.auth.currentUser()?.companyId ?? this.routeCompanyId() ?? 'star',
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

  private readonly communications = computed(() =>
    this.storage.getItem<Communication[]>(STORAGE_KEYS.communications, []),
  );

  readonly kpis = computed(() => this.buildKpis());
  readonly insights = computed(() => this.buildInsights());

  readonly dashboardData = computed<AssuranceDashboardData>(() => {
    const companyId = this.companyId();

    return {
      companyId,
      companyName: this.companyName(),
      subtitle: `Vue assurance au ${formatFullDate(new Date())}`,
      kpiRows: [this.kpis().slice(0, 4), this.kpis().slice(4)],
      insights: this.insights(),
      quickActions: this.quickActions(companyId),
    };
  });

  private buildKpis(): DashboardKpi[] {
    const demandes = this.demandes();
    const monthDemandes = demandes.filter((demande) => isCurrentMonth(demande.submittedAt));
    const waitingStatuses = ['SOUMISE', 'DOCUMENTS_INCOMPLETS', 'EN_EXAMEN'];
    const completedDemandes = demandes.filter((demande) => this.isTerminalStatus(demande.status));
    const decidedDemandes = completedDemandes.filter((demande) => demande.status !== 'DOCUMENTS_INCOMPLETS');
    const approvedDemandes = completedDemandes.filter((demande) =>
      ['APPROUVEE', 'APPROUVEE_AUTO', 'APPROUVEE_PARTIELLEMENT'].includes(demande.status),
    );
    const avgDelay =
      completedDemandes.length === 0
        ? 0
        : completedDemandes.reduce((total, demande) => {
            if (!demande.respondedAt) {
              return total;
            }

            return total + daysBetween(demande.submittedAt, demande.respondedAt);
          }, 0) / completedDemandes.length;
    const approvalRate =
      decidedDemandes.length === 0 ? 0 : (approvedDemandes.length / decidedDemandes.length) * 100;
    const reimbursedThisMonth = completedDemandes
      .filter((demande) => isCurrentMonth(demande.respondedAt ?? demande.submittedAt))
      .reduce((total, demande) => total + (demande.approvedAmount ?? 0), 0);

    return [
      {
        id: 'received-month',
        label: 'Demandes reçues ce mois',
        value: monthDemandes.length,
        format: 'integer',
        trend: '+12% vs mois précédent',
        icon: ClipboardList,
        tone: 'primary',
      },
      {
        id: 'waiting',
        label: 'En attente de traitement',
        value: demandes.filter((demande) => waitingStatuses.includes(demande.status)).length,
        format: 'integer',
        trend: 'À prioriser cette semaine',
        icon: Hourglass,
        tone: 'secondary',
      },
      {
        id: 'authorizations',
        label: 'Autorisations en attente',
        value: this.autorisations().filter((autorisation) =>
          ['EN_ATTENTE', 'EN_EXAMEN'].includes(autorisation.status),
        ).length,
        format: 'integer',
        trend: 'Délai légal de 15 jours',
        icon: FileCheck,
        tone: 'tertiary',
      },
      {
        id: 'avg-delay',
        label: 'Délai moyen de traitement',
        value: avgDelay,
        format: 'decimal',
        suffix: ' jours',
        trend: '-0,8 j vs mois précédent',
        icon: Clock,
        tone: 'primary',
      },
      {
        id: 'approval-rate',
        label: "Taux d'approbation",
        value: approvalRate,
        format: 'percent',
        trend: 'Décisions clôturées',
        icon: Percent,
        tone: 'secondary',
      },
      {
        id: 'reimbursed-month',
        label: 'Montant remboursé ce mois',
        value: reimbursedThisMonth,
        format: 'currency',
        trend: 'Tous canaux confondus',
        icon: Wallet,
        tone: 'tertiary',
      },
      {
        id: 'late',
        label: 'Demandes en retard SLA',
        value: this.lateDemandes().length,
        format: 'integer',
        trend: 'Selon SLA du plan',
        icon: AlertTriangle,
        tone: 'primary',
      },
    ];
  }

  private buildInsights(): DashboardInsight[] {
    const companyId = this.companyId();
    const demandes = this.demandes();
    const monthDemandes = demandes.filter((demande) => isCurrentMonth(demande.submittedAt));
    const kineCount = monthDemandes.filter(
      (demande) => demande.actCategory === 'KINESITHERAPIE',
    ).length;
    const kineShare = monthDemandes.length === 0 ? 0 : (kineCount / monthDemandes.length) * 100;
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
    const unreadCount = this.unreadCommunicationsCount();

    return [
      {
        id: 'kine-opportunity',
        icon: 'trending_up',
        eyebrow: 'Opportunité',
        title: `Kinésithérapie représente ${formatPercent(kineShare)}% des demandes ce mois`,
        description: `${kineCount} dossier${kineCount > 1 ? 's' : ''} sur ${monthDemandes.length} demande${monthDemandes.length > 1 ? 's' : ''} reçue${monthDemandes.length > 1 ? 's' : ''}.`,
        supportingData: ['Canal OmniCare majoritaire', 'Potentiel offre dédiée à surveiller'],
        actionLabel: 'Voir analytique',
        tone: 'success',
        commands: ['/assurance', companyId, 'analytique'],
        queryParams: { categorie: 'KINESITHERAPIE' },
      },
      {
        id: 'contract-renewal',
        icon: 'apartment',
        eyebrow: 'Alerte contrat groupe',
        title: expiringContract
          ? `Contrat ${expiringContract.employerName} expire dans ${this.daysUntil(expiringContract.renewalNoticeDate)} jours`
          : 'Aucun contrat groupe en expiration proche',
        description: expiringContract
          ? 'Préparer le dossier de renouvellement avec le ratio sinistres à jour.'
          : 'Les contrats actifs restent dans leurs délais de suivi.',
        supportingData: expiringContract
          ? [
              `Ratio sinistres: ${formatDecimal(expiringContract.claimsRatio * 100)}%`,
              `Prime annuelle: ${formatTnd(expiringContract.annualPremium)}`,
            ]
          : [],
        actionLabel: 'Voir entreprises',
        tone: 'warning',
        commands: ['/assurance', companyId, 'entreprises'],
        queryParams: expiringContract ? { contrat: expiringContract.id } : undefined,
      },
      {
        id: 'late-claims',
        icon: 'schedule',
        eyebrow: 'Demandes en retard',
        title: `${lateDemandes.length} dossier${lateDemandes.length > 1 ? 's' : ''} dépasse${lateDemandes.length > 1 ? 'nt' : ''} le délai SLA`,
        description:
          lateDemandes.length > 0
            ? 'Ces dossiers doivent être priorisés avant escalade opérationnelle.'
            : 'Aucun dossier ouvert ne dépasse actuellement le délai SLA.',
        supportingData: lateDemandes.slice(0, 2).map((demande) => demande.patientName),
        actionLabel: 'Voir demandes',
        tone: lateDemandes.length > 0 ? 'error' : 'success',
        commands: ['/assurance', companyId, 'demandes'],
        queryParams: { filtre: 'retard' },
      },
      {
        id: 'fraud-alert',
        icon: 'shield_lock',
        eyebrow: 'Alerte fraude',
        title: `${highRiskCount} demande${highRiskCount > 1 ? 's' : ''} flaguée${highRiskCount > 1 ? 's' : ''} risque ÉLEVÉ ce mois`,
        description:
          highRiskCount > 0
            ? 'Concentration sur dossiers à montant élevé ou autorisation manquante.'
            : 'Aucune nouvelle demande à risque élevé ce mois.',
        supportingData: ['Contrôles internes actifs', 'Partage FTUSA soumis à opt-in'],
        actionLabel: 'Voir fraude',
        tone: highRiskCount > 0 ? 'error' : 'success',
        commands: ['/assurance', companyId, 'fraude'],
      },
      {
        id: 'financial-impact',
        icon: 'paid',
        eyebrow: 'Impact financier',
        title: `Montants approuvés ce mois: ${formatTnd(approvedThisMonth)}`,
        description: `Économies règles tarifaires: ${formatTnd(8400)}.`,
        supportingData: ['Montants refusés ou plafonnés selon règles du plan'],
        actionLabel: 'Voir analytique',
        tone: 'info',
        commands: ['/assurance', companyId, 'analytique'],
        queryParams: { vue: 'financiere' },
      },
      {
        id: 'ftusa-communications',
        icon: 'campaign',
        eyebrow: 'Communications FTUSA',
        title: `${unreadCount} message${unreadCount > 1 ? 's' : ''} FTUSA non lu${unreadCount > 1 ? 's' : ''}`,
        description:
          unreadCount > 0
            ? 'Consulter les messages prioritaires transmis par la fédération.'
            : 'Tous les messages FTUSA transmis à votre compagnie sont lus.',
        supportingData: ['Messages urgents affichés à la connexion'],
        actionLabel: 'Voir communications',
        tone: unreadCount > 0 ? 'warning' : 'neutral',
        commands: ['/assurance', companyId, 'dashboard'],
        queryParams: { section: 'communications-ftusa' },
      },
    ];
  }

  private quickActions(companyId: string): QuickAction[] {
    return [
      {
        id: 'manual-claim',
        label: 'Nouvelle demande manuelle',
        disabled: true,
        icon: Plus,
      },
      {
        id: 'csv-import',
        label: 'Importer un lot CSV',
        disabled: true,
        icon: Upload,
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
        id: 'provider-reminder',
        label: 'Envoyer relance prestataire',
        disabled: true,
        icon: Send,
      },
    ];
  }

  private lateDemandes(): DemandeRemboursement[] {
    const plans = this.planTiers();

    return this.demandes().filter((demande) => {
      if (this.isTerminalStatus(demande.status)) {
        return false;
      }

      const plan = plans.find((planTier) => planTier.name === demande.planTierName);
      const slaTargetDays = plan?.slaTargetDays ?? 10;

      return daysSince(demande.submittedAt) > slaTargetDays;
    });
  }

  private unreadCommunicationsCount(): number {
    const companyId = this.companyId();

    return this.communications().filter((communication) => {
      const isRecipient =
        communication.recipientCompanyIds.length === 0 ||
        communication.recipientCompanyIds.includes(companyId);
      const hasRead = communication.readReceipts.some((receipt) => receipt.companyId === companyId);

      return isRecipient && !hasRead;
    }).length;
  }

  private companyName(): string {
    return this.companies().find((company) => company.id === this.companyId())?.name ?? 'Assurance';
  }

  private isTerminalStatus(status: DemandeRemboursement['status']): boolean {
    return ['APPROUVEE', 'APPROUVEE_PARTIELLEMENT', 'APPROUVEE_AUTO', 'REFUSEE'].includes(status);
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
