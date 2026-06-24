import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { InsuranceCompany } from '../../../models/insurance-company.model';
import { StatusChipComponent } from '../../../shared/status-chip/status-chip.component';
import { CompagniesFacade } from './compagnies.facade';
import { OnboardingWizardComponent } from './onboarding-wizard.component';

type CompanyStatusFilter = 'TOUTES' | InsuranceCompany['status'];
type SharingFilter = 'TOUS' | 'FRAUDE' | 'ANALYTICS' | 'FRAUDE_ANALYTICS' | 'AUCUN';
type AdminFilter = 'TOUS' | 'CONFIGURE' | 'MANQUANT';
type ViewMode = 'table' | 'cards';

@Component({
  selector: 'app-ftusa-companies',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatSnackBarModule,
    StatusChipComponent,
  ],
  templateUrl: './ftusa-companies.component.html',
  styleUrl: './ftusa-companies.component.scss',
})
export class FtusaCompaniesComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly facade = inject(CompagniesFacade);
  protected readonly statusFilters: Array<{ id: CompanyStatusFilter; label: string }> = [
    { id: 'TOUTES', label: 'Toutes' },
    { id: 'ACTIVE', label: 'Active' },
    { id: 'EN_ATTENTE', label: 'Onboarding' },
    { id: 'SUSPENDUE', label: 'Suspendue' },
  ];
  protected readonly sharingFilters: Array<{ id: SharingFilter; label: string }> = [
    { id: 'TOUS', label: 'Tous' },
    { id: 'FRAUDE_ANALYTICS', label: 'Fraude + Analytics' },
    { id: 'FRAUDE', label: 'Fraude' },
    { id: 'ANALYTICS', label: 'Analytics' },
    { id: 'AUCUN', label: 'Aucun partage' },
  ];
  protected readonly adminFilters: Array<{ id: AdminFilter; label: string }> = [
    { id: 'TOUS', label: 'Tous' },
    { id: 'CONFIGURE', label: 'Admin configuré' },
    { id: 'MANQUANT', label: 'Admin manquant' },
  ];

  protected readonly search = signal('');
  protected readonly statusFilter = signal<CompanyStatusFilter>('TOUTES');
  protected readonly sharingFilter = signal<SharingFilter>('TOUS');
  protected readonly adminFilter = signal<AdminFilter>('TOUS');
  protected readonly viewMode = signal<ViewMode>('table');

  protected readonly summary = computed(() => {
    const companies = this.facade.allCompanies();

    return {
      active: companies.filter((company) => company.status === 'ACTIVE').length,
      adminMissing: companies.filter((company) => !this.facade.adminFor(company.id)).length,
      onboarding: companies.filter(
        (company) => company.status === 'EN_ATTENTE' || !company.onboardingCompleted,
      ).length,
      total: companies.length,
    };
  });

  protected readonly filteredCompanies = computed(() =>
    this.facade
      .allCompanies()
      .filter((company) => this.matchesPresentationFilters(company))
      .sort((left, right) => left.name.localeCompare(right.name, 'fr')),
  );

  protected readonly activeFilterCount = computed(() =>
    [
      this.search().trim() ? 1 : 0,
      this.statusFilter() !== 'TOUTES' ? 1 : 0,
      this.sharingFilter() !== 'TOUS' ? 1 : 0,
      this.adminFilter() !== 'TOUS' ? 1 : 0,
    ].reduce((total, count) => total + count, 0),
  );

  ngOnInit(): void {
    this.facade.load();
  }

  protected openWizard(): void {
    this.dialog.open(OnboardingWizardComponent, {
      maxHeight: '90vh',
      maxWidth: '96vw',
      width: '1120px',
    });
  }

  protected setStatusFilter(status: CompanyStatusFilter): void {
    this.statusFilter.set(status);
  }

  protected setSharingFilter(filter: SharingFilter): void {
    this.sharingFilter.set(filter);
  }

  protected setAdminFilter(filter: AdminFilter): void {
    this.adminFilter.set(filter);
  }

  protected setSearch(value: string): void {
    this.search.set(value);
  }

  protected setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  protected resetFilters(): void {
    this.search.set('');
    this.statusFilter.set('TOUTES');
    this.sharingFilter.set('TOUS');
    this.adminFilter.set('TOUS');
  }

  protected manage(company: InsuranceCompany): void {
    void this.router.navigate(['/assurance', company.id, 'dashboard']);
  }

  protected suspend(company: InsuranceCompany): void {
    this.facade.suspendCompany(company.id);
    this.snackBar.open(`${company.name} suspendue`, 'Fermer', { duration: 3000 });
  }

  protected reactivate(company: InsuranceCompany): void {
    this.facade.reactivateCompany(company.id);
    this.snackBar.open(`${company.name} réactivée`, 'Fermer', { duration: 3000 });
  }

  protected resetAccess(company: InsuranceCompany): void {
    this.facade.resetAccess(company.id);
    this.snackBar.open('Accès administrateur réinitialisé (simulation)', 'Fermer', {
      duration: 3000,
    });
  }

  protected statusLabel(status: InsuranceCompany['status']): string {
    const labels: Record<InsuranceCompany['status'], string> = {
      ACTIVE: 'Active',
      EN_ATTENTE: 'Onboarding',
      SUSPENDUE: 'Suspendue',
    };

    return labels[status];
  }

  protected sharingLabel(company: InsuranceCompany): string {
    const sharing = this.sharingState(company);

    if (!sharing.fraud && !sharing.analytics) {
      return 'Aucun partage';
    }

    if (sharing.fraud && sharing.analytics) {
      return 'Fraude + Analytics';
    }

    if (sharing.fraud) {
      return 'Fraude';
    }

    return 'Analytics';
  }

  protected sharingTone(company: InsuranceCompany): 'success' | 'warning' | 'neutral' {
    const sharing = this.sharingState(company);

    if (sharing.fraud && sharing.analytics) {
      return 'success';
    }

    if (sharing.fraud || sharing.analytics) {
      return 'warning';
    }

    return 'neutral';
  }

  protected adminStateLabel(company: InsuranceCompany): string {
    return this.facade.adminFor(company.id) ? 'Admin configuré' : 'À configurer';
  }

  protected adminStateTone(company: InsuranceCompany): 'success' | 'warning' {
    return this.facade.adminFor(company.id) ? 'success' : 'warning';
  }

  protected onboardingLabel(company: InsuranceCompany): string {
    if (company.onboardingCompleted && company.status === 'ACTIVE') {
      return 'Complété';
    }

    if (company.status === 'SUSPENDUE') {
      return 'Suspendu';
    }

    return 'En cours';
  }

  protected onboardingTone(company: InsuranceCompany): 'success' | 'warning' | 'neutral' {
    if (company.onboardingCompleted && company.status === 'ACTIVE') {
      return 'success';
    }

    if (company.status === 'SUSPENDUE') {
      return 'neutral';
    }

    return 'warning';
  }

  protected relativeDate(isoDate: string | undefined): string {
    if (!isoDate) {
      return '—';
    }

    const diffMs = Date.now() - new Date(isoDate).getTime();
    const minutes = Math.max(1, Math.round(diffMs / 60_000));

    if (minutes < 60) {
      return `il y a ${minutes} min`;
    }

    const hours = Math.round(minutes / 60);

    if (hours < 24) {
      return `il y a ${hours} h`;
    }

    return `il y a ${Math.round(hours / 24)} j`;
  }

  private matchesPresentationFilters(company: InsuranceCompany): boolean {
    if (this.statusFilter() !== 'TOUTES' && company.status !== this.statusFilter()) {
      return false;
    }

    if (!this.matchesSharingFilter(company)) {
      return false;
    }

    const hasAdmin = !!this.facade.adminFor(company.id);

    if (this.adminFilter() === 'CONFIGURE' && !hasAdmin) {
      return false;
    }

    if (this.adminFilter() === 'MANQUANT' && hasAdmin) {
      return false;
    }

    const search = this.search().trim().toLowerCase();

    if (!search) {
      return true;
    }

    const admin = this.facade.adminFor(company.id);
    const searchable = [
      company.name,
      company.code,
      company.contactEmail,
      company.cgaRegistrationNumber,
      admin?.name,
      admin?.email,
    ];

    return searchable
      .filter((value): value is string => !!value)
      .some((value) => value.toLowerCase().includes(search));
  }

  private matchesSharingFilter(company: InsuranceCompany): boolean {
    const filter = this.sharingFilter();

    if (filter === 'TOUS') {
      return true;
    }

    const sharing = this.sharingState(company);

    if (filter === 'FRAUDE_ANALYTICS') {
      return sharing.fraud && sharing.analytics;
    }

    if (filter === 'FRAUDE') {
      return sharing.fraud && !sharing.analytics;
    }

    if (filter === 'ANALYTICS') {
      return !sharing.fraud && sharing.analytics;
    }

    return !sharing.fraud && !sharing.analytics;
  }

  private sharingState(company: InsuranceCompany): { fraud: boolean; analytics: boolean } {
    const settings = this.facade.settingsFor(company.id);

    return {
      analytics: settings?.participatesInMarketAnalytics ?? company.participatesInMarketAnalytics,
      fraud:
        settings?.participatesInCrossFraudDetection ??
        company.participatesInCrossFraudDetection,
    };
  }
}
