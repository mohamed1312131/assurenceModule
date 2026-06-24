import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
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
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <mat-card class="filter-card" appearance="outlined">
      <div class="filter-toolbar">
        <mat-form-field class="search-field" appearance="outline">
          <mat-icon matPrefix aria-hidden="true">search</mat-icon>
          <mat-label>Recherche</mat-label>
          <input
            matInput
            type="search"
            [value]="filters().search ?? ''"
            placeholder="Rechercher patient, référence, prestataire…"
            (input)="setSearchFilter($event)"
          />
        </mat-form-field>

        <button
          mat-stroked-button
          type="button"
          [class.active-advanced]="advancedOpen()"
          (click)="toggleAdvanced()"
        >
          <mat-icon aria-hidden="true">tune</mat-icon>
          Filtres avancés
          @if (advancedFilterCount() > 0) {
            <span class="filter-count">{{ advancedFilterCount() }}</span>
          }
        </button>

        @if (activeFilterCount() > 0) {
          <button mat-button color="primary" type="button" (click)="resetFilters()">
            <mat-icon aria-hidden="true">filter_list_off</mat-icon>
            Réinitialiser
          </button>
        }
      </div>

      <div class="chip-toolbar">
        <div class="chip-group">
          <span class="filter-label">Statut</span>
          <mat-chip-listbox multiple aria-label="Filtre statut">
            @for (option of statusOptions; track option.value) {
              <mat-chip-option
                class="filter-chip"
                [class.status-pending]="option.value === 'EN_ATTENTE'"
                [class.status-review]="option.value === 'EN_EXAMEN'"
                [class.status-approved]="option.value === 'APPROUVEE'"
                [class.status-auto]="option.value === 'APPROUVEE_AUTO'"
                [class.status-refused]="option.value === 'REFUSEE'"
                [class.is-selected]="filters().statuts.includes(option.value)"
                [selected]="filters().statuts.includes(option.value)"
                (selectionChange)="toggleArrayValue('statuts', option.value, $event.selected)"
              >
                <span class="chip-dot"></span>
                {{ option.label }}
              </mat-chip-option>
            }
          </mat-chip-listbox>
        </div>

        <div class="chip-group">
          <span class="filter-label">Canal</span>
          <mat-chip-listbox multiple aria-label="Filtre canal">
            @for (option of sourceOptions; track option.value) {
              <mat-chip-option
                class="filter-chip source-chip"
                [class.source-omnicare]="option.value === 'OMNICARE'"
                [class.source-manuel]="option.value === 'MANUEL'"
                [class.source-import]="option.value === 'IMPORT_CSV'"
                [class.source-website]="option.value === 'WEBSITE'"
                [class.source-email]="option.value === 'EMAIL'"
                [class.source-other]="option.value === 'AUTRE'"
                [class.is-selected]="filters().sources.includes(option.value)"
                [selected]="filters().sources.includes(option.value)"
                (selectionChange)="toggleArrayValue('sources', option.value, $event.selected)"
              >
                {{ option.label }}
              </mat-chip-option>
            }
          </mat-chip-listbox>
        </div>
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
        </mat-chip-set>
      }

      @if (advancedOpen()) {
        <section class="advanced-panel" aria-label="Filtres avancés">
          <div class="advanced-grid">
            <div>
              <span class="filter-label">Acte médical</span>
              <mat-chip-listbox multiple aria-label="Filtre catégorie">
                @for (option of actCategoryOptions; track option.value) {
                  <mat-chip-option
                    class="filter-chip neutral"
                    [class.is-selected]="filters().actCategories.includes(option.value)"
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
        </section>
      }
    </mat-card>
  `,
  styles: `
    .filter-card {
      background: #eef8f5;
      border-color: rgba(15, 111, 115, 0.12);
      border-radius: 14px;
      box-shadow: none;
      display: grid;
      gap: 10px;
      padding: 12px;
    }

    .filter-toolbar {
      align-items: center;
      display: grid;
      gap: 10px;
      grid-template-columns: minmax(280px, 420px) auto auto;
      justify-content: start;
    }

    .search-field {
      font-size: 0.86rem;
      width: 100%;
    }

    .filter-toolbar button {
      font-size: 0.8rem;
      min-height: 36px;
      white-space: nowrap;
    }

    .filter-toolbar button[mat-stroked-button] {
      background: rgba(15, 111, 115, 0.1);
      border-color: rgba(15, 111, 115, 0.2);
      color: var(--omnicare-secondary);
      font-weight: 800;
      padding: 0 14px;
    }

    .active-advanced,
    .filter-toolbar button[mat-stroked-button]:hover {
      background: var(--omnicare-secondary);
      border-color: rgba(15, 111, 115, 0.28);
      color: #ffffff;
    }

    .filter-count {
      align-items: center;
      background: rgba(255, 255, 255, 0.24);
      border-radius: 999px;
      color: currentColor;
      display: inline-flex;
      font-size: 0.72rem;
      font-weight: 800;
      height: 20px;
      justify-content: center;
      margin-left: 4px;
      min-width: 20px;
      padding: 0 6px;
    }

    .filter-toolbar mat-icon {
      font-size: 18px;
      height: 18px;
      width: 18px;
    }

    .chip-toolbar {
      align-items: center;
      display: grid;
      gap: 10px;
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    }

    .chip-group {
      align-items: center;
      display: flex;
      gap: 8px;
      min-width: 0;
      overflow: hidden;
    }

    .filter-label {
      color: var(--omnicare-secondary);
      flex: 0 0 auto;
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    mat-chip-listbox {
      min-width: 0;
    }

    .filter-chip {
      --chip-bg: #475569;
      --chip-bg-selected: #334155;
      --chip-text: #ffffff;
      --mdc-chip-elevated-container-color: var(--chip-bg);
      --mdc-chip-flat-selected-container-color: var(--chip-bg-selected);
      --mdc-chip-selected-container-color: var(--chip-bg-selected);
      --mdc-chip-unselected-container-color: var(--chip-bg);
      --mdc-chip-label-text-color: var(--chip-text);
      --mdc-chip-selected-label-text-color: var(--chip-text);
      --mdc-chip-disabled-label-text-color: rgba(255, 255, 255, 0.72);
      --mdc-chip-outline-color: transparent;
      --mdc-chip-selected-outline-color: transparent;
      --mdc-chip-with-icon-icon-color: var(--chip-text);
      --mdc-chip-selected-icon-color: var(--chip-text);
      background: var(--chip-bg);
      border: 0;
      border-radius: 999px;
      color: var(--chip-text);
      font-size: 0.74rem;
      font-weight: 800;
      min-height: 24px;
      overflow: hidden;
      opacity: 0.78;
      transition:
        box-shadow 160ms ease,
        opacity 160ms ease,
        transform 160ms ease;
    }

    .filter-chip.neutral {
      --chip-bg: #475569;
      --chip-bg-selected: #334155;
    }

    .filter-chip.status-approved {
      --chip-bg: #047857;
      --chip-bg-selected: #065f46;
    }

    .filter-chip.status-pending {
      --chip-bg: #b45309;
      --chip-bg-selected: #92400e;
    }

    .filter-chip.status-refused {
      --chip-bg: #b91c1c;
      --chip-bg-selected: #991b1b;
    }

    .filter-chip.status-review {
      --chip-bg: #1d4ed8;
      --chip-bg-selected: #1e40af;
    }

    .filter-chip.status-auto {
      --chip-bg: #059669;
      --chip-bg-selected: #047857;
    }

    .filter-chip.source-omnicare {
      --chip-bg: #0f766e;
      --chip-bg-selected: #115e59;
    }

    .filter-chip.source-manuel {
      --chip-bg: #334155;
      --chip-bg-selected: #1e293b;
    }

    .filter-chip.source-import {
      --chip-bg: #4338ca;
      --chip-bg-selected: #3730a3;
    }

    .filter-chip.source-website {
      --chip-bg: #0891b2;
      --chip-bg-selected: #0e7490;
    }

    .filter-chip.source-email {
      --chip-bg: #7c3aed;
      --chip-bg-selected: #6d28d9;
    }

    .filter-chip.source-other {
      --chip-bg: #475569;
      --chip-bg-selected: #334155;
    }

    .filter-chip.is-selected,
    .filter-chip[aria-selected='true'],
    .filter-chip.mat-mdc-chip-selected {
      background: var(--chip-bg-selected);
      box-shadow:
        inset 0 0 0 1px rgba(255, 255, 255, 0.32),
        0 0 0 2px #ffffff,
        0 0 0 4px rgba(15, 111, 115, 0.24),
        0 6px 14px rgba(15, 111, 115, 0.16);
      color: #ffffff;
      opacity: 1;
      transform: translateY(-1px);
    }

    :host ::ng-deep .filter-chip .mdc-evolution-chip__text-label,
    :host ::ng-deep .filter-chip .mat-mdc-chip-action-label,
    :host ::ng-deep .filter-chip mat-icon,
    :host ::ng-deep .filter-chip .mdc-evolution-chip__graphic {
      color: #ffffff !important;
    }

    :host ::ng-deep .filter-chip .mdc-evolution-chip__action--primary {
      background: var(--chip-bg);
      border-radius: 999px;
      border-width: 0;
      color: #ffffff !important;
      overflow: hidden;
    }

    :host ::ng-deep .filter-chip .mdc-evolution-chip__background {
      background: var(--chip-bg) !important;
      border-color: transparent !important;
    }

    :host ::ng-deep .filter-chip.is-selected .mdc-evolution-chip__action--primary,
    :host ::ng-deep .filter-chip[aria-selected='true'] .mdc-evolution-chip__action--primary,
    :host ::ng-deep .filter-chip.mat-mdc-chip-selected .mdc-evolution-chip__action--primary {
      background: var(--chip-bg-selected);
    }

    :host ::ng-deep .filter-chip.is-selected .mdc-evolution-chip__graphic,
    :host ::ng-deep .filter-chip[aria-selected='true'] .mdc-evolution-chip__graphic,
    :host ::ng-deep .filter-chip.mat-mdc-chip-selected .mdc-evolution-chip__graphic {
      align-items: center;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 999px;
      display: inline-flex;
      height: 16px;
      justify-content: center;
      margin-left: 2px;
      width: 16px;
    }

    :host ::ng-deep .filter-chip.is-selected .mdc-evolution-chip__checkmark,
    :host ::ng-deep .filter-chip[aria-selected='true'] .mdc-evolution-chip__checkmark,
    :host ::ng-deep .filter-chip.mat-mdc-chip-selected .mdc-evolution-chip__checkmark {
      color: #ffffff !important;
    }

    :host ::ng-deep .filter-chip.is-selected .mdc-evolution-chip__checkmark-svg,
    :host ::ng-deep .filter-chip[aria-selected='true'] .mdc-evolution-chip__checkmark-svg,
    :host ::ng-deep .filter-chip.mat-mdc-chip-selected .mdc-evolution-chip__checkmark-svg {
      stroke: #ffffff !important;
    }

    :host ::ng-deep .filter-chip .mdc-evolution-chip__cell,
    :host ::ng-deep .filter-chip .mat-mdc-chip-action {
      border-radius: 999px;
      overflow: hidden;
    }

    .chip-dot {
      background: currentColor;
      border-radius: 999px;
      display: inline-block;
      height: 7px;
      margin-right: 5px;
      width: 7px;
    }

    .active-strip {
      border-top: 1px solid #eef2f4;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding-top: 8px;
    }

    .active-filter-chip {
      --mdc-chip-elevated-container-color: var(--omnicare-secondary);
      --mdc-chip-label-text-color: #ffffff;
      border: 0;
      font-size: 0.74rem;
      font-weight: 800;
      min-height: 24px;
    }

    .advanced-panel {
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(15, 111, 115, 0.12);
      border-radius: 12px;
      box-shadow: none;
      padding: 12px;
    }

    .advanced-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: minmax(0, 1.4fr) minmax(190px, 0.46fr) minmax(280px, 0.76fr);
    }

    .advanced-grid > div:first-child {
      min-width: 0;
    }

    .advanced-grid mat-checkbox {
      align-self: start;
      padding-top: 6px;
    }

    .range-row {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (max-width: 720px) {
      .filter-toolbar,
      .chip-toolbar,
      .advanced-grid,
      .range-row {
        grid-template-columns: 1fr;
      }

      .chip-group {
        align-items: start;
        flex-direction: column;
      }
    }
  `,
})
export class AutorisationsFilterBarComponent {
  protected readonly facade = inject(AutorisationsFacade);
  protected readonly filters = this.facade.filters;
  protected readonly activeFilterCount = this.facade.activeFilterCount;
  protected readonly advancedOpen = signal(false);

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

    if (filters.search) {
      chips.push({
        id: 'search',
        label: `Recherche : ${filters.search}`,
        remove: () => this.facade.updateFilter({ search: null }),
      });
    }

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

  protected toggleAdvanced(): void {
    this.advancedOpen.update((current) => !current);
  }

  protected setSearchFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.facade.updateFilter({ search: value || null });
  }

  protected resetFilters(): void {
    this.facade.resetFilters();
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
