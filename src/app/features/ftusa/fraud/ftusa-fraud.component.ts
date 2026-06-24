import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';

import { ClaimFlag } from '../../../models/demande-remboursement.model';
import { InsuranceCompany } from '../../../models/insurance-company.model';
import {
  DuplicateAlert,
  FtusaCrossFraudFacade,
  ProviderPattern,
} from './ftusa-cross-fraud.facade';

type PeriodFilter = 'ALL' | 'MONTH' | 'QUARTER';
type SignalFilter = 'ALL' | ClaimFlag;

interface InvestigationCase {
  companyName: string;
  demandeId: string;
  amount: number;
  submittedAt: string;
  providerName: string | null;
  flags: ClaimFlag[];
}

interface InvestigationSignal {
  alert: DuplicateAlert;
  cases: InvestigationCase[];
  companies: string[];
  providers: string[];
  flags: ClaimFlag[];
  latestSubmittedAt: string;
}

@Component({
  selector: 'app-ftusa-fraud',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTabsModule,
  ],
  templateUrl: './ftusa-fraud.component.html',
  styleUrl: './ftusa-fraud.component.scss',
})
export class FtusaFraudComponent implements OnInit {
  private readonly snackBar = inject(MatSnackBar);

  protected readonly facade = inject(FtusaCrossFraudFacade);
  protected readonly periodFilter = signal<PeriodFilter>('MONTH');
  protected readonly companyFilter = signal('ALL');
  protected readonly signalFilter = signal<SignalFilter>('ALL');
  protected readonly searchTerm = signal('');
  protected readonly amountMin = signal<number | null>(null);
  protected readonly amountMax = signal<number | null>(null);
  protected readonly advancedFiltersOpen = signal(false);
  protected readonly expandedSignalId = signal<string | null>(null);

  protected readonly periodOptions: Array<{ value: PeriodFilter; label: string }> = [
    { label: 'Ce mois', value: 'MONTH' },
    { label: 'Ce trimestre', value: 'QUARTER' },
    { label: 'Toutes périodes', value: 'ALL' },
  ];

  protected readonly participatingCompanies = computed(() =>
    this.facade.aggregates().map((aggregate) => aggregate.company),
  );
  protected readonly nonParticipatingCompanies = computed(() => {
    const participatingIds = new Set(
      this.participatingCompanies().map((company) => company.id),
    );

    return this.facade.companies().filter((company) => !participatingIds.has(company.id));
  });
  protected readonly enrichedSignals = computed<InvestigationSignal[]>(() =>
    this.facade
      .duplicateAlerts()
      .map((alert) => this.enrichAlert(alert))
      .sort(
        (left, right) =>
          new Date(right.latestSubmittedAt).getTime() - new Date(left.latestSubmittedAt).getTime(),
      ),
  );
  protected readonly signalFilterOptions = computed(() =>
    Array.from(new Set(this.enrichedSignals().flatMap((signal) => signal.flags))).sort(),
  );
  protected readonly filteredSignals = computed(() =>
    this.enrichedSignals().filter((signal) => this.matchesFilters(signal)),
  );
  protected readonly selectedSignal = computed(() => {
    const selectedId = this.expandedSignalId();

    return this.enrichedSignals().find((signal) => signal.alert.id === selectedId) ?? null;
  });
  protected readonly activeFilterCount = computed(() =>
    [
      this.searchTerm().trim() ? 1 : 0,
      this.periodFilter() !== 'MONTH' ? 1 : 0,
      this.companyFilter() !== 'ALL' ? 1 : 0,
      this.signalFilter() !== 'ALL' ? 1 : 0,
      this.amountMin() !== null ? 1 : 0,
      this.amountMax() !== null ? 1 : 0,
    ].reduce((total, count) => total + count, 0),
  );
  protected readonly duplicateCountThisMonth = computed(
    () => this.enrichedSignals().filter((signal) => this.isWithinPeriod(signal, 'MONTH')).length,
  );

  ngOnInit(): void {
    this.facade.load();
  }

  protected showParticipantList(): void {
    this.snackBar.open(this.facade.participatingNames() || 'Aucune compagnie participante', 'Fermer', {
      duration: 5000,
    });
  }

  protected notifyCompanies(): void {
    this.snackBar.open('Notification envoyée aux compagnies concernées (simulation)', 'Fermer', {
      duration: 3500,
    });
  }

  protected createAlfaSignal(): void {
    this.snackBar.open('Signalement ALFA préparé — Phase 2 simulation', 'Fermer', {
      duration: 3500,
    });
  }

  protected setAmountMin(value: string): void {
    this.amountMin.set(this.parseOptionalAmount(value));
  }

  protected setAmountMax(value: string): void {
    this.amountMax.set(this.parseOptionalAmount(value));
  }

  protected setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  protected resetFilters(): void {
    this.searchTerm.set('');
    this.periodFilter.set('MONTH');
    this.companyFilter.set('ALL');
    this.signalFilter.set('ALL');
    this.amountMin.set(null);
    this.amountMax.set(null);
  }

  protected selectSignal(signalId: string): void {
    this.expandedSignalId.set(signalId);
  }

