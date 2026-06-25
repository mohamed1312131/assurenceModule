import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { ClaimCardComponent } from '../../../shared/claim-card/claim-card.component';
import { DemandesFacade } from './demandes.facade';
import { DemandesFilterBarComponent } from './demandes-filter-bar.component';
import { ImportCsvDialogComponent } from './import-csv-dialog.component';
import { NouvelleDemandeDialogComponent } from './nouvelle-demande-dialog.component';

@Component({
  selector: 'app-demandes',
  imports: [
    ClaimCardComponent,
    DemandesFilterBarComponent,
    MatBadgeModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './demandes.component.html',
  styleUrl: './demandes.component.scss',
})
export class DemandesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  protected readonly facade = inject(DemandesFacade);
  protected readonly companyId = signal(this.routeCompanyId());
  protected readonly filtered = this.facade.filtered;
  protected readonly activeFilterCount = this.facade.activeFilterCount;
  protected readonly stats = computed(() => {
    const demandes = this.facade.allDemandes();
    const waitingStatuses = ['SOUMISE', 'DOCUMENTS_INCOMPLETS', 'EN_EXAMEN'];
    const currentMonth = new Date().toISOString().slice(0, 7);

    return {
      total: demandes.length,
      waiting: demandes.filter((demande) => waitingStatuses.includes(demande.status)).length,
      month: demandes.filter((demande) => demande.submittedAt.startsWith(currentMonth)).length,
    };
  });

  ngOnInit(): void {
    this.facade.loadForCompany(this.companyId());
  }

  protected onOpenDetail(id: string): void {
    void this.router.navigate(['/assurance', this.companyId(), 'demandes', id]);
  }

  protected openNouvelleDemandeDialog(): void {
    this.dialog.open(NouvelleDemandeDialogComponent, {
      data: { companyId: this.companyId() },
      maxWidth: '94vw',
      panelClass: 'assurance-form-dialog',
      width: 'min(860px, 94vw)',
    });
  }

  protected openImportCsvDialog(): void {
    this.dialog.open(ImportCsvDialogComponent, {
      data: { companyId: this.companyId() },
      maxWidth: '94vw',
      panelClass: 'assurance-form-dialog',
      width: 'min(900px, 94vw)',
    });
  }

  protected resetFilters(): void {
    this.facade.resetFilters();
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
}
