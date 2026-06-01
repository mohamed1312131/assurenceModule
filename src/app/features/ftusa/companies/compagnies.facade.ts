import { Injectable, computed, signal } from '@angular/core';

import { AdminAccount } from '../../../models/admin-account.model';
import { Adherent } from '../../../models/adherent.model';
import { InsuranceCompany } from '../../../models/insurance-company.model';
import { CoverageRule, PlanTier } from '../../../models/plan-tier.model';
import { ActCategory, CompanySettings } from '../../../models/shared.model';

export interface CompagniesFilter {
  statuses: Array<InsuranceCompany['status']>;
  search: string | null;
}

export interface TenantCreationInput {
  company: Omit<InsuranceCompany, 'id' | 'logoUrl' | 'status' | 'onboardedAt' | 'onboardingCompleted'>;
  adminName: string;
  adminEmail: string;
  planTier: PlanTier;
  importedAdherentsCount: number;
  participatesInCrossFraudDetection: boolean;
  participatesInMarketAnalytics: boolean;
}

const EMPTY_FILTERS: CompagniesFilter = {
  search: null,
  statuses: [],
};

@Injectable({ providedIn: 'root' })
export class CompagniesFacade {
  readonly allCompanies = signal<InsuranceCompany[]>([]);
  readonly admins = signal<AdminAccount[]>([]);
  readonly filters = signal<CompagniesFilter>({ ...EMPTY_FILTERS });

  readonly filteredCompanies = computed(() =>
    this.allCompanies()
      .filter((company) => this.matchesFilters(company))
      .sort((left, right) => left.name.localeCompare(right.name, 'fr')),
  );

  load(): void {
    this.allCompanies.set(this.readJson<InsuranceCompany[]>('omnicare_ftusa_companies', []));
    this.admins.set(this.readJson<AdminAccount[]>('omnicare_ftusa_admins', []));
  }

  updateFilter(partial: Partial<CompagniesFilter>): void {
    this.filters.update((current) => ({
      ...current,
      ...partial,
    }));
  }

  addCompany(company: InsuranceCompany): void {
    const next = [...this.allCompanies(), company];
    this.allCompanies.set(next);
    this.persist('omnicare_ftusa_companies', next);
  }

  suspendCompany(companyId: string): void {
    this.updateCompanyStatus(companyId, 'SUSPENDUE');
  }

  reactivateCompany(companyId: string): void {
    this.updateCompanyStatus(companyId, 'ACTIVE');
  }

  resetAccess(_companyId: string): void {
    // Demo-only action. Access reset is simulated in the component snackbar.
  }

  createTenant(input: TenantCreationInput): InsuranceCompany {
    const companyId = this.uniqueCompanyId(input.company.code);
    const now = new Date().toISOString();
    const company: InsuranceCompany = {
      ...input.company,
      id: companyId,
      logoUrl: `/assets/logos/${companyId}.svg`,
      onboardedAt: now,
      onboardingCompleted: true,
      participatesInCrossFraudDetection: input.participatesInCrossFraudDetection,
      participatesInMarketAnalytics: input.participatesInMarketAnalytics,
      status: 'ACTIVE',
    };
    const admin: AdminAccount = {
      companyId,
      email: input.adminEmail,
      id: `admin-${companyId}-${Date.now()}`,
      name: input.adminName,
      role: 'ASSURANCE_ADMIN',
      status: 'ACTIVE',
    };
    const settings: CompanySettings = {
      companyId,
      defaultSlaDays: input.planTier.slaTargetDays,
      participatesInCrossFraudDetection: input.participatesInCrossFraudDetection,
      participatesInMarketAnalytics: input.participatesInMarketAnalytics,
      priorAuthCategories: input.planTier.requiresPriorAuth,
    };
    const planTier: PlanTier = {
      ...input.planTier,
      companyId,
      id: `${companyId}-${this.slug(input.planTier.name)}`,
    };

    this.addCompany(company);
    const admins = [...this.admins(), admin];
    this.admins.set(admins);
    this.persist('omnicare_ftusa_admins', admins);
    this.persist(`omnicare_ins_${companyId}_plan_tiers`, [planTier]);
    this.persist(`omnicare_ins_${companyId}_settings`, settings);
    this.persist(`omnicare_ins_${companyId}_adherents`, this.mockImportedAdherents(companyId, planTier, input.importedAdherentsCount));
    this.persist(`omnicare_ins_${companyId}_demandes`, []);
    this.persist(`omnicare_ins_${companyId}_autorisations`, []);
    this.persist(`omnicare_ins_${companyId}_contracts`, []);
    this.persist(`omnicare_ins_${companyId}_network`, []);

    return company;
  }

  adminFor(companyId: string): AdminAccount | undefined {
    return this.admins().find((admin) => admin.companyId === companyId);
  }

  settingsFor(companyId: string): CompanySettings | null {
    return this.readJson<CompanySettings | null>(`omnicare_ins_${companyId}_settings`, null);
  }

