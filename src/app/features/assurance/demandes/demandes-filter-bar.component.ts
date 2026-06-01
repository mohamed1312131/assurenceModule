import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideNativeDateAdapter } from '@angular/material/core';

import {
  ClaimFlag,
  DemandeStatus,
} from '../../../models/demande-remboursement.model';
import { ActCategory, ClaimSource } from '../../../models/shared.model';
import { DemandesFacade, DemandesFilter } from './demandes.facade';

type RiskScore = 'FAIBLE' | 'MOYEN' | 'ELEVE';
type ArrayFilterKey =
  | 'statuts'
  | 'sources'
  | 'riskScores'
  | 'actCategories'
  | 'planTiers'
  | 'flags';

interface OptionItem<T extends string> {
  value: T;
  label: string;
  tone?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
}

interface ActiveFilterChip {
  id: string;
  label: string;
  remove: () => void;
}

@Component({
  selector: 'app-demandes-filter-bar',
  imports: [
    CommonModule,
    MatBadgeModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDatepickerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    ReactiveFormsModule,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <mat-card class="filter-card" appearance="outlined">
      <div class="quick-row">
        <span class="filter-label">Statut :</span>
        <mat-chip-listbox multiple aria-label="Filtre statut">
          @for (option of statusOptions; track option.value) {
            <mat-chip-option
              class="filter-chip"
              [class]="option.tone"
              [selected]="filters().statuts.includes(option.value)"
              (selectionChange)="toggleArrayValue('statuts', option.value, $event.selected)"
            >
              <span class="chip-dot"></span>
              {{ option.label }}
            </mat-chip-option>
          }
        </mat-chip-listbox>
      </div>

      <div class="quick-row source-risk-row">
        <span class="filter-label">Canal :</span>
        <mat-chip-listbox multiple aria-label="Filtre canal">
          @for (option of sourceOptions; track option.value) {
            <mat-chip-option
              class="filter-chip neutral"
              [selected]="filters().sources.includes(option.value)"
              (selectionChange)="toggleArrayValue('sources', option.value, $event.selected)"
            >
              {{ option.label }}
            </mat-chip-option>
          }
        </mat-chip-listbox>

        <span class="filter-label risk-label">Risque :</span>
        <mat-chip-listbox multiple aria-label="Filtre risque">
          @for (option of riskOptions; track option.value) {
            <mat-chip-option
              class="filter-chip"
              [class]="option.tone"
              [selected]="filters().riskScores.includes(option.value)"
              (selectionChange)="toggleArrayValue('riskScores', option.value, $event.selected)"
            >
              {{ option.label }}
            </mat-chip-option>
          }
        </mat-chip-listbox>
      </div>

      @if (activeFilterCount() > 0) {
        <mat-chip-set class="active-strip" aria-label="Filtres actifs">
          @for (chip of activeFilterChips(); track chip.id) {
            <mat-chip class="active-filter-chip">
              {{ chip.label }}
              <button matChipRemove type="button" [attr.aria-label]="'Retirer ' + chip.label" (click)="chip.remove()">
                <mat-icon>close</mat-icon>
              </button>
            </mat-chip>
          }
          <button mat-button color="warn" type="button" (click)="resetFilters()">
            Réinitialiser tout
          </button>
        </mat-chip-set>
      }

      <mat-expansion-panel class="advanced-panel">
        <mat-expansion-panel-header collapsedHeight="48px" expandedHeight="48px">
          <mat-panel-title>
            <span
              [matBadge]="secondaryFilterCount()"
              [matBadgeHidden]="secondaryFilterCount() === 0"
              matBadgeColor="primary"
              matBadgeOverlap="false"
            >
              Filtres avancés
            </span>
          </mat-panel-title>
        </mat-expansion-panel-header>

        <div class="advanced-grid" [formGroup]="advancedForm">
          <mat-form-field appearance="outline">
            <mat-label>Catégorie d'acte</mat-label>
            <mat-select
              multiple
              formControlName="actCategories"
              (selectionChange)="setArrayFilter('actCategories', $event.value)"
            >
              @for (option of actCategoryOptions; track option.value) {
                <mat-option [value]="option.value">{{ option.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Plan tarifaire</mat-label>
            <mat-select
              multiple
              formControlName="planTiers"
              (selectionChange)="setArrayFilter('planTiers', $event.value)"
            >
              @for (plan of planTierOptions(); track plan) {
                <mat-option [value]="plan">{{ plan }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Employeur</mat-label>
            <input
              matInput
              formControlName="employer"
              type="text"
              (input)="setEmployerFilter($event)"
            />
          </mat-form-field>

          <mat-checkbox
            class="network-checkbox"
            formControlName="inNetworkOnly"
            (change)="facade.updateFilter({ inNetworkOnly: $event.checked })"
          >
            Réseau agréé uniquement
          </mat-checkbox>

          <mat-form-field appearance="outline">
            <mat-label>Drapeaux</mat-label>
            <mat-select
              multiple
              formControlName="flags"
              (selectionChange)="setArrayFilter('flags', $event.value)"
            >
              @for (option of flagOptions; track option.value) {
                <mat-option [value]="option.value">{{ option.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <div class="range-row">
            <mat-form-field appearance="outline">
              <mat-label>Du</mat-label>
              <input
                matInput
                [matDatepicker]="fromPicker"
                formControlName="dateFrom"
                (dateChange)="setDateFilter('dateFrom', $event.value)"
              />
              <mat-datepicker-toggle matIconSuffix [for]="fromPicker" />
              <mat-datepicker #fromPicker />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Au</mat-label>
              <input
                matInput
                [matDatepicker]="toPicker"
                formControlName="dateTo"
                (dateChange)="setDateFilter('dateTo', $event.value)"
              />
              <mat-datepicker-toggle matIconSuffix [for]="toPicker" />
              <mat-datepicker #toPicker />
            </mat-form-field>
          </div>

          <div class="range-row amount-row">
            <mat-form-field appearance="outline">
              <mat-label>Min (TND)</mat-label>
              <input
                matInput
                formControlName="amountMin"
                type="number"
                min="0"
                (input)="setAmountFilter('amountMin', $event)"
              />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Max (TND)</mat-label>
              <input
                matInput
                formControlName="amountMax"
                type="number"
                min="0"
                (input)="setAmountFilter('amountMax', $event)"
              />
            </mat-form-field>
          </div>
        </div>
      </mat-expansion-panel>
    </mat-card>
  `,
  styles: `
    .filter-card {
      background: #ffffff;
      border-color: rgba(15, 111, 115, 0.12);
      border-radius: 16px;
      box-shadow: 0 8px 20px rgba(15, 111, 115, 0.06);
      display: grid;
      gap: 14px;
      padding: 16px;
    }

    .quick-row {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .filter-label {
      color: var(--omnicare-muted);
      font-size: 0.86rem;
      font-weight: 700;
    }

    .risk-label {
      margin-left: 10px;
    }

    .filter-chip {
      --mdc-chip-elevated-container-color: #f8fafc;
      --mdc-chip-label-text-color: var(--omnicare-text);
      border: 1px solid #e5e7eb;
    }

    .filter-chip.success {
      --mdc-chip-elevated-container-color: #ecfdf5;
      --mdc-chip-label-text-color: #047857;
      border-color: #bbf7d0;
    }

    .filter-chip.warning {
      --mdc-chip-elevated-container-color: #fffbeb;
      --mdc-chip-label-text-color: #b45309;
      border-color: #fde68a;
    }

    .filter-chip.error {
      --mdc-chip-elevated-container-color: #fef2f2;
      --mdc-chip-label-text-color: #b91c1c;
      border-color: #fecaca;
    }

    .filter-chip.info {
      --mdc-chip-elevated-container-color: #eff6ff;
      --mdc-chip-label-text-color: #1d4ed8;
      border-color: #bfdbfe;
    }

    .chip-dot {
      background: currentColor;
      border-radius: 999px;
      display: inline-block;
      height: 7px;
      margin-right: 6px;
      width: 7px;
    }

    .active-strip {
      align-items: center;
      border-top: 1px solid #eef2f4;
      display: flex;
      gap: 8px;
      padding-top: 12px;
    }

    .active-filter-chip {
      --mdc-chip-elevated-container-color: rgba(31, 191, 154, 0.1);
      --mdc-chip-label-text-color: var(--omnicare-secondary);
      border: 1px solid var(--omnicare-tertiary);
    }

    .advanced-panel {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: none;
    }

    .advanced-grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      padding-top: 14px;
    }

    .network-checkbox {
      align-self: center;
      min-height: 56px;
      padding-top: 10px;
    }

    .range-row {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (max-width: 760px) {
      .advanced-grid,
      .range-row {
        grid-template-columns: 1fr;
      }

      .risk-label {
        margin-left: 0;
      }
    }
  `,
})
export class DemandesFilterBarComponent {
  protected readonly facade = inject(DemandesFacade);
  protected readonly filters = this.facade.filters;
  protected readonly activeFilterCount = this.facade.activeFilterCount;

  protected readonly statusOptions: Array<OptionItem<DemandeStatus>> = [
    { value: 'SOUMISE', label: 'Soumise', tone: 'info' },
    { value: 'DOCUMENTS_INCOMPLETS', label: 'Docs incomplets', tone: 'warning' },
    { value: 'EN_EXAMEN', label: 'En examen', tone: 'warning' },
    { value: 'APPROUVEE', label: 'Approuvée', tone: 'success' },
    { value: 'APPROUVEE_PARTIELLEMENT', label: 'Partielle', tone: 'info' },
    { value: 'APPROUVEE_AUTO', label: 'Auto-approuvée', tone: 'success' },
    { value: 'REFUSEE', label: 'Refusée', tone: 'error' },
  ];
  protected readonly sourceOptions: Array<OptionItem<ClaimSource>> = [
    { value: 'OMNICARE', label: 'OmniCare' },
    { value: 'MANUEL', label: 'Manuel' },
    { value: 'IMPORT_CSV', label: 'Import CSV' },
    { value: 'WEBSITE', label: 'Site web' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'AUTRE', label: 'Autre' },
  ];
  protected readonly riskOptions: Array<OptionItem<RiskScore>> = [
    { value: 'FAIBLE', label: 'Faible', tone: 'success' },
    { value: 'MOYEN', label: 'Moyen', tone: 'warning' },
    { value: 'ELEVE', label: 'Élevé', tone: 'error' },
  ];
  protected readonly actCategoryOptions: Array<OptionItem<ActCategory>> = [
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
  protected readonly flagOptions: Array<OptionItem<ClaimFlag>> = [
    { value: 'DOCUMENTS_MANQUANTS', label: 'Documents manquants' },
    { value: 'DOUBLON_SUSPECT', label: 'Doublon suspect' },
    { value: 'MONTANT_ELEVE', label: 'Montant élevé' },
    { value: 'AUTORISATION_MANQUANTE', label: 'Autorisation manquante' },
    { value: 'DELAI_SOUMISSION', label: 'Délai dépassé' },
    { value: 'SEUIL_REASSURANCE', label: 'Seuil réassurance' },
    { value: 'PRESTATAIRE_HORS_RESEAU', label: 'Hors réseau' },
  ];

  protected readonly advancedForm = new FormGroup({
    actCategories: new FormControl<ActCategory[]>([], { nonNullable: true }),
    planTiers: new FormControl<string[]>([], { nonNullable: true }),
    employer: new FormControl('', { nonNullable: true }),
    inNetworkOnly: new FormControl(false, { nonNullable: true }),
    flags: new FormControl<ClaimFlag[]>([], { nonNullable: true }),
    dateFrom: new FormControl<Date | null>(null),
    dateTo: new FormControl<Date | null>(null),
    amountMin: new FormControl<number | null>(null),
    amountMax: new FormControl<number | null>(null),
  });

  protected readonly planTierOptions = computed(() =>
    [...new Set(this.facade.allDemandes().map((demande) => demande.planTierName))].sort(),
  );

  protected readonly secondaryFilterCount = computed(() => {
    const filters = this.filters();

    return [
      filters.actCategories.length,
      filters.planTiers.length,
      filters.employer ? 1 : 0,
      filters.inNetworkOnly ? 1 : 0,
      filters.flags.length,
      filters.dateFrom ? 1 : 0,
      filters.dateTo ? 1 : 0,
      filters.amountMin !== null ? 1 : 0,
      filters.amountMax !== null ? 1 : 0,
    ].reduce((total, count) => total + count, 0);
  });

  protected readonly activeFilterChips = computed<ActiveFilterChip[]>(() => {
    const filters = this.filters();
    const chips: ActiveFilterChip[] = [];

    this.addArrayChips(chips, filters.statuts, this.statusOptions, 'statuts');
    this.addArrayChips(chips, filters.sources, this.sourceOptions, 'sources');
    this.addArrayChips(chips, filters.riskScores, this.riskOptions, 'riskScores');
    this.addArrayChips(chips, filters.actCategories, this.actCategoryOptions, 'actCategories');
    this.addArrayChips(
      chips,
      filters.planTiers.map((plan) => plan),
      filters.planTiers.map((plan) => ({ value: plan, label: plan })),
      'planTiers',
    );
    this.addArrayChips(chips, filters.flags, this.flagOptions, 'flags');

    if (filters.employer) {
      chips.push({
        id: 'employer',
        label: `Employeur : ${filters.employer}`,
        remove: () => this.facade.updateFilter({ employer: null }),
      });
    }

    if (filters.inNetworkOnly) {
      chips.push({
        id: 'network',
        label: 'Réseau agréé uniquement',
        remove: () => this.facade.updateFilter({ inNetworkOnly: false }),
      });
    }

    if (filters.dateFrom) {
      chips.push({
        id: 'dateFrom',
        label: `Du ${filters.dateFrom}`,
        remove: () => this.facade.updateFilter({ dateFrom: null }),
      });
    }

    if (filters.dateTo) {
      chips.push({
        id: 'dateTo',
        label: `Au ${filters.dateTo}`,
        remove: () => this.facade.updateFilter({ dateTo: null }),
      });
    }

    if (filters.amountMin !== null) {
      chips.push({
        id: 'amountMin',
        label: `Min : ${filters.amountMin} TND`,
        remove: () => this.facade.updateFilter({ amountMin: null }),
      });
    }

    if (filters.amountMax !== null) {
      chips.push({
        id: 'amountMax',
        label: `Max : ${filters.amountMax} TND`,
        remove: () => this.facade.updateFilter({ amountMax: null }),
      });
    }

    return chips;
  });

  private readonly syncFormEffect = effect(() => {
    const filters = this.filters();

    this.advancedForm.setValue(
      {
        actCategories: filters.actCategories as ActCategory[],
        planTiers: filters.planTiers,
        employer: filters.employer ?? '',
        inNetworkOnly: filters.inNetworkOnly,
        flags: filters.flags,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : null,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : null,
        amountMin: filters.amountMin,
        amountMax: filters.amountMax,
      },
      { emitEvent: false },
    );
  });

  protected toggleArrayValue<T extends string>(
    key: ArrayFilterKey,
    value: T,
    selected: boolean,
  ): void {
    const current = this.filters()[key] as T[];
    const next = selected ? [...current, value] : current.filter((item) => item !== value);

    this.facade.updateFilter({ [key]: next } as Partial<DemandesFilter>);
  }

  protected setArrayFilter(key: ArrayFilterKey, value: string[]): void {
    this.facade.updateFilter({ [key]: value } as Partial<DemandesFilter>);
  }

  protected setEmployerFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.facade.updateFilter({ employer: value || null });
  }

  protected setDateFilter(key: 'dateFrom' | 'dateTo', value: Date | null): void {
    this.facade.updateFilter({ [key]: value ? this.toIsoDate(value) : null });
  }

  protected setAmountFilter(key: 'amountMin' | 'amountMax', event: Event): void {
    const rawValue = (event.target as HTMLInputElement).value;
    this.facade.updateFilter({ [key]: rawValue === '' ? null : Number(rawValue) });
  }

  protected resetFilters(): void {
    this.facade.resetFilters();
  }

  private addArrayChips<T extends string>(
    chips: ActiveFilterChip[],
    values: T[],
    options: Array<OptionItem<T>>,
    key: ArrayFilterKey,
  ): void {
    values.forEach((value) => {
      const option = options.find((item) => item.value === value);

      chips.push({
        id: `${key}-${value}`,
        label: option?.label ?? value,
        remove: () => this.toggleArrayValue(key, value, false),
      });
    });
  }

  private toIsoDate(value: Date): string {
    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
