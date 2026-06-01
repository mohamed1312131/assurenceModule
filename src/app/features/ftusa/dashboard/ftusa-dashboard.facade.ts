import { Injectable, computed, signal } from '@angular/core';

import { AutorisationPrealable } from '../../../models/autorisation-prealable.model';
import { DemandeRemboursement } from '../../../models/demande-remboursement.model';
import { InsuranceCompany } from '../../../models/insurance-company.model';
import { PlanTier } from '../../../models/plan-tier.model';
import { ActCategory, CompanySettings } from '../../../models/shared.model';

type InsightTone = 'info' | 'success' | 'warning' | 'error' | 'neutral';

export interface FtusaKpis {
  activeCompanies: number;
  totalCompanies: number;
  demandesThisMonth: number;
  omnicareVolume: number;
  omnicarePercent: number;
  approvalRate: number;
  averageDelay: number;
  flaggedCount: number;
  companiesOverSla: number;
}

export interface FtusaInsight {
  icon: string;
  eyebrow: string;
  title: string;
  description: string;
  supportingData: string[];
  actionLabel: string;
  actionRoute: string;
  tone: InsightTone;
}

export interface FtusaActivity {
  id: string;
  timestamp: string;
  companyCode: string;
  icon: string;
  description: string;
  tone: InsightTone;
}

interface CompanyAggregate {
  company: InsuranceCompany;
  settings: CompanySettings;
  demandes: DemandeRemboursement[];
  autorisations: AutorisationPrealable[];
  planTiers: PlanTier[];
}

@Injectable({ providedIn: 'root' })
export class FtusaDashboardFacade {
  readonly companies = signal<InsuranceCompany[]>([]);
  readonly aggregates = signal<CompanyAggregate[]>([]);

  readonly allDemandes = computed(() => this.aggregates().flatMap((aggregate) => aggregate.demandes));
  readonly allAutorisations = computed(() =>
    this.aggregates().flatMap((aggregate) => aggregate.autorisations),
  );

  readonly currentMonth = computed(() => new Date().toISOString().slice(0, 7));

  readonly currentMonthLabel = computed(() =>
    new Intl.DateTimeFormat('fr-TN', { month: 'long', year: 'numeric' }).format(new Date()),
  );

  readonly kpis = computed<FtusaKpis>(() => {
    const companies = this.companies();
    const currentMonth = this.currentMonth();
    // Normalize every market KPI to the same window: the current calendar month.
    const monthly = this.allDemandes().filter((demande) =>
      demande.submittedAt.startsWith(currentMonth),
    );
    const decided = monthly.filter((demande) =>
      ['APPROUVEE', 'APPROUVEE_AUTO', 'APPROUVEE_PARTIELLEMENT', 'REFUSEE'].includes(
        demande.status,
      ),
    );
    const approved = decided.filter((demande) =>
      ['APPROUVEE', 'APPROUVEE_AUTO', 'APPROUVEE_PARTIELLEMENT'].includes(demande.status),
    );
    const completed = monthly.filter((demande) => demande.respondedAt);
    const totalDelay = completed.reduce(
      (total, demande) => total + this.daysBetween(demande.submittedAt, demande.respondedAt ?? demande.lastUpdatedAt),
      0,
    );
    const omnicareVolume = monthly.filter((demande) => demande.source === 'OMNICARE').length;

    return {
      activeCompanies: companies.filter((company) => company.status === 'ACTIVE').length,
      approvalRate: decided.length > 0 ? approved.length / decided.length : 0,
      averageDelay: completed.length > 0 ? totalDelay / completed.length : 0,
      companiesOverSla: this.companiesOverSla(currentMonth),
      demandesThisMonth: monthly.length,
      flaggedCount: monthly.filter((demande) => demande.flags.length > 0).length,
      omnicarePercent: monthly.length > 0 ? omnicareVolume / monthly.length : 0,
      omnicareVolume,
      totalCompanies: companies.length,
    };
  });

  readonly insights = computed<FtusaInsight[]>(() => {
    const topEmployers = this.topEmployers();
    const topCategory = this.topCategory();

    return [
      {
        actionLabel: 'Ouvrir fraude',
        actionRoute: '/ftusa/fraude',
        description: `${this.kpis().flaggedCount} dossiers flagués dans les compagnies opt-in.`,
        eyebrow: 'Alerte',
        icon: 'gpp_bad',
        supportingData: ['Doublons et prestataires hors réseau inclus', 'Partage limité aux opt-in'],
        title: 'Alerte fraude inter-compagnies',
        tone: this.kpis().flaggedCount > 0 ? 'error' : 'success',
      },
      {
        actionLabel: 'Voir analytique',
        actionRoute: '/ftusa/analytique',
        description: 'Volume OmniCare en croissance de 18 % sur un an.',
        eyebrow: 'Croissance',
        icon: 'trending_up',
        supportingData: [`${this.kpis().omnicareVolume} dossiers OmniCare`, 'Projection annuelle positive'],
        title: 'Croissance marché',
        tone: 'success',
      },
      {
        actionLabel: 'Envoyer communication',
        actionRoute: '/ftusa/communications',
        description: '5 compagnies n’ont pas encore confirmé la mise à jour des plafonds 2026.',
        eyebrow: 'Opérations',
        icon: 'campaign',
        supportingData: ['Action recommandée: rappel réglementaire', 'Modèle de message prêt'],
        title: 'Compagnies à risque opérationnel',
        tone: 'warning',
      },
      {
        actionLabel: 'Voir compagnies',
        actionRoute: '/ftusa/compagnies',
        description: topEmployers.length
          ? `${topEmployers[0].name} domine le volume groupe opt-in.`
          : 'Aucun contrat groupe dans les données opt-in.',
        eyebrow: 'Corporate',
        icon: 'business',
        supportingData: topEmployers.map((employer) => `${employer.name}: ${employer.count} dossier(s)`),
        title: 'Concentration corporate',
        tone: 'info',
      },
      {
        actionLabel: 'Voir couverture',
        actionRoute: '/ftusa/analytique',
        description: '18 gouvernorats couverts par les réseaux déclarés.',
        eyebrow: 'Couverture',
        icon: 'map',
        supportingData: ['Tunis, Sousse et Sfax très couverts', 'Zones intérieures à renforcer'],
        title: 'Couverture nationale',
        tone: 'neutral',
      },
      {
        actionLabel: 'Analyser catégorie',
        actionRoute: '/ftusa/analytique',
        description: topCategory
          ? `${this.actLabel(topCategory.category)} est la catégorie la plus dynamique.`
          : 'Aucune catégorie dominante détectée.',
        eyebrow: 'Tendance',
        icon: 'category',
        supportingData: topCategory ? [`${topCategory.count} demande(s)`, 'Croissance simulée: +11 %'] : [],
        title: 'Catégorie en croissance',
        tone: 'info',
      },
    ];
  });

