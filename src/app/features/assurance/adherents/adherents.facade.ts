import { Injectable, computed, signal } from '@angular/core';

import { Adherent } from '../../../models/adherent.model';
import { ClaimSource } from '../../../models/shared.model';

export interface AdherentsFilter {
  verificationStatuses: Array<Adherent['verificationStatus']>;
  enrollmentTypes: Array<Adherent['enrollmentType']>;
  planTier: string | null;
  employer: string | null;
  sources: ClaimSource[];
  contractId: string | null;
}

const EMPTY_FILTERS: AdherentsFilter = {
  verificationStatuses: [],
  enrollmentTypes: [],
  planTier: null,
  employer: null,
  sources: [],
  contractId: null,
};

@Injectable({ providedIn: 'root' })
export class AdherentsFacade {
  readonly allAdherents = signal<Adherent[]>([]);
  readonly filters = signal<AdherentsFilter>({ ...EMPTY_FILTERS });

  private readonly companyId = signal<string | null>(null);

  readonly filtered = computed(() =>
    this.allAdherents()
      .filter((adherent) => this.matchesFilters(adherent, this.filters()))
      .sort((left, right) => left.patientName.localeCompare(right.patientName, 'fr')),
  );

  readonly pendingVerification = computed(() =>
    this.allAdherents().filter((adherent) => adherent.verificationStatus === 'EN_ATTENTE'),
  );

  readonly activeFilterCount = computed(() => this.countActiveFilters(this.filters()));

  loadForCompany(companyId: string): void {
    this.companyId.set(companyId);
    this.allAdherents.set(this.readAdherents(companyId));
    this.resetFilters();
  }

  updateFilter(partial: Partial<AdherentsFilter>): void {
    this.filters.update((current) => ({
      ...current,
      ...partial,
    }));
  }

  resetFilters(): void {
    this.filters.set({ ...EMPTY_FILTERS });
  }

  verify(id: string): void {
    this.allAdherents.update((current) => {
      const next = current.map((adherent) =>
        adherent.id === id
          ? {
              ...adherent,
              verificationStatus: 'VERIFIE' as const,
              verifiedAt: new Date().toISOString(),
            }
          : adherent,
      );
      this.persistAdherents(next);
      return next;
    });
  }

  getById(id: string): Adherent | undefined {
    return this.allAdherents().find((adherent) => adherent.id === id);
  }

  private matchesFilters(adherent: Adherent, filters: AdherentsFilter): boolean {
    if (
      filters.verificationStatuses.length > 0 &&
      !filters.verificationStatuses.includes(adherent.verificationStatus)
    ) {
      return false;
    }

    if (
      filters.enrollmentTypes.length > 0 &&
      !filters.enrollmentTypes.includes(adherent.enrollmentType)
    ) {
      return false;
    }

    if (filters.planTier && adherent.planTierName !== filters.planTier) {
      return false;
    }

    const employer = filters.employer?.trim().toLowerCase();

    if (employer && !adherent.employer?.employerName.toLowerCase().includes(employer)) {
      return false;
    }

    if (filters.sources.length > 0 && !filters.sources.includes(adherent.source)) {
      return false;
    }

    if (filters.contractId && adherent.employer?.contractId !== filters.contractId) {
      return false;
    }

    return true;
  }

  private countActiveFilters(filters: AdherentsFilter): number {
    return [
      filters.verificationStatuses.length,
      filters.enrollmentTypes.length,
      filters.planTier ? 1 : 0,
      filters.employer ? 1 : 0,
      filters.sources.length,
      filters.contractId ? 1 : 0,
    ].reduce((total, count) => total + count, 0);
  }

  private readAdherents(companyId: string): Adherent[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const raw = localStorage.getItem(this.storageKey(companyId));

    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as Adherent[];
    } catch {
      return [];
    }
  }

  private persistAdherents(adherents: Adherent[]): void {
    const companyId = this.companyId();

    if (!companyId || typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey(companyId), JSON.stringify(adherents));
  }

  private storageKey(companyId: string): string {
    return `omnicare_ins_${companyId}_adherents`;
  }
}
