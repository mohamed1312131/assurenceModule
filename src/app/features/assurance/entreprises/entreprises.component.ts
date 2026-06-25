import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { CorporateContract } from '../../../models/corporate-contract.model';
import { StatusChipComponent } from '../../../shared/status-chip/status-chip.component';
import { EntreprisesFacade } from './entreprises.facade';
import { NouveauContratDialogComponent } from './nouveau-contrat-dialog.component';

type ContractStatus = CorporateContract['status'];

@Component({
  selector: 'app-entreprises',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    StatusChipComponent,
  ],
  templateUrl: './entreprises.component.html',
  styleUrl: './entreprises.component.scss',
})
export class EntreprisesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  protected readonly facade = inject(EntreprisesFacade);
  protected readonly companyId = signal(this.routeCompanyId());
  protected readonly statuses: ContractStatus[] = ['ACTIF', 'EXPIRATION_PROCHE', 'EXPIRE', 'SUSPENDU'];

  protected readonly filtered = this.facade.filtered;
  protected readonly expiringSoon = this.facade.expiringSoon;
  protected readonly totalPremium = computed(() =>
    this.facade.allContracts().reduce((total, contract) => total + contract.annualPremium, 0),
  );
  protected readonly activeContracts = computed(
    () => this.facade.allContracts().filter((contract) => contract.status === 'ACTIF').length,
  );
  protected readonly totalEmployees = computed(() =>
    this.facade.allContracts().reduce((total, contract) => total + contract.totalEmployees, 0),
  );
  protected readonly enrolledEmployees = computed(() =>
    this.facade.allContracts().reduce((total, contract) => total + contract.enrolledEmployees, 0),
  );

  ngOnInit(): void {
    this.facade.loadForCompany(this.companyId());
  }

  protected toggleStatus(status: ContractStatus): void {
    const current = this.facade.filters().statuses;
    this.facade.updateFilter({
      statuses: current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    });
  }

  protected setSector(value: string): void {
    this.facade.updateFilter({ sector: value.trim() || null });
  }

  protected setRenewalWithin90Days(checked: boolean): void {
    this.facade.updateFilter({ renewalWithin90Days: checked });
  }

  protected resetFilters(): void {
    this.facade.resetFilters();
  }

  protected openNewContractDialog(): void {
    this.dialog.open(NouveauContratDialogComponent, {
      data: { companyId: this.companyId() },
      maxWidth: '94vw',
      panelClass: 'assurance-form-dialog',
      width: 'min(820px, 94vw)',
    });
  }

  protected manage(contract: CorporateContract): void {
    void this.router.navigate(['/assurance', this.companyId(), 'entreprises', contract.id]);
  }

  protected statusLabel(status: ContractStatus): string {
    const labels: Record<ContractStatus, string> = {
      ACTIF: 'Actif',
      EXPIRATION_PROCHE: 'Expiration proche',
      EXPIRE: 'Expiré',
      SUSPENDU: 'Suspendu',
    };

    return labels[status];
  }

  protected ratioTone(contract: CorporateContract): string {
    if (contract.claimsRatio < 0.3) {
      return 'success';
    }

    if (contract.claimsRatio <= 0.5) {
      return 'warning';
    }

    return 'error';
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      maximumFractionDigits: 0,
      style: 'currency',
      currency: 'TND',
    }).format(value);
  }

  protected formatPercent(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      maximumFractionDigits: 1,
      style: 'percent',
    }).format(value);
  }

  private routeCompanyId(): string {
    let currentRoute: ActivatedRoute | null = this.route;

    while (currentRoute) {
      const companyId = currentRoute.snapshot.paramMap.get('companyId');

      if (companyId) {
        return companyId;
      }

      currentRoute = currentRoute.parent;
    }

    return 'comar';
  }
}
