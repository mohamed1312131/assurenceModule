import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import {
  AdhesionCoverageType,
  AdhesionRelationship,
  AdhesionRequest,
  AdhesionRequestStatus,
} from '../../../models/adhesion-request.model';
import { StatusChipComponent, StatusChipTone } from '../../../shared/status-chip/status-chip.component';
import { FtusaAdhesionRequestsFacade } from './ftusa-adhesion-requests.facade';

@Component({
  selector: 'app-ftusa-adhesion-requests',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
    MatIconModule,
    MatSnackBarModule,
    StatusChipComponent,
  ],
  templateUrl: './ftusa-adhesion-requests.component.html',
  styleUrl: './ftusa-adhesion-requests.component.scss',
})
export class FtusaAdhesionRequestsComponent implements OnInit {
  private readonly snackBar = inject(MatSnackBar);

  protected readonly facade = inject(FtusaAdhesionRequestsFacade);
  protected readonly statuses: AdhesionRequestStatus[] = [
    'NOUVELLE',
    'A_COMPLETER',
    'PRETE_A_PROPOSER',
    'OFFRE_ENVOYEE',
  ];
  protected readonly pageSizes = [10, 25, 50];

  ngOnInit(): void {
    this.facade.load();
  }

  protected selectRequest(request: AdhesionRequest): void {
    this.facade.selectRequest(request.id);
  }

  protected isSelected(request: AdhesionRequest): boolean {
    return this.facade.selectedRequest()?.id === request.id;
  }

  protected toggleStatus(status: AdhesionRequestStatus): void {
    const current = this.facade.filters().statuses;

    this.facade.updateFilter({
      statuses: current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status],
    });
  }

  protected setSearch(value: string): void {
    this.facade.setSearch(value);
  }

  protected setPageSize(value: number | string): void {
    this.facade.setPageSize(Number(value));
  }

  protected requestMoreInfo(request: AdhesionRequest): void {
    this.facade.requestMoreInfo(request.id);
    this.snackBar.open('Demande de complément envoyée vers OmniCare (simulation)', 'Fermer', {
      duration: 3500,
    });
  }

  protected statusLabel(status: AdhesionRequestStatus): string {
    const labels: Record<AdhesionRequestStatus, string> = {
      A_COMPLETER: 'À compléter',
      CLOTUREE: 'Clôturée',
      NOUVELLE: 'Nouvelle',
      OFFRE_ENVOYEE: 'Offre envoyée',
      PRETE_A_PROPOSER: 'Prête à proposer',
    };

    return labels[status];
  }

  protected statusTone(status: AdhesionRequestStatus): StatusChipTone {
    const tones: Record<AdhesionRequestStatus, StatusChipTone> = {
      A_COMPLETER: 'warning',
      CLOTUREE: 'neutral',
      NOUVELLE: 'info',
      OFFRE_ENVOYEE: 'success',
      PRETE_A_PROPOSER: 'success',
    };

    return tones[status];
  }

  protected relationshipLabel(relationship: AdhesionRelationship): string {
    const labels: Record<AdhesionRelationship, string> = {
      ASSURE: 'Assuré',
      CONJOINT: 'Conjoint',
      ENFANT: 'Enfant',
    };

    return labels[relationship];
  }

  protected coverageLabel(coverage: AdhesionCoverageType): string {
    const labels: Record<AdhesionCoverageType, string> = {
      DECES: 'Décès',
      INCAPACITE_INVALIDITE: 'Incapacité / invalidité',
      SANTE_COMPLEMENTAIRE: 'Complémentaire santé',
    };

    return labels[coverage];
  }

  protected familySituationLabel(value: AdhesionRequest['familySituation']): string {
    const labels: Record<AdhesionRequest['familySituation'], string> = {
      CELIBATAIRE: 'Célibataire',
      DIVORCE: 'Divorcé(e)',
      MARIE: 'Marié(e)',
      VEUF: 'Veuf / veuve',
    };

    return labels[value];
  }

  protected documentStatusTone(status: 'RECU' | 'MANQUANT' | 'DEMANDE'): StatusChipTone {
    if (status === 'RECU') {
      return 'success';
    }

    return status === 'DEMANDE' ? 'warning' : 'error';
  }

  protected memberSummary(request: AdhesionRequest): string {
    const spouseCount = request.members.filter((member) => member.relationship === 'CONJOINT').length;
    const childCount = request.members.filter((member) => member.relationship === 'ENFANT').length;

    if (spouseCount === 0 && childCount === 0) {
      return 'Assuré seul';
    }

    return `Assuré + ${spouseCount} conjoint + ${childCount} enfant(s)`;
  }

  protected relativeDate(isoDate: string): string {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const minutes = Math.max(1, Math.round(diffMs / 60_000));

    if (minutes < 60) {
      return `il y a ${minutes} min`;
    }

    const hours = Math.round(minutes / 60);

    if (hours < 24) {
      return `il y a ${hours} h`;
    }

    return `il y a ${Math.round(hours / 24)} j`;
  }

  protected dateLabel(isoDate: string | undefined): string {
    if (!isoDate) {
      return 'Non renseigné';
    }

    return new Intl.DateTimeFormat('fr-TN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(isoDate));
  }

  protected formatCurrency(value: number | undefined): string {
    if (value === undefined) {
      return 'Non renseigné';
    }

    return this.facade.formatCurrency(value);
  }

}
