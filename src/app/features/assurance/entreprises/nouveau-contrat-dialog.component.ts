import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CorporateContract } from '../../../models/corporate-contract.model';
import { PlanTier } from '../../../models/plan-tier.model';
import { EntreprisesFacade } from './entreprises.facade';

interface NewContractForm {
  employerName: string;
  sector: string;
  hrContactName: string;
  hrContactEmail: string;
  contractStartDate: string;
  contractEndDate: string;
  totalEmployees: number | null;
  annualPremium: number | null;
  planTierIds: string[];
}

@Component({
  selector: 'app-nouveau-contrat-dialog',
  imports: [
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Nouveau contrat groupe</h2>

    <mat-dialog-content>
      <mat-chip-set class="source-chip" aria-label="Source">
        <mat-chip>Source : Manuel</mat-chip>
      </mat-chip-set>

      <div class="form-grid">
        <mat-form-field appearance="outline">
          <mat-label>Employeur</mat-label>
          <input matInput [value]="form().employerName" (input)="patch('employerName', $any($event.target).value)" required />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Secteur</mat-label>
          <input matInput [value]="form().sector" (input)="patch('sector', $any($event.target).value)" required />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Contact RH</mat-label>
          <input matInput [value]="form().hrContactName" (input)="patch('hrContactName', $any($event.target).value)" required />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Email RH</mat-label>
          <input matInput type="email" [value]="form().hrContactEmail" (input)="patch('hrContactEmail', $any($event.target).value)" required />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Début du contrat</mat-label>
          <input matInput type="date" [value]="form().contractStartDate" (input)="patch('contractStartDate', $any($event.target).value)" required />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Fin du contrat</mat-label>
          <input matInput type="date" [value]="form().contractEndDate" (input)="patch('contractEndDate', $any($event.target).value)" required />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Salariés</mat-label>
          <input matInput type="number" min="1" [value]="form().totalEmployees ?? ''" (input)="patchNumber('totalEmployees', $any($event.target).value)" required />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Prime annuelle (TND)</mat-label>
          <input matInput type="number" min="0" [value]="form().annualPremium ?? ''" (input)="patchNumber('annualPremium', $any($event.target).value)" required />
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Plans disponibles</mat-label>
          <mat-select
            multiple
            [value]="form().planTierIds"
            (selectionChange)="patch('planTierIds', $event.value)"
          >
            @for (plan of planTiers(); track plan.id) {
              <mat-option [value]="plan.id">{{ plan.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      @if (submitted() && !isValid()) {
        <p class="error-message">
          <mat-icon aria-hidden="true">error</mat-icon>
          Merci de renseigner tous les champs obligatoires.
        </p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="createContract()">
        Créer le contrat
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .form-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      min-width: min(620px, 78vw);
      padding-top: 4px;
    }

    .source-chip {
      display: block;
      margin-bottom: 14px;
    }

    .full {
      grid-column: 1 / -1;
    }

    .error-message {
      align-items: center;
      color: #b91c1c;
      display: flex;
      gap: 8px;
      margin: 4px 0 0;
    }

    @media (max-width: 680px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class NouveauContratDialogComponent {
  private readonly data = inject(MAT_DIALOG_DATA) as { companyId: string };
  private readonly dialogRef = inject(MatDialogRef<NouveauContratDialogComponent>);
  private readonly facade = inject(EntreprisesFacade);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly submitted = signal(false);
  protected readonly form = signal<NewContractForm>({
    annualPremium: null,
    contractEndDate: '',
    contractStartDate: new Date().toISOString().slice(0, 10),
    employerName: '',
    hrContactEmail: '',
    hrContactName: '',
    planTierIds: [],
    sector: '',
    totalEmployees: null,
  });

  protected readonly planTiers = computed(() =>
    this.readJson<PlanTier[]>(`omnicare_ins_${this.data.companyId}_plan_tiers`, []),
  );

  protected readonly isValid = computed(() => {
    const form = this.form();

    return (
      form.employerName.trim().length > 0 &&
      form.sector.trim().length > 0 &&
      form.hrContactName.trim().length > 0 &&
      form.hrContactEmail.trim().length > 0 &&
      form.contractStartDate.length > 0 &&
      form.contractEndDate.length > 0 &&
      (form.totalEmployees ?? 0) > 0 &&
      (form.annualPremium ?? 0) > 0 &&
      form.planTierIds.length > 0
    );
  });

  protected patch<K extends keyof NewContractForm>(key: K, value: NewContractForm[K]): void {
    this.form.update((current) => ({
      ...current,
      [key]: value,
    }));
  }

  protected patchNumber(key: 'annualPremium' | 'totalEmployees', rawValue: string): void {
    const value = rawValue === '' ? null : Number(rawValue);
    this.patch(key, Number.isFinite(value) ? value : null);
  }

  protected createContract(): void {
    this.submitted.set(true);

    if (!this.isValid()) {
      return;
    }

    const form = this.form();
    const renewalNoticeDate = this.addDays(form.contractEndDate, -60);
    const contract: CorporateContract = {
      annualPremium: form.annualPremium ?? 0,
      availablePlanTiers: form.planTierIds,
      claimsRatio: 0,
      claimsThisYear: 0,
      companyId: this.data.companyId,
      contractEndDate: form.contractEndDate,
      contractStartDate: form.contractStartDate,
      employerName: form.employerName.trim(),
      employerSector: form.sector.trim(),
      enrolledEmployees: form.totalEmployees ?? 0,
      hrContactEmail: form.hrContactEmail.trim(),
      hrContactName: form.hrContactName.trim(),
      id: `${this.data.companyId}-contract-${Date.now()}`,
      reimbursedThisYear: 0,
      renewalNoticeDate,
      status: 'ACTIF',
      totalEmployees: form.totalEmployees ?? 0,
    };

    this.facade.addContract(contract);
    this.snackBar.open('Contrat groupe créé avec succès', 'Fermer', { duration: 3000 });
    this.dialogRef.close({ created: true });
  }

  private addDays(isoDate: string, days: number): string {
    const date = new Date(`${isoDate}T00:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
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
