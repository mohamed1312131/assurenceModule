import { Component, OnInit, inject } from '@angular/core';
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
  protected readonly statuses: Array<InsuranceCompany['status']> = [
    'EN_ATTENTE',
    'ACTIVE',
    'SUSPENDUE',
  ];

  ngOnInit(): void {
    this.facade.load();
  }

  protected openWizard(): void {
    this.dialog.open(OnboardingWizardComponent, {
      width: '820px',
    });
  }

  protected toggleStatus(status: InsuranceCompany['status']): void {
    const current = this.facade.filters().statuses;
    this.facade.updateFilter({
      statuses: current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    });
  }

  protected setSearch(value: string): void {
    this.facade.updateFilter({ search: value.trim() || null });
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
    const settings = this.facade.settingsFor(company.id);

    if (!settings?.participatesInCrossFraudDetection && !settings?.participatesInMarketAnalytics) {
      return 'Aucun partage';
    }

    if (settings.participatesInCrossFraudDetection && settings.participatesInMarketAnalytics) {
      return 'Fraude + Analytics';
    }

    if (settings.participatesInCrossFraudDetection) {
      return 'Fraude · Analytics désactivé';
    }

    return 'Fraude désactivée · Analytics';
  }

  protected sharingTone(company: InsuranceCompany): 'success' | 'warning' | 'neutral' {
    const settings = this.facade.settingsFor(company.id);

    if (settings?.participatesInCrossFraudDetection && settings.participatesInMarketAnalytics) {
      return 'success';
    }

    if (settings?.participatesInCrossFraudDetection || settings?.participatesInMarketAnalytics) {
      return 'warning';
    }

    return 'neutral';
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
}
