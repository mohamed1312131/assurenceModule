import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ActCategory } from '../../../models/shared.model';
import { CompagniesFacade } from './compagnies.facade';

type PlanTemplate = 'BASIQUE' | 'CONFORT' | 'PREMIUM' | 'PERSONNALISE';

interface CompanyForm {
  name: string;
  code: string;
  cgaRegistrationNumber: string;
  inpdpDeclarationNumber: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
}

interface AdminForm {
  name: string;
  email: string;
  phone: string;
}

@Component({
  selector: 'app-onboarding-wizard',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRadioModule,
    MatSnackBarModule,
    MatStepperModule,
    MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>Nouvelle compagnie</h2>

    <mat-dialog-content>
      <mat-stepper linear #stepper>
        <mat-step [completed]="isCompanyValid()">
          <ng-template matStepLabel>Informations compagnie</ng-template>
          <section class="step-content">
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Nom compagnie</mat-label>
                <input matInput [value]="company().name" (input)="patchCompany('name', $any($event.target).value)" required />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Code</mat-label>
                <input matInput [value]="company().code" (input)="patchCompany('code', uppercase($any($event.target).value))" required />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Immatriculation CGA</mat-label>
                <input matInput [value]="company().cgaRegistrationNumber" (input)="patchCompany('cgaRegistrationNumber', $any($event.target).value)" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Déclaration INPDP</mat-label>
                <input matInput [value]="company().inpdpDeclarationNumber" (input)="patchCompany('inpdpDeclarationNumber', $any($event.target).value)" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Email contact</mat-label>
                <input matInput type="email" [value]="company().contactEmail" (input)="patchCompany('contactEmail', $any($event.target).value)" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Téléphone</mat-label>
                <input matInput [value]="company().contactPhone" (input)="patchCompany('contactPhone', $any($event.target).value)" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Adresse</mat-label>
                <input matInput [value]="company().address" (input)="patchCompany('address', $any($event.target).value)" />
              </mat-form-field>
            </div>

            <button mat-stroked-button disabled matTooltip="Upload simulé — démo uniquement">
              <mat-icon aria-hidden="true">upload_file</mat-icon>
              Logo compagnie
            </button>
          </section>
          <div class="step-actions">
            <button mat-flat-button color="primary" type="button" [disabled]="!isCompanyValid()" matStepperNext>
              Suivant
            </button>
          </div>
        </mat-step>

        <mat-step [completed]="isAdminValid()">
          <ng-template matStepLabel>Compte administrateur</ng-template>
          <section class="step-content">
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Nom complet</mat-label>
                <input matInput [value]="admin().name" (input)="patchAdmin('name', $any($event.target).value)" required />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Email professionnel</mat-label>
                <input matInput type="email" [value]="admin().email" (input)="patchAdmin('email', $any($event.target).value)" required />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Téléphone direct</mat-label>
                <input matInput [value]="admin().phone" (input)="patchAdmin('phone', $any($event.target).value)" />
              </mat-form-field>
            </div>
            <p class="info-note">
              Un mot de passe temporaire sera généré et envoyé par email.
            </p>
          </section>
          <div class="step-actions">
            <button mat-button type="button" matStepperPrevious>Retour</button>
            <button mat-flat-button color="primary" type="button" [disabled]="!isAdminValid()" matStepperNext>
              Suivant
            </button>
          </div>
        </mat-step>

        <mat-step [completed]="true">
          <ng-template matStepLabel>Premier plan tarifaire</ng-template>
          <section class="step-content">
            <mat-radio-group class="template-grid" [value]="template()" (change)="template.set($event.value)">
              <mat-radio-button value="BASIQUE">Basique · 25 %</mat-radio-button>
              <mat-radio-button value="CONFORT">Confort · 40 % recommandé</mat-radio-button>
              <mat-radio-button value="PREMIUM">Premium · 60 %</mat-radio-button>
              <mat-radio-button value="PERSONNALISE">Personnalisé</mat-radio-button>
            </mat-radio-group>

            @if (template() === 'PERSONNALISE') {
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Nom du plan</mat-label>
                  <input matInput [value]="customPlanName()" (input)="customPlanName.set($any($event.target).value)" />
                </mat-form-field>
                @for (category of customCategories; track category) {
                  <mat-form-field appearance="outline">
                    <mat-label>{{ actLabel(category) }} (%)</mat-label>
                    <input
                      matInput
                      type="number"
                      [value]="customCoverage()[category] ?? 40"
                      (input)="patchCoverage(category, +$any($event.target).value)"
                    />
                  </mat-form-field>
                }
              </div>
            }

            <mat-card class="coverage-preview">
              <h3>Aperçu de couverture</h3>
              <div class="coverage-table">
                @for (rule of selectedPlan().coverageRules.slice(0, 6); track rule.actCategory) {
                  <div>
                    <span>{{ actLabel(rule.actCategory) }}</span>
                    <strong>{{ rule.coveragePercent }} %</strong>
                  </div>
                }
              </div>
            </mat-card>
          </section>
          <div class="step-actions">
            <button mat-button type="button" matStepperPrevious>Retour</button>
            <button mat-flat-button color="primary" type="button" matStepperNext>Suivant</button>
          </div>
        </mat-step>

        <mat-step [completed]="true">
          <ng-template matStepLabel>Import adhérents</ng-template>
          <section class="step-content">
            <p class="info-note">
              Format attendu : matricule, nom, email, téléphone, plan, employeur.
            </p>
            <div class="import-actions">
              <button mat-stroked-button type="button" (click)="downloadTemplate()">
                <mat-icon aria-hidden="true">download</mat-icon>
                Télécharger modèle
              </button>
              <button mat-flat-button color="primary" type="button" (click)="fileInput.click()">
                <mat-icon aria-hidden="true">upload_file</mat-icon>
                Choisir CSV
              </button>
              <input #fileInput hidden type="file" accept=".csv" (change)="parseFile($event)" />
            </div>
            <mat-chip-set aria-label="Import">
              <mat-chip>{{ importedRows() }} ligne(s) détectée(s)</mat-chip>
            </mat-chip-set>
          </section>
          <div class="step-actions">
            <button mat-button type="button" matStepperPrevious>Retour</button>
            <button mat-button type="button" (click)="importedRows.set(0)" matStepperNext>
              Passer cette étape
            </button>
            <button mat-flat-button color="primary" type="button" matStepperNext>Suivant</button>
          </div>
        </mat-step>

        <mat-step>
          <ng-template matStepLabel>Activation</ng-template>
          <section class="step-content">
            <mat-card class="recap-card">
              <h3>Récapitulatif</h3>
              <p><strong>Compagnie :</strong> {{ company().name }} · {{ company().code }}</p>
              <p><strong>Administrateur :</strong> {{ admin().name }} · {{ admin().email }}</p>
              <p><strong>Plans configurés :</strong> 1</p>
              <p><strong>Adhérents importés :</strong> {{ importedRows() }}</p>
            </mat-card>

            <mat-checkbox [checked]="fraudOptIn()" (change)="fraudOptIn.set($event.checked)">
              Partager les signaux de fraude avec FTUSA (ALFA)
            </mat-checkbox>
            <mat-checkbox [checked]="analyticsOptIn()" (change)="analyticsOptIn.set($event.checked)">
              Inclure les données dans l’analytique marché agrégée
            </mat-checkbox>

            <p class="warning-note">
              Ces partages requièrent un accord contractuel séparé. Valeurs par défaut OFF.
            </p>
          </section>
          <div class="step-actions">
            <button mat-button type="button" matStepperPrevious>Retour</button>
            <button mat-flat-button color="primary" type="button" (click)="activate()">
              Activer la compagnie
            </button>
          </div>
        </mat-step>
      </mat-stepper>
    </mat-dialog-content>
  `,
  styles: `
    mat-dialog-content {
      min-width: min(720px, 82vw);
    }

    .step-content {
      display: grid;
      gap: 16px;
      padding: 18px 0;
    }

    .form-grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .full {
      grid-column: 1 / -1;
    }

    .step-actions,
    .import-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: flex-end;
    }

    .info-note {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      color: #1d4ed8;
      margin: 0;
      padding: 12px;
    }

    .warning-note {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 12px;
      color: #92400e;
      margin: 0;
      padding: 12px;
    }

    .template-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .coverage-preview,
    .recap-card {
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      box-shadow: none;
      padding: 14px;
    }

    h3 {
      color: var(--omnicare-text);
      font-size: 1rem;
      margin: 0 0 12px;
    }

    .coverage-table {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .coverage-table div {
      align-items: center;
      border: 1px solid #edf2f7;
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      padding: 10px;
    }

    .coverage-table span {
      color: var(--omnicare-muted);
    }

    @media (max-width: 720px) {
      .form-grid,
      .template-grid,
      .coverage-table {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class OnboardingWizardComponent {
  private readonly dialogRef = inject(MatDialogRef<OnboardingWizardComponent>);
  private readonly facade = inject(CompagniesFacade);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly data = inject(MAT_DIALOG_DATA, { optional: true });
  protected readonly customCategories: ActCategory[] = [
    'CONSULTATION',
    'CHIRURGIE',
    'HOSPITALISATION',
    'DENTAIRE',
  ];
  protected readonly company = signal<CompanyForm>({
    address: 'Tunis',
    cgaRegistrationNumber: '',
    code: '',
    contactEmail: '',
    contactPhone: '+216 ',
    inpdpDeclarationNumber: '',
    name: '',
  });
  protected readonly admin = signal<AdminForm>({
    email: '',
    name: '',
    phone: '',
  });
  protected readonly template = signal<PlanTemplate>('CONFORT');
  protected readonly customPlanName = signal('Personnalisé');
  protected readonly customCoverage = signal<Partial<Record<ActCategory, number>>>({});
  protected readonly importedRows = signal(0);
  protected readonly fraudOptIn = signal(false);
  protected readonly analyticsOptIn = signal(false);

  protected readonly isCompanyValid = computed(
    () => this.company().name.trim().length > 0 && this.company().code.trim().length > 0,
  );
  protected readonly isAdminValid = computed(
    () => this.admin().name.trim().length > 0 && this.admin().email.trim().length > 0,
  );
  protected readonly selectedPlan = computed(() =>
    this.facade.planFromTemplate(
      'new-company',
      this.template(),
      this.customPlanName().trim() || 'Personnalisé',
      this.customCoverage(),
    ),
  );

  protected patchCompany<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]): void {
    this.company.update((current) => ({ ...current, [key]: value }));
  }

  protected patchAdmin<K extends keyof AdminForm>(key: K, value: AdminForm[K]): void {
    this.admin.update((current) => ({ ...current, [key]: value }));
  }

  protected patchCoverage(category: ActCategory, value: number): void {
    this.customCoverage.update((current) => ({
      ...current,
      [category]: Number.isFinite(value) ? value : 0,
    }));
  }

  protected uppercase(value: string): string {
    return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  protected parseFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const rows = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      this.importedRows.set(Math.max(0, rows.length - 1));
    };
    reader.readAsText(file);
  }

  protected downloadTemplate(): void {
    const csv = [
      'matricule,nom,email,telephone,plan,employeur',
      'NEW-001,Sonia Gharbi,sonia@example.tn,+216 20 000 001,Confort,',
      'NEW-002,Karim Mansour,karim@example.tn,+216 20 000 002,Confort,',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'modele-adherents.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected activate(): void {
    const companyForm = this.company();
    const adminForm = this.admin();
    const company = this.facade.createTenant({
      adminEmail: adminForm.email.trim(),
      adminName: adminForm.name.trim(),
      company: {
        address: companyForm.address.trim(),
        cgaRegistrationNumber: companyForm.cgaRegistrationNumber.trim() || `CGA-${companyForm.code}-2026`,
        code: companyForm.code.trim(),
        contactEmail: companyForm.contactEmail.trim(),
        contactPhone: companyForm.contactPhone.trim(),
        inpdpDeclarationNumber:
          companyForm.inpdpDeclarationNumber.trim() || `INPDP-${companyForm.code}-2026`,
        name: companyForm.name.trim(),
        participatesInCrossFraudDetection: this.fraudOptIn(),
        participatesInMarketAnalytics: this.analyticsOptIn(),
      },
      importedAdherentsCount: this.importedRows(),
      participatesInCrossFraudDetection: this.fraudOptIn(),
      participatesInMarketAnalytics: this.analyticsOptIn(),
      planTier: this.selectedPlan(),
    });

    this.snackBar.open(
      `Compagnie ${company.name} activée · email envoyé à l’administrateur (simulation)`,
      'Fermer',
      { duration: 4500 },
    );
    this.dialogRef.close({ created: true });
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
}