  protected formatDate(isoDate: string): string {
    return new Intl.DateTimeFormat('fr-TN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(isoDate));
  }

  protected flagLabel(flag: ClaimFlag): string {
    const labels: Record<ClaimFlag, string> = {
      AUTORISATION_MANQUANTE: 'Autorisation manquante',
      DELAI_SOUMISSION: 'Délai dépassé',
      DOCUMENTS_MANQUANTS: 'Documents manquants',
      DOUBLON_SUSPECT: 'Doublon suspect',
      MONTANT_ELEVE: 'Montant élevé',
      PRESTATAIRE_HORS_RESEAU: 'Hors réseau',
      SEUIL_REASSURANCE: 'Seuil réassurance',
    };

    return labels[flag];
  }

  protected companyLabel(company: InsuranceCompany): string {
    return `${company.name} (${company.code})`;
  }

  protected companyListLabel(companies: string[]): string {
    return companies.join(' · ');
  }

  protected shortHash(value: string): string {
    return value.length > 10 ? `${value.slice(0, 10)}…` : value;
  }

  protected submissionRange(signal: InvestigationSignal): string {
    const dates = signal.cases
      .map((item) => item.submittedAt)
      .sort((left, right) => new Date(left).getTime() - new Date(right).getTime());

    if (dates.length === 0) {
      return 'Non renseignée';
    }

    if (dates.length === 1) {
      return this.formatDate(dates[0]);
    }

    return `${this.formatDate(dates[0])} → ${this.formatDate(dates[dates.length - 1])}`;
  }

  protected riskSummary(signal: InvestigationSignal): string {
    const priorityFlag = signal.flags.find((flag) => flag === 'DOUBLON_SUSPECT') ?? signal.flags[0];

    return priorityFlag ? this.flagLabel(priorityFlag) : 'Doublon suspect';
  }

  protected priorityLabel(signal: InvestigationSignal): string {
    if (signal.flags.includes('MONTANT_ELEVE') || signal.flags.length >= 2) {
      return 'Élevée';
    }

    return 'À examiner';
  }

  protected providerAlertCount(pattern: ProviderPattern): number {
    return pattern.breakdown.reduce((total, row) => total + row.count, 0);
  }

  protected providerCompanies(pattern: ProviderPattern): string {
    return pattern.breakdown.map((row) => row.companyName).join(' · ');
  }

  protected providerFlags(pattern: ProviderPattern): ClaimFlag[] {
    return Array.from(new Set(pattern.breakdown.flatMap((row) => row.flags)));
  }

  private enrichAlert(alert: DuplicateAlert): InvestigationSignal {
    const allDemandes = this.facade.allDemandes();
    const cases = alert.cases.map((item) => {
      const demande = allDemandes.find((candidate) => candidate.id === item.demandeId);

      return {
        amount: item.amount,
        companyName: item.companyName,
        demandeId: item.demandeId,
        flags: demande?.flags ?? [],
        providerName: demande?.providerName ?? null,
        submittedAt: item.submittedAt,
      };
    });

    const latestSubmittedAt =
      cases
        .map((item) => item.submittedAt)
        .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ??
      new Date(0).toISOString();

    return {
      alert,
      cases,
      companies: Array.from(new Set(cases.map((item) => item.companyName))),
      flags: Array.from(new Set(cases.flatMap((item) => item.flags))),
      latestSubmittedAt,
      providers: Array.from(
        new Set(cases.map((item) => item.providerName).filter((value): value is string => !!value)),
      ),
    };
  }

  private matchesFilters(signal: InvestigationSignal): boolean {
    const search = this.normalize(this.searchTerm());

    if (search && !this.matchesSearch(signal, search)) {
      return false;
    }

    if (!this.isWithinPeriod(signal, this.periodFilter())) {
      return false;
    }

    if (this.companyFilter() !== 'ALL' && !signal.companies.includes(this.companyFilter())) {
      return false;
    }

    const selectedSignal = this.signalFilter();

    if (selectedSignal !== 'ALL' && !signal.flags.includes(selectedSignal)) {
      return false;
    }

    if (this.amountMin() !== null && signal.alert.totalAmount < Number(this.amountMin())) {
      return false;
    }

    if (this.amountMax() !== null && signal.alert.totalAmount > Number(this.amountMax())) {
      return false;
    }

    return true;
  }

  private matchesSearch(signal: InvestigationSignal, search: string): boolean {
    const searchable = [
      signal.alert.patientHash,
      signal.alert.factureHash,
      signal.companies.join(' '),
      signal.cases.map((item) => item.demandeId).join(' '),
      signal.providers.join(' '),
    ].join(' ');

    return this.normalize(searchable).includes(search);
  }

  private isWithinPeriod(signal: InvestigationSignal, period: PeriodFilter): boolean {
    if (period === 'ALL') {
      return true;
    }

    const latest = new Date(signal.latestSubmittedAt);
    const now = new Date();

    if (period === 'MONTH') {
      return latest.getFullYear() === now.getFullYear() && latest.getMonth() === now.getMonth();
    }

    const latestQuarter = Math.floor(latest.getMonth() / 3);
    const currentQuarter = Math.floor(now.getMonth() / 3);

    return latest.getFullYear() === now.getFullYear() && latestQuarter === currentQuarter;
  }

  private parseOptionalAmount(value: string): number | null {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);

    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
