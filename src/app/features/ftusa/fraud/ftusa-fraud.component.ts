import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ClaimFlag } from '../../../models/demande-remboursement.model';
import { FtusaCrossFraudFacade } from './ftusa-cross-fraud.facade';

@Component({
  selector: 'app-ftusa-fraud',
  imports: [MatButtonModule, MatCardModule, MatChipsModule, MatIconModule, MatSnackBarModule],
  templateUrl: './ftusa-fraud.component.html',
  styleUrl: './ftusa-fraud.component.scss',
})
export class FtusaFraudComponent implements OnInit {
  private readonly snackBar = inject(MatSnackBar);

  protected readonly facade = inject(FtusaCrossFraudFacade);

  ngOnInit(): void {
    this.facade.load();
  }

  protected showParticipantList(): void {
    this.snackBar.open(this.facade.participatingNames() || 'Aucune compagnie participante', 'Fermer', {
      duration: 5000,
    });
  }

  protected notifyCompanies(): void {
    this.snackBar.open('Notification envoyée aux compagnies concernées (simulation)', 'Fermer', {
      duration: 3500,
    });
  }

  protected createAlfaSignal(): void {
    this.snackBar.open('Signalement ALFA préparé — Phase 2 simulation', 'Fermer', {
      duration: 3500,
    });
  }

  protected formatDate(isoDate: string): string {
    return new Intl.DateTimeFormat('fr-TN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(isoDate));
  }

  protected flagLabel(flag: ClaimFlag): string {
    const labels: Record<ClaimFlag, string> = {
      AUTORISATION_MANQUANTE: 'Autorisation manquante',
      DELAI_SOUMISSION: 'Délai dépassé',
      DOCUMENTS_MANQUANTS: 'Documents manquants',
      DOUBLON_SUSPECT: 'Doublon suspect',
      MONTANT_ELEVE: 'Montant élevé',
      PRESTATAIRE_HORS_RESEAU: 'Hors réseau',
      SEUIL_REASSURANCE: 'Seuil réassurance',
    };

    return labels[flag];
  }
}
