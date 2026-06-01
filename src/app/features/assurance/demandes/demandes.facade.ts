import { Injectable, computed, signal } from '@angular/core';

import {
  ClaimFlag,
  DemandeRemboursement,
  DemandeStatus,
} from '../../../models/demande-remboursement.model';
import { ClaimSource } from '../../../models/shared.model';

export interface DemandesFilter {
  statuts: DemandeStatus[];
  sources: ClaimSource[];
  riskScores: Array<'FAIBLE' | 'MOYEN' | 'ELEVE'>;
  actCategories: string[];
  planTiers: string[];
  employer: string | null;
  inNetworkOnly: boolean;
  flags: ClaimFlag[];
  dateFrom: string | null;
  dateTo: string | null;
  amountMin: number | null;
  amountMax: number | null;
}

const EMPTY_FILTERS: DemandesFilter = {
  statuts: [],
  sources: [],
  riskScores: [],
  actCategories: [],
  planTiers: [],
  employer: null,
  inNetworkOnly: false,
  flags: [],
  dateFrom: null,
  dateTo: null,
  amountMin: null,
  amountMax: null,
};

const RISK_ORDER: Record<DemandeRemboursement['riskScore'], number> = {
  ELEVE: 3,
  MOYEN: 2,
  FAIBLE: 1,
};

@Injectable({ providedIn: 'root' })
export class DemandesFacade {
  readonly allDemandes = signal<DemandeRemboursement[]>([]);
  readonly filters = signal<DemandesFilter>({ ...EMPTY_FILTERS });

  private readonly companyId = signal<string | null>(null);

  readonly filtered = computed(() => {
    const filters = this.filters();

    return this.allDemandes()
      .filter((demande) => this.matchesFilters(demande, filters))
      .sort((left, right) => {
        const riskDiff = RISK_ORDER[right.riskScore] - RISK_ORDER[left.riskScore];

        if (riskDiff !== 0) {
          return riskDiff;
        }

        return new Date(left.submittedAt).getTime() - new Date(right.submittedAt).getTime();
      });
  });

  readonly activeFilterCount = computed(() => this.countActiveFilters(this.filters()));

  loadForCompany(companyId: string): void {
    this.companyId.set(companyId);
    this.allDemandes.set(this.readDemandes(companyId));
    this.resetFilters();
  }

  updateFilter(partial: Partial<DemandesFilter>): void {
    this.filters.update((current) => ({
      ...current,
      ...partial,
    }));
  }

  resetFilters(): void {
    this.filters.set({ ...EMPTY_FILTERS });
  }

  addDemande(demande: DemandeRemboursement): void {
    this.allDemandes.update((current) => {
      const next = [...current, demande];
      this.persistDemandes(next);
      return next;
    });
  }

  updateDemande(updatedDemande: DemandeRemboursement): void {
    this.allDemandes.update((current) => {
      const next = current.map((demande) =>
        demande.id === updatedDemande.id ? updatedDemande : demande,
      );
      this.persistDemandes(next);
      return next;
    });
  }

  getById(id: string): DemandeRemboursement | undefined {
    return this.allDemandes().find((demande) => demande.id === id);
  }

  private matchesFilters(demande: DemandeRemboursement, filters: DemandesFilter): boolean {
    if (filters.statuts.length > 0 && !filters.statuts.includes(demande.status)) {
      return false;
    }

    if (filters.sources.length > 0 && !filters.sources.includes(demande.source)) {
      return false;
    }

    if (filters.riskScores.length > 0 && !filters.riskScores.includes(demande.riskScore)) {
      return false;
    }

    if (filters.actCategories.length > 0 && !filters.actCategories.includes(demande.actCategory)) {
      return false;
    }

    if (filters.planTiers.length > 0 && !filters.planTiers.includes(demande.planTierName)) {
      return false;
    }

    const employerFilter = filters.employer?.trim().toLowerCase();

    if (
      employerFilter &&
      !demande.employerName?.toLowerCase().includes(employerFilter)
    ) {
      return false;
    }

    if (filters.inNetworkOnly && !demande.providerInNetwork) {
      return false;
    }

    if (filters.flags.length > 0 && !filters.flags.every((flag) => demande.flags.includes(flag))) {
      return false;
    }

    if (filters.dateFrom && this.dateOnly(demande.submittedAt) < filters.dateFrom) {
      return false;
    }

    if (filters.dateTo && this.dateOnly(demande.submittedAt) > filters.dateTo) {
      return false;
    }

    if (filters.amountMin !== null && demande.totalAmount < filters.amountMin) {
      return false;
    }

    if (filters.amountMax !== null && demande.totalAmount > filters.amountMax) {
      return false;
    }

    return true;
  }

  private countActiveFilters(filters: DemandesFilter): number {
    return [
      filters.statuts.length,
      filters.sources.length,
      filters.riskScores.length,
      filters.actCategories.length,
      filters.planTiers.length,
      filters.employer ? 1 : 0,
      filters.inNetworkOnly ? 1 : 0,
      filters.flags.length,
      filters.dateFrom ? 1 : 0,
      filters.dateTo ? 1 : 0,
      filters.amountMin !== null ? 1 : 0,
      filters.amountMax !== null ? 1 : 0,
    ].reduce((total, count) => total + count, 0);
  }

  private persistDemandes(demandes: DemandeRemboursement[]): void {
    const companyId = this.companyId();

    if (!companyId || typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey(companyId), JSON.stringify(demandes));
  }

  private readDemandes(companyId: string): DemandeRemboursement[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const raw = localStorage.getItem(this.storageKey(companyId));

    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as DemandeRemboursement[];
    } catch {
      return [];
    }
  }

  private storageKey(companyId: string): string {
    return `omnicare_ins_${companyId}_demandes`;
  }

  private dateOnly(isoDate: string): string {
    return isoDate.slice(0, 10);
  }
}