  planFromTemplate(
    companyId: string,
    template: 'BASIQUE' | 'CONFORT' | 'PREMIUM' | 'PERSONNALISE',
    customName = 'Personnalisé',
    customCoverage: Partial<Record<ActCategory, number>> = {},
  ): PlanTier {
    const averageCoverage = template === 'BASIQUE' ? 25 : template === 'PREMIUM' ? 60 : 40;
    const name =
      template === 'BASIQUE'
        ? 'Basique'
        : template === 'PREMIUM'
          ? 'Premium'
          : template === 'PERSONNALISE'
            ? customName
            : 'Confort';

    return {
      autoApproveThreshold: averageCoverage === 25 ? 120 : averageCoverage === 40 ? 250 : 450,
      claimFilingDeadlineDays: averageCoverage === 25 ? 30 : 45,
      companyId,
      coverageRules: this.coverageRules(averageCoverage, customCoverage),
      description: `Plan ${name.toLowerCase()} créé lors de l’onboarding`,
      id: `${companyId}-${this.slug(name)}`,
      monthlyPremium: averageCoverage === 25 ? 60 : averageCoverage === 40 ? 115 : 210,
      name,
      reinsuranceThreshold: averageCoverage === 25 ? 5000 : averageCoverage === 40 ? 8000 : 12000,
      requiresPriorAuth:
        averageCoverage === 25
          ? ['CHIRURGIE', 'HOSPITALISATION']
          : ['CHIRURGIE', 'HOSPITALISATION', 'MATERNITE'],
      slaTargetDays: averageCoverage === 25 ? 12 : averageCoverage === 40 ? 10 : 7,
    };
  }

  private updateCompanyStatus(companyId: string, status: InsuranceCompany['status']): void {
    const next = this.allCompanies().map((company) =>
      company.id === companyId ? { ...company, status } : company,
    );
    this.allCompanies.set(next);
    this.persist('omnicare_ftusa_companies', next);
  }

  private matchesFilters(company: InsuranceCompany): boolean {
    const filters = this.filters();

    if (filters.statuses.length > 0 && !filters.statuses.includes(company.status)) {
      return false;
    }

    const search = filters.search?.trim().toLowerCase();

    if (
      search &&
      !company.name.toLowerCase().includes(search) &&
      !company.code.toLowerCase().includes(search)
    ) {
      return false;
    }

    return true;
  }

  private coverageRules(
    averageCoverage: 25 | 40 | 60,
    customCoverage: Partial<Record<ActCategory, number>>,
  ): CoverageRule[] {
    const isBasique = averageCoverage === 25;
    const isConfort = averageCoverage === 40;
    const categories: ActCategory[] = [
      'CONSULTATION',
      'CHIRURGIE',
      'KINESITHERAPIE',
      'SOINS_INFIRMIERS',
      'RADIOLOGIE',
      'BIOLOGIE',
      'HOSPITALISATION',
      'DENTAIRE',
      'OPTIQUE',
      'PSYCHIATRIE',
      'MATERNITE',
      'URGENCES',
      'AUTRE',
    ];

    return categories.map((category) => ({
      actCategory: category,
      coveragePercent:
        customCoverage[category] ??
        (isBasique ? 25 : isConfort ? 40 : 60) +
          (['CONSULTATION', 'BIOLOGIE', 'URGENCES'].includes(category) ? 5 : 0),
      maxAmountPerClaim: ['CHIRURGIE', 'HOSPITALISATION'].includes(category)
        ? isBasique
          ? 5000
          : isConfort
            ? 10000
            : 18000
        : 600,
      maxAmountPerYear: ['DENTAIRE', 'OPTIQUE', 'KINESITHERAPIE'].includes(category)
        ? isBasique
          ? 600
          : isConfort
            ? 1500
            : 2600
        : 3000,
    }));
  }

  private mockImportedAdherents(companyId: string, planTier: PlanTier, count: number): Adherent[] {
    const names = ['Sonia Gharbi', 'Karim Mansour', 'Fatma Karoui', 'Mohamed Jlassi', 'Imen Trabelsi'];

    return Array.from({ length: count }).map((_, index) => ({
      companyId,
      enrolledAt: new Date().toISOString(),
      enrollmentType: 'INDIVIDUEL',
      id: `${companyId}-adh-${index + 1}`,
      membershipId: `${companyId.toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
      patientName: names[index % names.length],
      planTierId: planTier.id,
      planTierName: planTier.name,
      policyNumber: `POL-${new Date().getFullYear()}-${String(index + 1).padStart(4, '0')}`,
      source: 'IMPORT_CSV',
      totalClaimsThisYear: 0,
      totalReimbursedThisYear: 0,
      verificationStatus: 'EN_ATTENTE',
    }));
  }

  private uniqueCompanyId(code: string): string {
    const base = this.slug(code);
    const exists = this.allCompanies().some((company) => company.id === base);
    return exists ? `${base}-${Date.now()}` : base;
  }

  private slug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
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

  private persist<T>(key: string, value: T): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  }
}
