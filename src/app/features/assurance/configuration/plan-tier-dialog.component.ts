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
    <h2 mat-dialog-title>{{ data.plan ? 'Modifier le plan' : 'Nouveau plan' }}</h2>

    <mat-dialog-content>
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

      <section class="coverage-section">
        <h3>Règles de couverture</h3>
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

    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="save()">Enregistrer</button>
    </mat-dialog-actions>
  `,
  styles: `
    .form-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      min-width: min(780px, 82vw);
      padding-top: 4px;
    }

    .coverage-section {
      margin-top: 18px;
    }

    h3 {
      color: var(--omnicare-text);
      font-size: 1rem;
      margin: 0 0 12px;
    }

    .coverage-header,
    .coverage-row {
      display: grid;
      gap: 10px;
      grid-template-columns: 1.6fr repeat(3, minmax(90px, 1fr));
    }

    .coverage-header {
      color: var(--omnicare-muted);
      font-size: 0.76rem;
      font-weight: 800;
      margin-bottom: 8px;
      text-transform: uppercase;
    }

    .coverage-row {
      align-items: center;
      border-top: 1px solid #edf2f7;
      padding: 8px 0;
    }

    .coverage-row input {
      border: 1px solid #d1d5db;
      border-radius: 10px;
      font: inherit;
      padding: 8px 10px;
      width: 100%;
    }

    .error-message {
      color: #b91c1c;
      margin: 10px 0 0;
    }

    @media (max-width: 760px) {
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
