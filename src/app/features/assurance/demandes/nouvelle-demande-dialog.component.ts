import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideNativeDateAdapter } from '@angular/material/core';

import { Adherent } from '../../../models/adherent.model';
import { DemandeRemboursement } from '../../../models/demande-remboursement.model';
import { ActCategory } from '../../../models/shared.model';
import { DemandesFacade } from './demandes.facade';

interface NouvelleDemandeData {
  companyId: string;
}

type ProviderType = DemandeRemboursement['providerType'];

@Component({
  selector: 'app-nouvelle-demande-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    ReactiveFormsModule,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <header class="wizard-header">
      <div class="wizard-heading">
        <span class="section-kicker">Espace COMAR</span>
        <h2 mat-dialog-title>Nouvelle demande</h2>
        <p>Saisie manuelle d'un dossier de remboursement avec les pièces justificatives.</p>
      </div>
      <button class="dialog-close" mat-icon-button type="button" mat-dialog-close aria-label="Fermer">
        <mat-icon aria-hidden="true">close</mat-icon>
      </button>
    </header>

    <mat-dialog-content class="wizard-content">
      <section class="step-section">
        <div class="section-intro">
          <div>
            <span class="section-kicker">Source verrouillée</span>
            <h3>Dossier manuel</h3>
          </div>
          <mat-chip-set aria-label="Source verrouillée">
            <mat-chip class="manual-source">
              <mat-icon matChipAvatar aria-hidden="true">edit</mat-icon>
              Manuel
            </mat-chip>
          </mat-chip-set>
        </div>

        <p class="info-note">
          Les informations saisies ici alimentent directement la file COMAR et restent modifiables avant décision.
        </p>

        <form class="dialog-form" [formGroup]="form" (ngSubmit)="submit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Rechercher un adhérent</mat-label>
            <input matInput type="text" (input)="searchAdherent($event)" />
          </mat-form-field>

          <mat-form-field appearance="outline">
          <mat-label>Adhérent</mat-label>
          <mat-select formControlName="adherentId" required>
            @for (adherent of filteredAdherents(); track adherent.id) {
              <mat-option [value]="adherent.id">
                {{ adherent.patientName }} · {{ adherent.membershipId }}
              </mat-option>
            }
          </mat-select>
          @if (isInvalid('adherentId')) {
            <mat-error>Adhérent obligatoire</mat-error>
          }
          </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Catégorie d'acte</mat-label>
          <mat-select formControlName="actCategory" required>
            @for (option of actCategoryOptions; track option.value) {
              <mat-option [value]="option.value">{{ option.label }}</mat-option>
            }
          </mat-select>
          @if (isInvalid('actCategory')) {
            <mat-error>Catégorie obligatoire</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Prestataire</mat-label>
          <input matInput formControlName="providerName" type="text" />
          @if (isInvalid('providerName')) {
            <mat-error>Prestataire obligatoire</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Type prestataire</mat-label>
          <mat-select formControlName="providerType" required>
            @for (option of providerTypeOptions; track option.value) {
              <mat-option [value]="option.value">{{ option.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-checkbox formControlName="providerInNetwork">Réseau agréé</mat-checkbox>

        <mat-form-field appearance="outline">
          <mat-label>Date de l'acte</mat-label>
          <input matInput [matDatepicker]="actPicker" formControlName="actDate" required />
          <mat-datepicker-toggle matIconSuffix [for]="actPicker" />
          <mat-datepicker #actPicker />
          @if (isInvalid('actDate')) {
            <mat-error>Date de l'acte obligatoire</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Numéro de facture</mat-label>
          <input matInput formControlName="factureNumber" type="text" required />
          @if (isInvalid('factureNumber')) {
            <mat-error>Numéro de facture obligatoire</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Date facture</mat-label>
          <input matInput [matDatepicker]="facturePicker" formControlName="factureDate" required />
          <mat-datepicker-toggle matIconSuffix [for]="facturePicker" />
          <mat-datepicker #facturePicker />
          @if (isInvalid('factureDate')) {
            <mat-error>Date facture obligatoire</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Montant (TND)</mat-label>
          <input matInput formControlName="totalAmount" type="number" min="0" required />
          @if (isInvalid('totalAmount')) {
            <mat-error>Montant obligatoire</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>

        <section class="documents full-width" aria-label="Documents simulés">
          <h3>Documents</h3>
          @for (row of uploadRows; track row) {
            <div class="upload-row">
              <mat-icon aria-hidden="true">upload_file</mat-icon>
              <span>{{ row }}</span>
              <button
                mat-stroked-button
                type="button"
                disabled
                matTooltip="Upload simulé — démo uniquement"
              >
                Téléverser
              </button>
            </div>
          }
        </section>
        </form>
      </section>
    </mat-dialog-content>

    <mat-dialog-actions class="wizard-footer" align="end">
      <button mat-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()">Créer la demande</button>
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
      display: block;
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

    .manual-source {
      --mdc-chip-elevated-container-color: #eef6f4;
      --mdc-chip-label-text-color: var(--omnicare-secondary);
      border: 1px solid #cfe5df;
      font-weight: 800;
    }

    .dialog-form {
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

    .full-width,
    .documents {
      grid-column: 1 / -1;
    }

    .documents {
      background: #fbfcfd;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      display: grid;
      gap: 10px;
      padding: 14px;
    }

    .documents h3 {
      color: var(--omnicare-text);
      font-size: 1rem;
      margin: 0;
    }

    .upload-row {
      align-items: center;
      display: grid;
      gap: 10px;
      grid-template-columns: auto 1fr auto;
    }

    .wizard-footer {
      border-top: 1px solid #e5e7eb;
      gap: 10px;
      min-width: 0;
      padding: 12px 22px 16px;
    }

    @media (max-width: 720px) {
      .wizard-header,
      .wizard-content,
      .wizard-footer {
        padding-left: 16px;
        padding-right: 16px;
      }

      .section-intro {
        display: grid;
      }

      .dialog-form {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class NouvelleDemandeDialogComponent {
  private readonly facade = inject(DemandesFacade);
  private readonly dialogRef = inject(MatDialogRef<NouvelleDemandeDialogComponent>);
  private readonly snackBar = inject(MatSnackBar);
  private readonly data = inject<NouvelleDemandeData>(MAT_DIALOG_DATA);

  protected readonly adherents = signal<Adherent[]>(this.readAdherents());
  protected readonly adherentSearch = signal('');
  protected readonly uploadRows = ['Facture PDF', 'Bulletin de soins PDF', 'Autres documents'];

  protected readonly actCategoryOptions: Array<{ value: ActCategory; label: string }> = [
    { value: 'CONSULTATION', label: 'Consultation' },
    { value: 'CHIRURGIE', label: 'Chirurgie' },
    { value: 'KINESITHERAPIE', label: 'Kinésithérapie' },
    { value: 'SOINS_INFIRMIERS', label: 'Soins infirmiers' },
    { value: 'RADIOLOGIE', label: 'Radiologie' },
    { value: 'BIOLOGIE', label: 'Biologie' },
    { value: 'HOSPITALISATION', label: 'Hospitalisation' },
    { value: 'DENTAIRE', label: 'Dentaire' },
    { value: 'OPTIQUE', label: 'Optique' },
    { value: 'PSYCHIATRIE', label: 'Psychiatrie' },
    { value: 'MATERNITE', label: 'Maternité' },
    { value: 'URGENCES', label: 'Urgences' },
    { value: 'AUTRE', label: 'Autre' },
  ];
  protected readonly providerTypeOptions: Array<{ value: ProviderType; label: string }> = [
    { value: 'CLINIQUE', label: 'Clinique' },
    { value: 'MEDECIN', label: 'Médecin' },
    { value: 'KINE', label: 'Kinésithérapeute' },
    { value: 'INFIRMIER', label: 'Infirmier' },
    { value: 'AUTRE', label: 'Autre' },
  ];

  protected readonly form = new FormGroup({
    adherentId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    actCategory: new FormControl<ActCategory>('CONSULTATION', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    providerName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    providerInNetwork: new FormControl(true, { nonNullable: true }),
    actDate: new FormControl<Date | null>(null, { validators: [Validators.required] }),
    factureNumber: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    factureDate: new FormControl<Date | null>(null, { validators: [Validators.required] }),
    totalAmount: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(0)],
    }),
    description: new FormControl('', { nonNullable: true }),
    providerType: new FormControl<ProviderType>('MEDECIN', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected readonly filteredAdherents = computed(() => {
    const search = this.adherentSearch().toLowerCase();

    if (!search) {
      return this.adherents();
    }

    return this.adherents().filter((adherent) =>
      `${adherent.patientName} ${adherent.membershipId}`.toLowerCase().includes(search),
    );
  });

  protected searchAdherent(event: Event): void {
    this.adherentSearch.set((event.target as HTMLInputElement).value);
  }

  protected isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];

    return control.invalid && (control.dirty || control.touched);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const adherent = this.adherents().find((item) => item.id === value.adherentId);

    if (!adherent || !value.actDate || !value.factureDate || value.totalAmount === null) {
      this.form.markAllAsTouched();
      return;
    }

    const now = new Date().toISOString();
    const id = `DEM-${Date.now()}`;
    const newDemande: DemandeRemboursement = {
      id,
      companyId: this.data.companyId,
      patientName: adherent.patientName,
      patientMemberId: adherent.membershipId,
      planTierName: adherent.planTierName,
      employerName: adherent.employer?.employerName,
      contractId: adherent.employer?.contractId,
      factureNumber: value.factureNumber,
      factureDate: this.toIsoDate(value.factureDate),
      providerName: value.providerName,
      providerType: value.providerType,
      providerInNetwork: value.providerInNetwork,
      actCategory: value.actCategory,
      actDescription: value.description || this.labelForActCategory(value.actCategory),
      totalAmount: value.totalAmount,
      source: 'MANUEL',
      documents: [],
      status: 'SOUMISE',
      submittedAt: now,
      actDate: this.toIsoDate(value.actDate),
      lastUpdatedAt: now,
      flags: [],
      riskScore: 'FAIBLE',
    };

    this.facade.addDemande(newDemande);
    this.snackBar.open(`Demande créée avec succès · #${id}`, 'Fermer', {
      duration: 3500,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: 'notification-success',
    });
    this.dialogRef.close({ created: true });
  }

  private readAdherents(): Adherent[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const raw = localStorage.getItem(`omnicare_ins_${this.data.companyId}_adherents`);

    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as Adherent[];
    } catch {
      return [];
    }
  }

  private toIsoDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }

  private labelForActCategory(category: ActCategory): string {
    return this.actCategoryOptions.find((option) => option.value === category)?.label ?? 'Acte';
  }
}
