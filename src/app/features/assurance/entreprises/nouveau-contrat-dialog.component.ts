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
    <header class="wizard-header">
      <div class="wizard-heading">
        <span class="section-kicker">Contrats COMAR</span>
        <h2 mat-dialog-title>Nouveau contrat groupe</h2>
        <p>Créez un contrat entreprise et rattachez les plans disponibles.</p>
      </div>
      <button class="dialog-close" mat-icon-button type="button" mat-dialog-close aria-label="Fermer">
        <mat-icon aria-hidden="true">close</mat-icon>
      </button>
    </header>

    <mat-dialog-content class="wizard-content">
      <section class="step-section">
        <div class="section-intro">
          <div>
            <span class="section-kicker">Source</span>
            <h3>Saisie manuelle</h3>
          </div>
          <mat-chip-set class="source-chip" aria-label="Source">
            <mat-chip>Manuel</mat-chip>
          </mat-chip-set>
        </div>

        <p class="info-note">Les dates, effectifs et plans sélectionnés seront utilisés pour calculer le suivi du contrat.</p>

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
      </section>
    </mat-dialog-content>

    <mat-dialog-actions class="wizard-footer" align="end">
      <button mat-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="createContract()">
        Créer le contrat
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    :host {
      box-sizing: border-box;
      display: block;
      max-height: 90vh;
      max-width: 100%;
      overflow: hidden;
    }

    :host *,
    :host *::before,
    :host *::after {
      box-sizing: border-box;
    }

    .wizard-header {
      align-items: flex-start;
      background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      gap: 18px;
      justify-content: space-between;
      min-width: 0;
      padding: 18px 22px 16px;
    }

    .dialog-close {
      --mdc-icon-button-state-layer-size: 38px;
      align-items: center;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 999px;
      color: #334155;
      display: inline-flex;
      flex: 0 0 38px;
      height: 38px;
      justify-content: center;
      padding: 0;
      width: 38px;
    }

    .dialog-close mat-icon {
      font-size: 20px;
      height: 20px;
      width: 20px;
    }

    .wizard-heading {
      display: grid;
      gap: 5px;
      min-width: 0;
    }

    .section-kicker {
      color: var(--omnicare-secondary);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    h2[mat-dialog-title] {
      color: var(--omnicare-text);
      font-size: 1.45rem;
      font-weight: 800;
      line-height: 1.2;
      margin: 0;
      padding: 0;
    }

    .wizard-heading p {
      color: var(--omnicare-muted);
      font-size: 0.94rem;
      margin: 0;
    }

    .wizard-content {
      background: #f8fafc;
      max-height: min(68vh, 760px);
      max-width: 100%;
      overflow: auto;
      overflow-x: hidden;
      padding: 16px 22px;
    }

    .step-section {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      box-shadow: 0 18px 42px rgba(15, 23, 42, 0.06);
      display: grid;
      gap: 16px;
      max-width: 100%;
      min-width: 0;
      padding: 16px;
    }

    .section-intro {
      align-items: flex-start;
      display: flex;
      gap: 14px;
      justify-content: space-between;
      min-width: 0;
    }

    .section-intro h3 {
      color: var(--omnicare-text);
      font-size: 1.05rem;
      margin: 2px 0 0;
    }

    .info-note {
      background: #f4f8fb;
      border: 1px solid #d9e4ec;
      border-radius: 14px;
      color: #475569;
      font-size: 0.9rem;
      line-height: 1.5;
      margin: 0;
      padding: 12px 14px;
    }

    .form-grid {
      display: grid;
      gap: 12px 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      max-width: 100%;
      min-width: 0;
    }

    .source-chip {
      display: block;
    }

    .source-chip mat-chip {
      --mdc-chip-elevated-container-color: #eef6f4;
      --mdc-chip-label-text-color: var(--omnicare-secondary);
      border: 1px solid #cfe5df;
      font-weight: 800;
    }

    mat-form-field {
      min-width: 0;
      width: 100%;
    }

    :host ::ng-deep .mat-mdc-form-field,
    :host ::ng-deep .mat-mdc-text-field-wrapper {
      min-width: 0 !important;
      width: 100%;
    }

    :host ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      display: none;
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

    .wizard-footer {
      border-top: 1px solid #e5e7eb;
      gap: 10px;
      min-width: 0;
      padding: 12px 22px 16px;
    }

    @media (max-width: 680px) {
      .wizard-header,
      .wizard-content,
      .wizard-footer {
        padding-left: 16px;
        padding-right: 16px;
      }

      .section-intro {
        display: grid;
      }

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
