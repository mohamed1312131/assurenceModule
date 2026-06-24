import { Injectable, computed, inject, signal } from '@angular/core';

import {
  AdhesionRecommendation,
  AdhesionRequest,
  AdhesionRequestStatus,
} from '../../../models/adhesion-request.model';
import { CorporateContract } from '../../../models/corporate-contract.model';
import { InsuranceCompany } from '../../../models/insurance-company.model';
import { PlanTier } from '../../../models/plan-tier.model';
import { ProviderNetworkEntry } from '../../../models/provider-network.model';
import { CompanySettings } from '../../../models/shared.model';
import { LocalStorageService, STORAGE_KEYS } from '../../../core/storage/local-storage.service';

interface AdhesionFilters {
  search: string | null;
  statuses: AdhesionRequestStatus[];
}

export interface AdhesionRequestStats {
  total: number;
  newCount: number;
  ready: number;
  incomplete: number;
  offerSent: number;
}

const EMPTY_FILTERS: AdhesionFilters = {
  search: null,
  statuses: [],
};

const STATUS_ORDER: Record<AdhesionRequestStatus, number> = {
  NOUVELLE: 1,
  A_COMPLETER: 2,
  PRETE_A_PROPOSER: 3,
  OFFRE_ENVOYEE: 4,
  CLOTUREE: 5,
};

@Injectable({ providedIn: 'root' })
export class FtusaAdhesionRequestsFacade {
  private readonly storage = inject(LocalStorageService);

  readonly allRequests = signal<AdhesionRequest[]>([]);
  readonly filters = signal<AdhesionFilters>({ ...EMPTY_FILTERS });
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly selectedRequestId = signal<string | null>(null);

