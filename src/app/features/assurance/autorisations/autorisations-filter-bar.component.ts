import { Component, computed, inject } from '@angular/core';
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
import { provideNativeDateAdapter } from '@angular/material/core';

import { AutorisationStatus } from '../../../models/autorisation-prealable.model';
import { ActCategory, ClaimSource } from '../../../models/shared.model';
import { AutorisationsFacade, AutorisationsFilter } from './autorisations.facade';

type ArrayFilterKey = 'statuts' | 'sources' | 'actCategories';

interface Option<T extends string> {
  value: T;
  label: string;
  tone?: 'success' | 'warning' | 'error' | 'info';
}

@Component({
  selector: 'app-autorisations-filter-bar',
  imports: [
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
              {{ option.label }}
            </mat-chip-option>
          }
        </mat-chip-listbox>
      </div>

      <div class="quick-row">
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
      </div>

      @if (activeFilterCount() > 0) {
        <mat-chip-set class="active-strip" aria-label="Filtres actifs">
          @for (chip of activeFilterChips(); track chip.id) {
            <mat-chip class="active-filter-chip">
              {{ chip.label }}
              <button matChipRemove type="button" (click)="chip.remove()" [attr.aria-label]="'Retirer ' + chip.label">
                <mat-icon>close</mat-icon>
              </button>
            </mat-chip>
          }
          <button mat-button color="warn" type="button" (click)="facade.resetFilters()">
            Réinitialiser tout
          </button>
        </mat-chip-set>
      }

      <mat-expansion-panel class="advanced-panel">
        <mat-expansion-panel-header collapsedHeight="48px" expandedHeight="48px">
          <mat-panel-title>
            <span
              [matBadge]="advancedFilterCount()"
              [matBadgeHidden]="advancedFilterCount() === 0"
              matBadgeOverlap="false"
            >
              Filtres avancés
            </span>
          </mat-panel-title>
        </mat-expansion-panel-header>

        <div class="advanced-grid">
          <div>
            <span class="filter-label">Catégorie d'acte :</span>
            <mat-chip-listbox multiple aria-label="Filtre catégorie">
              @for (option of actCategoryOptions; track option.value) {
                <mat-chip-option
                  class="filter-chip neutral"
                  [selected]="filters().actCategories.includes(option.value)"
                  (selectionChange)="toggleArrayValue('actCategories', option.value, $event.selected)"
                >
                  {{ option.label }}
                </mat-chip-option>
              }
            </mat-chip-listbox>
          </div>

          <mat-checkbox
            [checked]="filters().providerInNetwork"
            (change)="facade.updateFilter({ providerInNetwork: $event.checked })"
          >
            Réseau agréé uniquement
          </mat-checkbox>

          <div class="range-row">
            <mat-form-field appearance="outline">
              <mat-label>Du</mat-label>
              <input matInput [matDatepicker]="fromPicker" (dateChange)="setDateFilter('dateFrom', $event.value)" />
              <mat-datepicker-toggle matIconSuffix [for]="fromPicker" />
              <mat-datepicker #fromPicker />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Au</mat-label>
              <input matInput [matDatepicker]="toPicker" (dateChange)="setDateFilter('dateTo', $event.value)" />
              <mat-datepicker-toggle matIconSuffix [for]="toPicker" />
              <mat-datepicker #toPicker />
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

    .filter-chip {
      --mdc-chip-elevated-container-color: #f8fafc;
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

    .active-strip {
      border-top: 1px solid #eef2f4;
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
      gap: 16px;
      padding-top: 14px;
    }

    .range-row {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (max-width: 720px) {
      .range-row {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class AutorisationsFilterBarComponent {
  protected readonly facade = inject(AutorisationsFacade);
  protected readonly filters = this.facade.filters;
  protected readonly activeFilterCount = this.facade.activeFilterCount;

  protected readonly statusOptions: Array<Option<AutorisationStatus>> = [
    { value: 'EN_ATTENTE', label: 'En attente', tone: 'warning' },
    { value: 'EN_EXAMEN', label: 'En examen', tone: 'info' },
    { value: 'APPROUVEE', label: 'Approuvée', tone: 'success' },
    { value: 'APPROUVEE_AUTO', label: 'Auto-approuvée', tone: 'success' },
    { value: 'REFUSEE', label: 'Refusée', tone: 'error' },
  ];
  protected readonly sourceOptions: Array<Option<ClaimSource>> = [
    { value: 'OMNICARE', label: 'OmniCare' },
    { value: 'MANUEL', label: 'Manuel' },
    { value: 'IMPORT_CSV', label: 'Import CSV' },
    { value: 'WEBSITE', label: 'Site web' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'AUTRE', label: 'Autre' },
  ];
  protected readonly actCategoryOptions: Array<Option<ActCategory>> = [
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

  protected readonly advancedFilterCount = computed(() => {
    const filters = this.filters();

    return [
      filters.actCategories.length,
      filters.dateFrom ? 1 : 0,
      filters.dateTo ? 1 : 0,
      filters.providerInNetwork ? 1 : 0,
    ].reduce((total, count) => total + count, 0);
  });

  protected readonly activeFilterChips = computed(() => {
    const filters = this.filters();
    const chips: Array<{ id: string; label: string; remove: () => void }> = [];

    this.addChips(chips, 'statuts', filters.statuts, this.statusOptions);
    this.addChips(chips, 'sources', filters.sources, this.sourceOptions);
    this.addChips(chips, 'actCategories', filters.actCategories, this.actCategoryOptions);

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

    if (filters.providerInNetwork) {
      chips.push({
        id: 'network',
        label: 'Réseau agréé uniquement',
        remove: () => this.facade.updateFilter({ providerInNetwork: false }),
      });
    }

    return chips;
  });

  protected toggleArrayValue<T extends string>(key: ArrayFilterKey, value: T, selected: boolean): void {
    const current = this.filters()[key] as T[];
    const next = selected ? [...current, value] : current.filter((item) => item !== value);

    this.facade.updateFilter({ [key]: next } as Partial<AutorisationsFilter>);
  }

  protected setDateFilter(key: 'dateFrom' | 'dateTo', value: Date | null): void {
    this.facade.updateFilter({ [key]: value ? this.toIsoDate(value) : null });
  }

  private addChips<T extends string>(
    chips: Array<{ id: string; label: string; remove: () => void }>,
    key: ArrayFilterKey,
    values: T[],
    options: Array<Option<T>>,
  ): void {
    values.forEach((value) => {
      chips.push({
        id: `${key}-${value}`,
        label: options.find((option) => option.value === value)?.label ?? value,
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
