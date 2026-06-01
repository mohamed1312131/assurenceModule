import { Injectable, computed, signal } from '@angular/core';

import {
  AutorisationPrealable,
  AutorisationStatus,
} from '../../../models/autorisation-prealable.model';
import { ActCategory, ClaimSource } from '../../../models/shared.model';

export interface AutorisationsFilter {
  statuts: AutorisationStatus[];
  sources: ClaimSource[];
  actCategories: ActCategory[];
  dateFrom: string | null;
  dateTo: string | null;
  providerInNetwork: boolean;
}

const EMPTY_FILTERS: AutorisationsFilter = {
  statuts: [],
  sources: [],
  actCategories: [],
  dateFrom: null,
  dateTo: null,
  providerInNetwork: false,
};

const STATUS_ORDER: Record<AutorisationStatus, number> = {
  EN_ATTENTE: 0,
  EN_EXAMEN: 1,
  APPROUVEE: 2,
  APPROUVEE_AUTO: 3,
  REFUSEE: 4,
};

@Injectable({ providedIn: 'root' })
export class AutorisationsFacade {
  readonly allAutorisations = signal<AutorisationPrealable[]>([]);
  readonly filters = signal<AutorisationsFilter>({ ...EMPTY_FILTERS });

  private readonly companyId = signal<string | null>(null);

  readonly filtered = computed(() =>
    this.allAutorisations()
      .filter((autorisation) => this.matchesFilters(autorisation, this.filters()))
      .sort((left, right) => {
        const statusDiff = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];

        if (statusDiff !== 0) {
          return statusDiff;
        }

        return new Date(left.expiresAt).getTime() - new Date(right.expiresAt).getTime();
      }),
  );

  readonly activeFilterCount = computed(() => this.countActiveFilters(this.filters()));
  readonly nearExpiry = computed(() =>
    this.allAutorisations().filter((autorisation) => {
      if (!['EN_ATTENTE', 'EN_EXAMEN'].includes(autorisation.status)) {
        return false;
      }

      const days = this.daysUntil(autorisation.expiresAt);
      return days >= 0 && days <= 3;
    }),
  );

  loadForCompany(companyId: string): void {
    this.companyId.set(companyId);
    const autorisations = this.applyAutoApproval(this.readAutorisations(companyId));
    this.allAutorisations.set(autorisations);
    this.persistAutorisations(autorisations);
    this.resetFilters();
  }

  updateFilter(partial: Partial<AutorisationsFilter>): void {
    this.filters.update((current) => ({
      ...current,
      ...partial,
    }));
  }

  resetFilters(): void {
    this.filters.set({ ...EMPTY_FILTERS });
  }

  updateStatus(
    id: string,
    status: AutorisationStatus,
    patch: Partial<AutorisationPrealable> = {},
  ): void {
    this.allAutorisations.update((current) => {
      const next = current.map((autorisation) =>
        autorisation.id === id
          ? {
              ...autorisation,
              ...patch,
              status,
              lastUpdatedAt: new Date().toISOString(),
            }
          : autorisation,
      );
      this.persistAutorisations(next);
      return next;
    });
  }

  getById(id: string): AutorisationPrealable | undefined {
    return this.allAutorisations().find((autorisation) => autorisation.id === id);
  }

  private applyAutoApproval(autorisations: AutorisationPrealable[]): AutorisationPrealable[] {
    const now = Date.now();

    return autorisations.map((autorisation) => {
      if (
        ['EN_ATTENTE', 'EN_EXAMEN'].includes(autorisation.status) &&
        new Date(autorisation.expiresAt).getTime() < now
      ) {
        return {
          ...autorisation,
          status: 'APPROUVEE_AUTO',
          authorizationNumber:
            autorisation.authorizationNumber ?? this.generateAuthorizationNumber(autorisation.companyId),
          respondedAt: new Date().toISOString(),
          respondedBy: 'Règle automatique 15 jours',
        };
      }

      return autorisation;
    });
  }

  private matchesFilters(
    autorisation: AutorisationPrealable,
    filters: AutorisationsFilter,
  ): boolean {
    if (filters.statuts.length > 0 && !filters.statuts.includes(autorisation.status)) {
      return false;
    }

    if (filters.sources.length > 0 && !filters.sources.includes(autorisation.source)) {
      return false;
    }

    if (
      filters.actCategories.length > 0 &&
      !filters.actCategories.includes(autorisation.actCategory)
    ) {
      return false;
    }

    if (filters.dateFrom && autorisation.submittedAt.slice(0, 10) < filters.dateFrom) {
      return false;
    }

    if (filters.dateTo && autorisation.submittedAt.slice(0, 10) > filters.dateTo) {
      return false;
    }

    if (filters.providerInNetwork && !autorisation.providerInNetwork) {
      return false;
    }

    return true;
  }

  private countActiveFilters(filters: AutorisationsFilter): number {
    return [
      filters.statuts.length,
      filters.sources.length,
      filters.actCategories.length,
      filters.dateFrom ? 1 : 0,
      filters.dateTo ? 1 : 0,
      filters.providerInNetwork ? 1 : 0,
    ].reduce((total, count) => total + count, 0);
  }

  private readAutorisations(companyId: string): AutorisationPrealable[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const raw = localStorage.getItem(this.storageKey(companyId));

    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as AutorisationPrealable[];
    } catch {
      return [];
    }
  }

  private persistAutorisations(autorisations: AutorisationPrealable[]): void {
    const companyId = this.companyId();

    if (!companyId || typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey(companyId), JSON.stringify(autorisations));
  }

  private storageKey(companyId: string): string {
    return `omnicare_ins_${companyId}_autorisations`;
  }

  private daysUntil(isoDate: string): number {
    return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000);
  }

  private generateAuthorizationNumber(companyId: string): string {
    const companyCode = companyId.toUpperCase();
    const year = new Date().getFullYear();
    const sequence = Math.floor(Math.random() * 90_000 + 10_000);

    return `AUTH-${companyCode}-${year}-${sequence}`;
  }
}
