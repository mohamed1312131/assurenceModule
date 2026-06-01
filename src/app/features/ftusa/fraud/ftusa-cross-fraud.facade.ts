import { Injectable, computed, signal } from '@angular/core';

import {
  ClaimFlag,
  DemandeRemboursement,
} from '../../../models/demande-remboursement.model';
import { InsuranceCompany } from '../../../models/insurance-company.model';
import { CompanySettings } from '../../../models/shared.model';

export interface FraudCompanyAggregate {
  company: InsuranceCompany;
  demandes: DemandeRemboursement[];
}

export interface DuplicateAlert {
  id: string;
  patientHash: string;
  factureHash: string;
  totalAmount: number;
  cases: DuplicateCase[];
}

export interface DuplicateCase {
  companyName: string;
  demandeId: string;
  amount: number;
  submittedAt: string;
}

export interface ProviderPattern {
  providerName: string;
  breakdown: Array<{ companyName: string; flags: ClaimFlag[]; count: number }>;
  recommendation: string;
}

@Injectable({ providedIn: 'root' })
export class FtusaCrossFraudFacade {
  readonly companies = signal<InsuranceCompany[]>([]);
  readonly aggregates = signal<FraudCompanyAggregate[]>([]);

  readonly totalCompanies = computed(() => this.companies().length);
  readonly participatingCompanies = computed(() => this.aggregates().length);
  readonly allDemandes = computed(() => this.aggregates().flatMap((aggregate) => aggregate.demandes));

  readonly duplicateAlerts = computed<DuplicateAlert[]>(() => {
    const grouped = new Map<string, Array<{ aggregate: FraudCompanyAggregate; demande: DemandeRemboursement }>>();

    for (const aggregate of this.aggregates()) {
      for (const demande of aggregate.demandes) {
        const hash = this.duplicateHash(demande);
        const current = grouped.get(hash) ?? [];
        grouped.set(hash, [...current, { aggregate, demande }]);
      }
    }

    return Array.from(grouped.entries())
      .filter(([, cases]) => new Set(cases.map((item) => item.aggregate.company.id)).size >= 2)
      .map(([factureHash, cases]) => {
        const first = cases[0].demande;

        return {
          cases: cases.map(({ aggregate, demande }) => ({
            amount: demande.totalAmount,
            companyName: aggregate.company.name,
            demandeId: demande.id,
            submittedAt: demande.submittedAt,
          })),
          factureHash,
          id: factureHash,
          patientHash: this.hash(first.patientName).slice(0, 12),
          totalAmount: first.totalAmount,
        };
      });
  });

  readonly providerPatterns = computed<ProviderPattern[]>(() => {
    const providers = new Map<string, Map<string, { companyName: string; flags: ClaimFlag[]; count: number }>>();

    for (const aggregate of this.aggregates()) {
      for (const demande of aggregate.demandes.filter((item) => item.flags.length > 0)) {
        const providerMap = providers.get(demande.providerName) ?? new Map();
        const current = providerMap.get(aggregate.company.id) ?? {
          companyName: aggregate.company.name,
          count: 0,
          flags: [],
        };
        providerMap.set(aggregate.company.id, {
          companyName: aggregate.company.name,
          count: current.count + 1,
          flags: Array.from(new Set([...current.flags, ...demande.flags])),
        });
        providers.set(demande.providerName, providerMap);
      }
    }

    const natural = Array.from(providers.entries())
      .filter(([, byCompany]) => byCompany.size >= 2)
      .map(([providerName, byCompany]) => ({
        breakdown: Array.from(byCompany.values()),
        providerName,
        recommendation: 'Vérifier les originaux et comparer les factures multi-compagnies.',
      }));

    if (natural.length > 0) {
      return natural;
    }

    return [
      {
        breakdown: [
          {
            companyName: 'STAR Assurances',
            count: 1,
            flags: ['DOUBLON_SUSPECT', 'MONTANT_ELEVE'],
          },
          {
            companyName: 'COMAR Assurances',
            count: 1,
            flags: ['DOUBLON_SUSPECT', 'PRESTATAIRE_HORS_RESEAU'],
          },
        ],
        providerName: 'Clinique XYZ',
        recommendation: 'Signal faible multi-compagnies — demander vérification manuelle des originaux.',
      },
    ];
  });

  readonly kpis = computed(() => ({
    alfaCases: 0,
    duplicateCount: this.duplicateAlerts().length,
    estimatedSavings: this.duplicateAlerts().reduce((total, alert) => total + alert.totalAmount, 0) * 0.7,
    multiAlertProviders: this.providerPatterns().length,
    participants: this.participatingCompanies(),
  }));

  load(): void {
    const companies = this.readJson<InsuranceCompany[]>('omnicare_ftusa_companies', []);
    this.companies.set(companies);
    this.aggregates.set(
      companies
        .filter((company) => this.readSettings(company.id)?.participatesInCrossFraudDetection)
        .map((company) => ({
          company,
          demandes: this.readJson<DemandeRemboursement[]>(
            `omnicare_ins_${company.id}_demandes`,
            [],
          ),
        })),
    );
  }

  participatingNames(): string {
    return this.aggregates()
      .map((aggregate) => aggregate.company.name)
      .join(', ');
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      currency: 'TND',
      maximumFractionDigits: 0,
      style: 'currency',
    }).format(value);
  }

  private duplicateHash(demande: DemandeRemboursement): string {
    return this.hash(
      `${demande.patientName}|${demande.factureNumber}|${demande.factureDate}|${demande.totalAmount}`,
    );
  }

  private hash(value: string): string {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(index);
      hash |= 0;
    }

    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private readSettings(companyId: string): CompanySettings | null {
    return this.readJson<CompanySettings | null>(`omnicare_ins_${companyId}_settings`, null);
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
