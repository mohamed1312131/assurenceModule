import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { CoverageRule, PlanTier } from '../../../models/plan-tier.model';
import { ActCategory } from '../../../models/shared.model';

interface PlanDialogData {
  companyId: string;
  plan: PlanTier | null;
}

interface PlanForm {
  name: string;
  description: string;
  monthlyPremium: number;
  autoApproveThreshold: number;
  reinsuranceThreshold: number;
  claimFilingDeadlineDays: number;
  slaTargetDays: number;
  coverageRules: CoverageRule[];
}

const ACT_CATEGORIES: ActCategory[] = [
  'CONSULTATION',
  'CHIRURGIE',
  'KINESITHERAPIE',
  'SOINS_INFIRMIERS',
  'RADIOLOGIE',
  'BIOLOGIE',
  'HOSPITALISATION',
  'DENTAIRE',
  'OPTIQUE',
  'PSYCHIATRIE',
  'MATERNITE',
  'URGENCES',
  'AUTRE',
];

@Component({
  selector: 'app-plan-tier-dialog',
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <header class="wizard-header">
      <div class="wizard-heading">
        <span class="section-kicker">Configuration COMAR</span>
        <h2 mat-dialog-title>{{ data.plan ? 'Modifier le plan' : 'Nouveau plan' }}</h2>
        <p>Paramétrez les seuils, délais SLA et règles de couverture par catégorie d'acte.</p>
      </div>
      <button class="dialog-close" mat-icon-button type="button" mat-dialog-close aria-label="Fermer">×</button>
    </header>

    <mat-dialog-content class="wizard-content">
      <section class="step-section">
        <div class="section-intro">
          <span class="section-kicker">Informations du plan</span>
          <p>Les valeurs définies ici sont reprises dans les contrôles automatiques des demandes.</p>
        </div>

        <div class="form-grid">
        <mat-form-field appearance="outline">
          <mat-label>Nom</mat-label>
          <input matInput [value]="form().name" (input)="patch('name', $any($event.target).value)" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <input matInput [value]="form().description" (input)="patch('description', $any($event.target).value)" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Prime mensuelle</mat-label>
          <input matInput type="number" [value]="form().monthlyPremium" (input)="patchNumber('monthlyPremium', $any($event.target).value)" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Seuil auto-approbation</mat-label>
          <input matInput type="number" [value]="form().autoApproveThreshold" (input)="patchNumber('autoApproveThreshold', $any($event.target).value)" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Seuil réassurance</mat-label>
          <input matInput type="number" [value]="form().reinsuranceThreshold" (input)="patchNumber('reinsuranceThreshold', $any($event.target).value)" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Délai dépôt dossier</mat-label>
          <input matInput type="number" [value]="form().claimFilingDeadlineDays" (input)="patchNumber('claimFilingDeadlineDays', $any($event.target).value)" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>SLA cible</mat-label>
          <input matInput type="number" [value]="form().slaTargetDays" (input)="patchNumber('slaTargetDays', $any($event.target).value)" />
        </mat-form-field>
        </div>
      </section>

      <section class="coverage-section">
        <div class="section-intro">
          <span class="section-kicker">Règles de couverture</span>
          <p>Renseignez le pourcentage et les plafonds applicables à chaque catégorie.</p>
        </div>
        <div class="coverage-header">
          <span>Catégorie</span>
          <span>%</span>
          <span>Plafond acte</span>
          <span>Plafond annuel</span>
        </div>

        @for (rule of form().coverageRules; track rule.actCategory) {
          <div class="coverage-row">
            <strong>{{ actLabel(rule.actCategory) }}</strong>
            <input
              type="number"
              min="0"
              max="100"
              [value]="rule.coveragePercent"
              (input)="patchCoverage(rule.actCategory, 'coveragePercent', $any($event.target).value)"
            />
            <input
              type="number"
              min="0"
              [value]="rule.maxAmountPerClaim ?? ''"
              (input)="patchCoverage(rule.actCategory, 'maxAmountPerClaim', $any($event.target).value)"
            />
            <input
              type="number"
              min="0"
              [value]="rule.maxAmountPerYear ?? ''"
              (input)="patchCoverage(rule.actCategory, 'maxAmountPerYear', $any($event.target).value)"
            />
          </div>
        }
      </section>

      @if (submitted() && !isValid()) {
        <p class="error-message">Merci de renseigner au moins le nom du plan.</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions class="wizard-footer" align="end">
      <button mat-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">Enregistrer</button>
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
      font-size: 1.3rem;
      height: 38px;
      justify-content: center;
      line-height: 1;
      padding: 0;
      width: 38px;
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

    .wizard-heading p,
    .section-intro p {
      color: var(--omnicare-muted);
      font-size: 0.94rem;
      margin: 0;
    }

    .wizard-content {
      background: #f8fafc;
      display: grid;
      gap: 18px;
      max-height: min(68vh, 760px);
      max-width: 100%;
      overflow: auto;
      overflow-x: hidden;
      padding: 16px 22px;
    }

    .step-section,
    .coverage-section {
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
      display: grid;
      gap: 5px;
    }

    .form-grid {
      display: grid;
      gap: 12px 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      max-width: 100%;
      min-width: 0;
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

    .coverage-header,
    .coverage-row {
      display: grid;
      gap: 10px;
      grid-template-columns: 1.6fr repeat(3, minmax(90px, 1fr));
    }

    .coverage-header {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      color: var(--omnicare-muted);
      font-size: 0.76rem;
      font-weight: 800;
      padding: 10px 12px;
      text-transform: uppercase;
    }

    .coverage-row {
      align-items: center;
      border: 1px solid #edf2f7;
      border-radius: 12px;
      padding: 10px 12px;
    }

    .coverage-row input {
      background: #fbfcfd;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      font: inherit;
      padding: 8px 10px;
      width: 100%;
    }

    .coverage-row input:focus {
      border-color: var(--omnicare-secondary);
      box-shadow: 0 0 0 3px rgba(0, 124, 128, 0.12);
      outline: none;
    }

    .error-message {
      color: #b91c1c;
      margin: 10px 0 0;
    }

    .wizard-footer {
      border-top: 1px solid #e5e7eb;
      gap: 10px;
      min-width: 0;
      padding: 12px 22px 16px;
    }

    @media (max-width: 760px) {
      .wizard-header,
      .wizard-content,
      .wizard-footer {
        padding-left: 16px;
        padding-right: 16px;
      }

      .form-grid,
      .coverage-header,
      .coverage-row {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class PlanTierDialogComponent {
  protected readonly data = inject(MAT_DIALOG_DATA) as PlanDialogData;
  private readonly dialogRef = inject(MatDialogRef<PlanTierDialogComponent>);

  protected readonly submitted = signal(false);
  protected readonly form = signal<PlanForm>(this.initialForm());
  protected readonly isValid = computed(() => this.form().name.trim().length > 0);

  protected patch<K extends keyof PlanForm>(key: K, value: PlanForm[K]): void {
    this.form.update((current) => ({ ...current, [key]: value }));
  }

  protected patchNumber(
    key: 'autoApproveThreshold' | 'claimFilingDeadlineDays' | 'monthlyPremium' | 'reinsuranceThreshold' | 'slaTargetDays',
    rawValue: string,
  ): void {
    const value = Number(rawValue);
    this.patch(key, Number.isFinite(value) ? value : 0);
  }

  protected patchCoverage(
    category: ActCategory,
    key: 'coveragePercent' | 'maxAmountPerClaim' | 'maxAmountPerYear',
    rawValue: string,
  ): void {
    const value = rawValue === '' ? undefined : Number(rawValue);
    this.form.update((current) => ({
      ...current,
      coverageRules: current.coverageRules.map((rule) =>
        rule.actCategory === category
          ? {
              ...rule,
              [key]: Number.isFinite(value) ? value : undefined,
            }
          : rule,
      ),
    }));
  }

  protected save(): void {
    this.submitted.set(true);

    if (!this.isValid()) {
      return;
    }

    const form = this.form();
    const plan: PlanTier = {
      autoApproveThreshold: form.autoApproveThreshold,
      claimFilingDeadlineDays: form.claimFilingDeadlineDays,
      companyId: this.data.companyId,
      coverageRules: form.coverageRules,
      description: form.description,
      id: this.data.plan?.id ?? `${this.data.companyId}-plan-${Date.now()}`,
      monthlyPremium: form.monthlyPremium,
      name: form.name.trim(),
      reinsuranceThreshold: form.reinsuranceThreshold,
      requiresPriorAuth: this.data.plan?.requiresPriorAuth ?? ['CHIRURGIE', 'HOSPITALISATION'],
      slaTargetDays: form.slaTargetDays,
    };

    this.dialogRef.close(plan);
  }

  protected actLabel(category: ActCategory): string {
    const labels: Record<ActCategory, string> = {
      AUTRE: 'Autre',
      BIOLOGIE: 'Biologie',
      CHIRURGIE: 'Chirurgie',
      CONSULTATION: 'Consultation',
      DENTAIRE: 'Dentaire',
      HOSPITALISATION: 'Hospitalisation',
      KINESITHERAPIE: 'Kinésithérapie',
      MATERNITE: 'Maternité',
      OPTIQUE: 'Optique',
      PSYCHIATRIE: 'Psychiatrie',
      RADIOLOGIE: 'Radiologie',
      SOINS_INFIRMIERS: 'Soins infirmiers',
      URGENCES: 'Urgences',
    };

    return labels[category];
  }

  private initialForm(): PlanForm {
    const plan = this.data.plan;

    if (plan) {
      return {
        autoApproveThreshold: plan.autoApproveThreshold,
        claimFilingDeadlineDays: plan.claimFilingDeadlineDays,
        coverageRules: this.withAllCategories(plan.coverageRules),
        description: plan.description,
        monthlyPremium: plan.monthlyPremium,
        name: plan.name,
        reinsuranceThreshold: plan.reinsuranceThreshold,
        slaTargetDays: plan.slaTargetDays,
      };
    }

    return {
      autoApproveThreshold: 250,
      claimFilingDeadlineDays: 30,
      coverageRules: this.withAllCategories([]),
      description: '',
      monthlyPremium: 0,
      name: '',
      reinsuranceThreshold: 7000,
      slaTargetDays: 10,
    };
  }

  private withAllCategories(existingRules: CoverageRule[]): CoverageRule[] {
    return ACT_CATEGORIES.map((category) => {
      const existing = existingRules.find((rule) => rule.actCategory === category);

      return (
        existing ?? {
          actCategory: category,
          coveragePercent: 0,
          maxAmountPerClaim: 0,
          maxAmountPerYear: 0,
        }
      );
    });
  }
}
