import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ProviderNetworkEntry } from '../../../models/provider-network.model';
import { StatusChipComponent } from '../../../shared/status-chip/status-chip.component';
import { ProviderDetailDialogComponent } from './provider-detail-dialog.component';

interface NetworkFilter {
  statuses: Array<ProviderNetworkEntry['networkStatus']>;
  providerType: ProviderNetworkEntry['providerType'] | null;
  location: string | null;
  tiersPayantOnly: boolean;
}

@Component({
  selector: 'app-assurance-reseau',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    StatusChipComponent,
  ],
  templateUrl: './assurance-reseau.component.html',
  styleUrl: './assurance-reseau.component.scss',
})
export class AssuranceReseauComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);

  protected readonly companyId = signal(this.routeCompanyId());
  protected readonly providers = signal<ProviderNetworkEntry[]>([]);
  protected readonly filters = signal<NetworkFilter>({
    location: null,
    providerType: null,
    statuses: [],
    tiersPayantOnly: false,
  });

  protected readonly statuses: Array<ProviderNetworkEntry['networkStatus']> = [
    'AGREE',
    'EN_COURS_AGREMENT',
    'HORS_RESEAU',
  ];
  protected readonly providerTypes: Array<ProviderNetworkEntry['providerType']> = [
    'CLINIQUE',
    'MEDECIN',
    'KINE',
    'INFIRMIER',
    'CABINET_DENTAIRE',
    'LABORATOIRE',
    'AUTRE',
  ];

  protected readonly filteredProviders = computed(() =>
    this.providers().filter((provider) => this.matchesFilters(provider)),
  );
  protected readonly activeFilterCount = computed(() => {
    const filters = this.filters();

    return [
      filters.statuses.length,
      filters.providerType ? 1 : 0,
      filters.location ? 1 : 0,
      filters.tiersPayantOnly ? 1 : 0,
    ].reduce((total, count) => total + count, 0);
  });
  protected readonly agreedCount = computed(
    () => this.providers().filter((provider) => provider.networkStatus === 'AGREE').length,
  );
  protected readonly tiersPayantCount = computed(
    () => this.providers().filter((provider) => provider.tiersPayantEnabled).length,
  );
  protected readonly outsideNetworkCount = computed(
    () => this.providers().filter((provider) => provider.networkStatus === 'HORS_RESEAU').length,
  );
  protected readonly claimsThisYear = computed(() =>
    this.providers().reduce((total, provider) => total + provider.claimsThisYear, 0),
  );
  protected readonly totalReimbursedYear = computed(() =>
    this.providers().reduce((total, provider) => total + provider.totalReimbursedThisYear, 0),
  );

  ngOnInit(): void {
    this.providers.set(
      this.readJson<ProviderNetworkEntry[]>(`omnicare_ins_${this.companyId()}_network`, []),
    );
  }

  protected toggleStatus(status: ProviderNetworkEntry['networkStatus']): void {
    const current = this.filters().statuses;
    this.filters.update((filters) => ({
      ...filters,
      statuses: current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    }));
  }

  protected setProviderType(providerType: ProviderNetworkEntry['providerType'] | null): void {
    this.filters.update((filters) => ({ ...filters, providerType }));
  }

  protected setLocation(location: string): void {
    this.filters.update((filters) => ({ ...filters, location: location.trim() || null }));
  }

  protected setTiersPayantOnly(tiersPayantOnly: boolean): void {
    this.filters.update((filters) => ({ ...filters, tiersPayantOnly }));
  }

  protected resetFilters(): void {
    this.filters.set({
      location: null,
      providerType: null,
      statuses: [],
      tiersPayantOnly: false,
    });
  }

  protected openProvider(provider: ProviderNetworkEntry): void {
    this.dialog.open(ProviderDetailDialogComponent, {
      data: provider,
      width: '640px',
    });
  }

  protected statusLabel(status: ProviderNetworkEntry['networkStatus']): string {
    const labels: Record<ProviderNetworkEntry['networkStatus'], string> = {
      AGREE: 'Agréé',
      EN_COURS_AGREMENT: 'En cours',
      HORS_RESEAU: 'Hors réseau',
    };

    return labels[status];
  }

  protected providerTypeLabel(type: ProviderNetworkEntry['providerType']): string {
    const labels: Record<ProviderNetworkEntry['providerType'], string> = {
      AUTRE: 'Autre',
      CABINET_DENTAIRE: 'Cabinet dentaire',
      CLINIQUE: 'Clinique',
      INFIRMIER: 'Infirmier',
      KINE: 'Kinésithérapeute',
      LABORATOIRE: 'Laboratoire',
      MEDECIN: 'Médecin',
    };

    return labels[type];
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('fr-TN', {
      maximumFractionDigits: 0,
      style: 'currency',
      currency: 'TND',
    }).format(value);
  }

  protected formatDate(isoDate: string | undefined): string {
    if (!isoDate) {
      return 'Non applicable';
    }

    return new Intl.DateTimeFormat('fr-TN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(isoDate));
  }

  private matchesFilters(provider: ProviderNetworkEntry): boolean {
    const filters = this.filters();

    if (filters.statuses.length > 0 && !filters.statuses.includes(provider.networkStatus)) {
      return false;
    }

    if (filters.providerType && provider.providerType !== filters.providerType) {
      return false;
    }

    const location = filters.location?.toLowerCase();

    if (
      location &&
      !provider.city.toLowerCase().includes(location) &&
      !provider.region.toLowerCase().includes(location)
    ) {
      return false;
    }

    if (filters.tiersPayantOnly && !provider.tiersPayantEnabled) {
      return false;
    }

    return true;
  }

  private routeCompanyId(): string {
    let currentRoute: ActivatedRoute | null = this.route;

    while (currentRoute) {
      const companyId = currentRoute.snapshot.paramMap.get('companyId');

      if (companyId) {
        return companyId;
      }

      currentRoute = currentRoute.parent;
    }

    return 'comar';
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
