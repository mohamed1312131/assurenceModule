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
    <h2 mat-dialog-title>Nouvelle demande — saisie manuelle</h2>

    <mat-dialog-content>
      <mat-chip-set aria-label="Source verrouillée">
        <mat-chip class="manual-source">
          <mat-icon matChipAvatar aria-hidden="true">edit</mat-icon>
          MANUEL
        </mat-chip>
      </mat-chip-set>

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
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" mat-dialog-close>Annuler</button>
      <button mat-flat-button color="primary" type="button" (click)="submit()">Créer la demande</button>
    </mat-dialog-actions>
  `,
  styles: `
    .manual-source {
      --mdc-chip-elevated-container-color: rgba(31, 191, 154, 0.12);
      --mdc-chip-label-text-color: var(--omnicare-secondary);
      margin-bottom: 14px;
    }

    .dialog-form {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      padding-top: 8px;
    }

    .full-width,
    .documents {
      grid-column: 1 / -1;
    }

    .documents {
      background: #f8fafc;
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

    @media (max-width: 720px) {
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
