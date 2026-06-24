import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
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
type NetworkMode = 'IN_NETWORK' | 'OUT_OF_NETWORK' | null;
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
    MatChipsModule,
    MatDatepickerModule,
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
          @if (secondaryFilterCount() > 0) {
            <span class="filter-count">{{ secondaryFilterCount() }}</span>
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
                [class]="option.tone"
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

        <div class="chip-group risk-group">
          <span class="filter-label">Risque</span>
          <mat-chip-listbox multiple aria-label="Filtre risque">
            @for (option of riskOptions; track option.value) {
              <mat-chip-option
                class="filter-chip"
                [class]="option.tone"
                [class.is-selected]="filters().riskScores.includes(option.value)"
                [selected]="filters().riskScores.includes(option.value)"
                (selectionChange)="toggleArrayValue('riskScores', option.value, $event.selected)"
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
              <button
                matChipRemove
                type="button"
                [attr.aria-label]="'Retirer ' + chip.label"
                (click)="chip.remove()"
              >
                <mat-icon>close</mat-icon>
              </button>
            </mat-chip>
          }
        </mat-chip-set>
      }

      @if (advancedOpen()) {
        <section class="advanced-panel" aria-label="Filtres avancés">
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

          <mat-form-field appearance="outline">
            <mat-label>Prestataire</mat-label>
            <input
              matInput
              formControlName="provider"
              type="text"
              (input)="setProviderFilter($event)"
            />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Réseau</mat-label>
            <mat-select
              formControlName="networkMode"
              (selectionChange)="setNetworkMode($event.value)"
            >
              <mat-option [value]="null">Tous réseaux</mat-option>
              <mat-option value="IN_NETWORK">Réseau agréé</mat-option>
              <mat-option value="OUT_OF_NETWORK">Hors réseau</mat-option>
            </mat-select>
          </mat-form-field>

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
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.9fr) minmax(220px, 0.55fr);
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

    .filter-chip.success {
      --chip-bg: #047857;
      --chip-bg-selected: #065f46;
    }

    .filter-chip.warning {
      --chip-bg: #b45309;
      --chip-bg-selected: #92400e;
    }

    .filter-chip.error {
      --chip-bg: #b91c1c;
      --chip-bg-selected: #991b1b;
    }

    .filter-chip.info {
      --chip-bg: #1d4ed8;
      --chip-bg-selected: #1e40af;
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
      color: #ffffff !important;
      overflow: hidden;
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
      align-items: center;
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
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .range-row {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @media (max-width: 760px) {
      .filter-toolbar {
        grid-template-columns: 1fr;
      }

      .chip-toolbar,
      .advanced-grid,
      .range-row {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class DemandesFilterBarComponent {
  protected readonly facade = inject(DemandesFacade);
  protected readonly filters = this.facade.filters;
  protected readonly activeFilterCount = this.facade.activeFilterCount;
  protected readonly advancedOpen = signal(false);

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
    provider: new FormControl('', { nonNullable: true }),
    networkMode: new FormControl<NetworkMode>(null),
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
      filters.provider ? 1 : 0,
      filters.inNetworkOnly ? 1 : 0,
      filters.networkMode ? 1 : 0,
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

    if (filters.search) {
      chips.push({
        id: 'search',
        label: `Recherche : ${filters.search}`,
        remove: () => this.facade.updateFilter({ search: null }),
      });
    }

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

    if (filters.provider) {
      chips.push({
        id: 'provider',
        label: `Prestataire : ${filters.provider}`,
        remove: () => this.facade.updateFilter({ provider: null }),
      });
    }

    if (filters.inNetworkOnly) {
      chips.push({
        id: 'network',
        label: 'Réseau agréé uniquement',
        remove: () => this.facade.updateFilter({ inNetworkOnly: false }),
      });
    }

    if (filters.networkMode) {
      chips.push({
        id: 'networkMode',
        label: filters.networkMode === 'IN_NETWORK' ? 'Réseau agréé' : 'Hors réseau',
        remove: () => this.facade.updateFilter({ networkMode: null }),
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
        provider: filters.provider ?? '',
        networkMode: filters.networkMode,
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

  protected toggleAdvanced(): void {
    this.advancedOpen.update((current) => !current);
  }

  protected setSearchFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.facade.updateFilter({ search: value || null });
  }

  protected setEmployerFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.facade.updateFilter({ employer: value || null });
  }

  protected setProviderFilter(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.facade.updateFilter({ provider: value || null });
  }

  protected setNetworkMode(value: NetworkMode): void {
    this.facade.updateFilter({ networkMode: value, inNetworkOnly: false });
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