  readonly filteredRequests = computed(() => {
    const filters = this.filters();
    const search = filters.search?.trim().toLowerCase();

    return this.allRequests()
      .filter((request) => {
        if (filters.statuses.length > 0 && !filters.statuses.includes(request.status)) {
          return false;
        }

        if (!search) {
          return true;
        }

        return [
          request.applicantName,
          request.externalRequestId,
          request.employerName,
          request.city,
          request.applicantEmail,
          request.applicantPhone,
        ]
          .filter((value): value is string => !!value)
          .some((value) => value.toLowerCase().includes(search));
      })
      .sort((left, right) => {
        const statusDiff = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];

        if (statusDiff !== 0) {
          return statusDiff;
        }

        return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime();
      });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredRequests().length / this.pageSize())),
  );

  readonly currentPageIndex = computed(() => Math.min(this.pageIndex(), this.totalPages() - 1));

  readonly pagedRequests = computed(() => {
    const start = this.currentPageIndex() * this.pageSize();

    return this.filteredRequests().slice(start, start + this.pageSize());
  });

  readonly visibleRange = computed(() => {
    const total = this.filteredRequests().length;

    if (total === 0) {
      return { end: 0, start: 0, total };
    }

    const start = this.currentPageIndex() * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, total);

    return { end, start, total };
  });

  readonly selectedRequest = computed(
    () => {
      const filtered = this.filteredRequests();

      return (
        filtered.find((request) => request.id === this.selectedRequestId()) ?? filtered[0] ?? null
      );
    },
  );

  readonly stats = computed<AdhesionRequestStats>(() => {
    const requests = this.allRequests();

    return {
      incomplete: requests.filter((request) => request.status === 'A_COMPLETER').length,
      newCount: requests.filter((request) => request.status === 'NOUVELLE').length,
      offerSent: requests.filter((request) => request.status === 'OFFRE_ENVOYEE').length,
      ready: requests.filter((request) => request.status === 'PRETE_A_PROPOSER').length,
      total: requests.length,
    };
  });

  load(): void {
    const requests = this.storage.getItem<AdhesionRequest[]>(STORAGE_KEYS.adhesionRequests, []);
    this.allRequests.set(requests);

    if (!this.selectedRequestId() && requests.length > 0) {
      this.selectedRequestId.set(requests[0].id);
    }
  }

  updateFilter(partial: Partial<AdhesionFilters>): void {
    this.filters.update((current) => ({
      ...current,
      ...partial,
    }));
    this.pageIndex.set(0);
  }

  selectRequest(requestId: string): void {
    this.selectedRequestId.set(requestId);
  }

  resetFilters(): void {
    this.filters.set({ ...EMPTY_FILTERS });
    this.pageIndex.set(0);
  }

  setSearch(value: string): void {
    this.updateFilter({ search: value.trim() || null });
  }

  setPageSize(value: number): void {
    this.pageSize.set(value);
    this.pageIndex.set(0);
  }

  previousPage(): void {
    this.pageIndex.update((current) => Math.max(0, current - 1));
  }

  nextPage(): void {
    this.pageIndex.update((current) => Math.min(this.totalPages() - 1, current + 1));
  }

  requestMoreInfo(requestId: string): void {
    const now = new Date().toISOString();

    this.updateRequest(requestId, (request) => ({
      ...request,
      lastAction: {
        at: now,
        label: 'Demande de complément envoyée vers OmniCare',
        type: 'INFOS_DEMANDEES',
      },
      missingItems:
        request.missingItems.length > 0
          ? request.missingItems
          : ['Confirmation finale des informations déclarées dans OmniCare'],
      status: 'A_COMPLETER',
      updatedAt: now,
    }));
  }

  sendOffer(requestId: string, recommendation: AdhesionRecommendation): void {
    const now = new Date().toISOString();

    this.updateRequest(requestId, (request) => ({
      ...request,
      lastAction: {
        at: now,
        label: `Offre ${recommendation.companyCode} ${recommendation.planTierName} envoyée vers OmniCare`,
        type: 'OFFRE_ENVOYEE',
      },
      selectedCompanyId: recommendation.companyId,
      selectedPlanTierName: recommendation.planTierName,
      status: 'OFFRE_ENVOYEE',
      updatedAt: now,
    }));
  }

  recommendationsFor(request: AdhesionRequest): AdhesionRecommendation[] {
    const companies = this.storage
      .getItem<InsuranceCompany[]>(STORAGE_KEYS.companies, [])
      .filter((company) => company.status === 'ACTIVE');

    return companies
      .map((company) => this.recommendationForCompany(request, company))
      .filter((recommendation): recommendation is AdhesionRecommendation => recommendation !== null)
      .sort((left, right) => right.score - left.score)
      .map((recommendation, index) => ({
        ...recommendation,
        rank: index + 1,
      }));
  }

  topRecommendationFor(request: AdhesionRequest | null): AdhesionRecommendation | null {
    if (!request) {
      return null;
    }

    return this.recommendationsFor(request)[0] ?? null;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      currency: 'TND',
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(value);
  }

  private recommendationForCompany(
    request: AdhesionRequest,
    company: InsuranceCompany,
  ): AdhesionRecommendation | null {
    const planTiers = this.storage.getItem<PlanTier[]>(
      this.storage.companyKey(company.id, 'plan_tiers'),
      [],
    );

    if (planTiers.length === 0) {
      return null;
    }

    const planTier = this.bestPlanForRequest(request, planTiers);
    const averageCoverage = this.averageCoverage(planTier);
    const contracts = this.storage.getItem<CorporateContract[]>(
      this.storage.companyKey(company.id, 'contracts'),
      [],
    );
    const network = this.storage.getItem<ProviderNetworkEntry[]>(
      this.storage.companyKey(company.id, 'network'),
      [],
    );
    const settings = this.storage.getItem<CompanySettings | null>(
      this.storage.companyKey(company.id, 'settings'),
      null,
    );
    const matchingContract = this.matchingContract(request, contracts);
    const cityNetwork = network.filter(
      (provider) =>
        provider.networkStatus === 'AGREE' &&
        provider.city.toLowerCase() === request.city.toLowerCase(),
    );
    const familyMembers = request.members.length;
    const hasFamily = familyMembers > 1;
    const medicalSignals = request.members.filter((member) => !member.medical.goodHealth);
    const hasAdvancedCoverage =
      request.requestedCoverage.includes('INCAPACITE_INVALIDITE') ||
      request.requestedCoverage.includes('DECES');

    let score =
      42 +
      Math.min(averageCoverage * 0.45, 32) +
      Math.max(0, 14 - planTier.slaTargetDays) +
      Math.min(network.length / 4, 10);

    const reasons: string[] = [
      `${Math.round(averageCoverage)}% de couverture moyenne sur le plan ${planTier.name}`,
      `SLA cible ${planTier.slaTargetDays} jours`,
    ];
    const cautions: string[] = [];

    if (matchingContract) {
      score += 18;
      reasons.push(`Contrat groupe identifié: ${matchingContract.employerName}`);
    } else if (request.employerName) {
      cautions.push(`Aucun contrat groupe ${request.employerName} trouvé dans cette compagnie`);
    }

    if (cityNetwork.length > 0) {
      score += Math.min(cityNetwork.length, 6);
      reasons.push(`${cityNetwork.length} prestataire(s) agréé(s) à ${request.city}`);
    } else {
      cautions.push(`Réseau agréé non identifié à ${request.city} dans la démo`);
    }

    if (hasFamily && ['Confort', 'Premium'].includes(planTier.name)) {
      score += 7;
      reasons.push('Plan adapté à une couverture familiale');
    }

    if (hasAdvancedCoverage && planTier.name === 'Premium') {
      score += 5;
      reasons.push('Couverture renforcée pour décès / incapacité');
    }

    if (settings?.participatesInMarketAnalytics) {
      score += 2;
    }

    if (request.missingItems.length > 0) {
      score -= 4;
      cautions.push('Compléments requis avant émission formelle de l’offre');
    }

    if (medicalSignals.length > 0) {
      score -= 3;
      cautions.push(
        `${medicalSignals.length} déclaration(s) médicale(s) à revoir avant proposition finale`,
      );
    }

    return {
      averageCoveragePercent: averageCoverage,
      cautions,
      companyCode: company.code,
      companyId: company.id,
      companyName: company.name,
      monthlyPremiumEstimate: this.estimatePremium(planTier, familyMembers, medicalSignals.length),
      planTierName: planTier.name,
      rank: 0,
      reasons,
      score: Math.max(1, Math.min(Math.round(score), 99)),
      slaTargetDays: planTier.slaTargetDays,
    };
  }

  private bestPlanForRequest(request: AdhesionRequest, planTiers: PlanTier[]): PlanTier {
    const sorted = [...planTiers].sort(
      (left, right) => this.averageCoverage(right) - this.averageCoverage(left),
    );
    const hasFamily = request.members.length > 1;
    const wantsAdvancedCoverage =
      request.requestedCoverage.includes('INCAPACITE_INVALIDITE') ||
      request.requestedCoverage.includes('DECES');

    if (hasFamily || wantsAdvancedCoverage || (request.annualSalary ?? 0) > 50000) {
      return (
        sorted.find((plan) => plan.name.toLowerCase().includes('premium')) ??
        sorted.find((plan) => plan.name.toLowerCase().includes('confort')) ??
        sorted[0]
      );
    }

    return (
      sorted.find((plan) => plan.name.toLowerCase().includes('confort')) ??
      sorted.find((plan) => plan.name.toLowerCase().includes('basique')) ??
      sorted[0]
    );
  }

  private averageCoverage(planTier: PlanTier): number {
    if (planTier.coverageRules.length === 0) {
      return 0;
    }

    return (
      planTier.coverageRules.reduce((total, rule) => total + rule.coveragePercent, 0) /
      planTier.coverageRules.length
    );
  }

  private estimatePremium(
    planTier: PlanTier,
    familyMembers: number,
    medicalSignalCount: number,
  ): number {
    const dependentMultiplier = Math.max(familyMembers - 1, 0) * 0.45;
    const medicalMultiplier = medicalSignalCount > 0 ? 0.08 : 0;

    return Math.round(planTier.monthlyPremium * (1 + dependentMultiplier + medicalMultiplier));
  }

  private matchingContract(
    request: AdhesionRequest,
    contracts: CorporateContract[],
  ): CorporateContract | undefined {
    if (!request.employerName) {
      return undefined;
    }

    const employer = request.employerName.toLowerCase();

    return contracts.find(
      (contract) =>
        contract.employerName.toLowerCase() === employer &&
        ['ACTIF', 'EXPIRATION_PROCHE'].includes(contract.status),
    );
  }

  private updateRequest(
    requestId: string,
    updater: (request: AdhesionRequest) => AdhesionRequest,
  ): void {
    const next = this.allRequests().map((request) =>
      request.id === requestId ? updater(request) : request,
    );

    this.allRequests.set(next);
    this.storage.setItem(STORAGE_KEYS.adhesionRequests, next);
  }
}
