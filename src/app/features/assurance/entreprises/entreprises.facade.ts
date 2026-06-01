import { Injectable, computed, signal } from '@angular/core';

import { CorporateContract } from '../../../models/corporate-contract.model';

export interface EntreprisesFilter {
  statuses: Array<CorporateContract['status']>;
  sector: string | null;
  renewalWithin90Days: boolean;
}

const EMPTY_FILTERS: EntreprisesFilter = {
  statuses: [],
  sector: null,
  renewalWithin90Days: false,
};

@Injectable({ providedIn: 'root' })
export class EntreprisesFacade {
  readonly allContracts = signal<CorporateContract[]>([]);
  readonly filters = signal<EntreprisesFilter>({ ...EMPTY_FILTERS });

  private readonly companyId = signal<string | null>(null);

  readonly filtered = computed(() =>
    this.allContracts()
      .filter((contract) => this.matchesFilters(contract, this.filters()))
      .sort((left, right) => left.employerName.localeCompare(right.employerName, 'fr')),
  );

  readonly expiringSoon = computed(() =>
    this.allContracts().filter((contract) => contract.status === 'EXPIRATION_PROCHE'),
  );

  readonly activeFilterCount = computed(() => this.countActiveFilters(this.filters()));

  loadForCompany(companyId: string): void {
    this.companyId.set(companyId);
    this.allContracts.set(this.readContracts(companyId));
    this.resetFilters();
  }

  updateFilter(partial: Partial<EntreprisesFilter>): void {
    this.filters.update((current) => ({
      ...current,
      ...partial,
    }));
  }

  resetFilters(): void {
    this.filters.set({ ...EMPTY_FILTERS });
  }

  addContract(contract: CorporateContract): void {
    this.allContracts.update((current) => {
      const next = [...current, contract];
      this.persistContracts(next);
      return next;
    });
  }

  getById(id: string): CorporateContract | undefined {
    return this.allContracts().find((contract) => contract.id === id);
  }

  private matchesFilters(contract: CorporateContract, filters: EntreprisesFilter): boolean {
    if (filters.statuses.length > 0 && !filters.statuses.includes(contract.status)) {
      return false;
    }

    const sector = filters.sector?.trim().toLowerCase();

    if (sector && !contract.employerSector.toLowerCase().includes(sector)) {
      return false;
    }

    if (filters.renewalWithin90Days && this.daysUntil(contract.renewalNoticeDate) > 90) {
      return false;
    }

    return true;
  }

  private countActiveFilters(filters: EntreprisesFilter): number {
    return [
      filters.statuses.length,
      filters.sector ? 1 : 0,
      filters.renewalWithin90Days ? 1 : 0,
    ].reduce((total, count) => total + count, 0);
  }

  private readContracts(companyId: string): CorporateContract[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const raw = localStorage.getItem(this.storageKey(companyId));

    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as CorporateContract[];
    } catch {
      return [];
    }
  }

  private persistContracts(contracts: CorporateContract[]): void {
    const companyId = this.companyId();

    if (!companyId || typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey(companyId), JSON.stringify(contracts));
  }

  private storageKey(companyId: string): string {
    return `omnicare_ins_${companyId}_contracts`;
  }

  private daysUntil(isoDate: string): number {
    return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000);
  }
}