  readonly activityFeed = computed<FtusaActivity[]>(() => {
    const events: FtusaActivity[] = [];

    for (const aggregate of this.aggregates()) {
      const companyCode = aggregate.company.code;

      for (const demande of aggregate.demandes) {
        if (demande.respondedAt && this.isApproved(demande.status)) {
          events.push({
            companyCode,
            description: `${companyCode} — Demande approuvée ${this.formatCurrency(demande.approvedAmount ?? demande.totalAmount)}`,
            icon: 'task_alt',
            id: `${demande.id}-approved`,
            timestamp: demande.respondedAt,
            tone: 'success',
          });
        }

        if (demande.flags.length > 0) {
          events.push({
            companyCode,
            description: `${companyCode} — Nouveau dossier fraude détecté`,
            icon: 'gpp_bad',
            id: `${demande.id}-flagged`,
            timestamp: demande.submittedAt,
            tone: 'error',
          });
        }
      }

      for (const autorisation of aggregate.autorisations) {
        if (autorisation.status === 'APPROUVEE_AUTO') {
          events.push({
            companyCode,
            description: `${companyCode} — Autorisation préalable expirée → auto-approuvée`,
            icon: 'event_available',
            id: `${autorisation.id}-auto`,
            timestamp: autorisation.respondedAt ?? autorisation.expiresAt,
            tone: 'warning',
          });
        }
      }
    }

    return events
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 10);
  });

  load(): void {
    const companies = this.readJson<InsuranceCompany[]>('omnicare_ftusa_companies', []);
    this.companies.set(companies);
    this.aggregates.set(
      companies
        .map((company) => this.buildAggregate(company))
        .filter((aggregate): aggregate is CompanyAggregate => !!aggregate),
    );
  }

  private buildAggregate(company: InsuranceCompany): CompanyAggregate | null {
    const settings = this.readJson<CompanySettings | null>(
      `omnicare_ins_${company.id}_settings`,
      null,
    );

    if (!settings?.participatesInMarketAnalytics) {
      return null;
    }

    return {
      autorisations: this.readJson<AutorisationPrealable[]>(
        `omnicare_ins_${company.id}_autorisations`,
        [],
      ),
      company,
      demandes: this.readJson<DemandeRemboursement[]>(`omnicare_ins_${company.id}_demandes`, []),
      planTiers: this.readJson<PlanTier[]>(`omnicare_ins_${company.id}_plan_tiers`, []),
      settings,
    };
  }

  private companiesOverSla(currentMonth: string): number {
    return this.aggregates().filter((aggregate) => {
      const completed = aggregate.demandes.filter(
        (demande) => demande.respondedAt && demande.submittedAt.startsWith(currentMonth),
      );

      if (completed.length === 0) {
        return false;
      }

      const totalDelay = completed.reduce(
        (total, demande) => total + this.daysBetween(demande.submittedAt, demande.respondedAt ?? demande.lastUpdatedAt),
        0,
      );
      const averageDelay = totalDelay / completed.length;
      const averageSla = this.averageSlaTarget(aggregate);

      return averageDelay > averageSla;
    }).length;
  }

  private averageSlaTarget(aggregate: CompanyAggregate): number {
    if (aggregate.planTiers.length === 0) {
      return aggregate.settings.defaultSlaDays;
    }

    const total = aggregate.planTiers.reduce((sum, plan) => sum + plan.slaTargetDays, 0);
    return total / aggregate.planTiers.length;
  }

  private topEmployers(): Array<{ name: string; count: number }> {
    const counts = new Map<string, number>();

    for (const demande of this.allDemandes()) {
      if (demande.employerName) {
        counts.set(demande.employerName, (counts.get(demande.employerName) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ count, name }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 3);
  }

  private topCategory(): { category: ActCategory; count: number } | null {
    const counts = new Map<ActCategory, number>();

    for (const demande of this.allDemandes()) {
      counts.set(demande.actCategory, (counts.get(demande.actCategory) ?? 0) + 1);
    }

    return (
      Array.from(counts.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((left, right) => right.count - left.count)[0] ?? null
    );
  }

  private isApproved(status: DemandeRemboursement['status']): boolean {
    return ['APPROUVEE', 'APPROUVEE_AUTO', 'APPROUVEE_PARTIELLEMENT'].includes(status);
  }

  private daysBetween(startIso: string, endIso: string): number {
    return Math.max(
      1,
      Math.ceil((new Date(endIso).getTime() - new Date(startIso).getTime()) / 86_400_000),
    );
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

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      currency: 'TND',
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(value);
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
