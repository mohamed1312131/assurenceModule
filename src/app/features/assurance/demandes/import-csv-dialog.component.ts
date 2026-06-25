import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Adherent } from '../../../models/adherent.model';
import { DemandeRemboursement } from '../../../models/demande-remboursement.model';
import { ActCategory } from '../../../models/shared.model';
import { DemandesFacade } from './demandes.facade';

type ImportState = 'idle' | 'parsing' | 'preview' | 'done';

interface ImportCsvData {
  companyId: string;
}

interface CsvPreviewRow {
  index: number;
  matricule: string;
  category: ActCategory;
  categoryLabel: string;
  provider: string;
  actDate: string;
  amount: number;
  factureNumber: string;
  error: string | null;
}

@Component({
  selector: 'app-import-csv-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
  ],
  template: `
    <header class="wizard-header">
      <div class="wizard-heading">
        <span class="section-kicker">Import COMAR</span>
        <h2 mat-dialog-title>Importer un lot CSV</h2>
        <p>Contrôlez les lignes détectées avant de les ajouter à la file de traitement.</p>
      </div>
      <button class="dialog-close" mat-icon-button type="button" mat-dialog-close aria-label="Fermer">
        <mat-icon aria-hidden="true">close</mat-icon>
      </button>
    </header>

    <mat-dialog-content class="wizard-content">
      @switch (state()) {
        @case ('idle') {
          <section class="step-section idle-state">
            <div class="section-intro">
              <span class="section-kicker">Format attendu</span>
              <p>Les colonnes doivent rester dans cet ordre pour garantir une prévisualisation fiable.</p>
            </div>

            <div class="instructions">
              <code>
                matricule_adherent, categorie_acte, prestataire, date_acte, montant, numero_facture
              </code>
            </div>

            <div class="button-row">
              <button mat-stroked-button type="button" (click)="downloadTemplate()">
                <mat-icon aria-hidden="true">download</mat-icon>
                Télécharger modèle.csv
              </button>

              <button mat-flat-button color="primary" type="button" (click)="fileInput.click()">
                <mat-icon aria-hidden="true">folder_open</mat-icon>
                Choisir un fichier CSV
              </button>
              <input
                #fileInput
                hidden
                type="file"
                accept=".csv"
                (change)="parseSelectedFile($event)"
              />
            </div>

            <div class="divider-row">
              <mat-divider />
              <span>ou</span>
              <mat-divider />
            </div>

            <button mat-stroked-button type="button" (click)="generateMockRows()">
              <mat-icon aria-hidden="true">casino</mat-icon>
              Générer 3 demandes de test
            </button>
          </section>
        }
        @case ('parsing') {
          <section class="step-section center-state">
            <mat-spinner diameter="46" />
            <p>Analyse du fichier en cours...</p>
          </section>
        }
        @case ('preview') {
          <section class="step-section preview-state">
            <div class="section-intro">
              <span class="section-kicker">Prévisualisation</span>
              <p class="preview-title">{{ previewRows().length }} demandes détectées</p>
            </div>

            <table mat-table [dataSource]="previewRows()" class="preview-table">
              <ng-container matColumnDef="adherent">
                <th mat-header-cell *matHeaderCellDef>Adhérent</th>
                <td mat-cell *matCellDef="let row">{{ row.matricule }}</td>
              </ng-container>

              <ng-container matColumnDef="category">
                <th mat-header-cell *matHeaderCellDef>Catégorie</th>
                <td mat-cell *matCellDef="let row">{{ row.categoryLabel }}</td>
              </ng-container>

              <ng-container matColumnDef="provider">
                <th mat-header-cell *matHeaderCellDef>Prestataire</th>
                <td mat-cell *matCellDef="let row">{{ row.provider }}</td>
              </ng-container>

              <ng-container matColumnDef="actDate">
                <th mat-header-cell *matHeaderCellDef>Date acte</th>
                <td mat-cell *matCellDef="let row">{{ row.actDate }}</td>
              </ng-container>

              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef>Montant</th>
                <td mat-cell *matCellDef="let row">{{ row.amount }} TND</td>
              </ng-container>

              <ng-container matColumnDef="facture">
                <th mat-header-cell *matHeaderCellDef>Facture N°</th>
                <td mat-cell *matCellDef="let row">
                  @if (row.error) {
                    <mat-icon class="row-error" [matTooltip]="row.error">error</mat-icon>
                  }
                  {{ row.factureNumber }}
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: displayedColumns"
                [class.invalid-row]="row.error"
              ></tr>
            </table>

            <p class="validity">{{ validRows().length }} valides · {{ invalidRows().length }} avec erreurs (ignorées)</p>
          </section>
        }
        @case ('done') {
          <section class="step-section center-state done-state">
            <mat-icon aria-hidden="true">check_circle</mat-icon>
            <h3>Import terminé</h3>
            <p>{{ importedCount() }} demandes ajoutées à la file de traitement</p>
          </section>
        }
      }
    </mat-dialog-content>

    <mat-dialog-actions class="wizard-footer" align="end">
      @if (state() === 'preview') {
        <button mat-button type="button" (click)="cancelPreview()">Annuler</button>
        <button mat-flat-button color="primary" type="button" (click)="importValidRows()">
          Importer {{ validRows().length }} demandes
        </button>
      } @else if (state() === 'done') {
        <button mat-flat-button color="primary" type="button" mat-dialog-close>Fermer</button>
      } @else {
        <button mat-button type="button" mat-dialog-close>Fermer</button>
      }
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

    .wizard-heading p,
    .section-intro p {
      color: var(--omnicare-muted);
      font-size: 0.94rem;
      margin: 0;
    }

    .wizard-content {
      background: #f8fafc;
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
      max-width: 100%;
      min-width: 0;
      padding: 16px;
    }

    .section-intro {
      display: grid;
      gap: 5px;
    }

    .idle-state,
    .preview-state {
      display: grid;
      gap: 18px;
    }

    .instructions {
      background: #f4f8fb;
      border: 1px solid #d9e4ec;
      border-radius: 14px;
      padding: 14px;
    }

    .instructions p {
      color: var(--omnicare-text);
      font-weight: 700;
      margin: 0 0 8px;
    }

    code {
      color: var(--omnicare-secondary);
      display: block;
      line-height: 1.5;
      white-space: normal;
    }

    .button-row,
    .divider-row {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .divider-row mat-divider {
      flex: 1;
    }

    .divider-row span {
      color: var(--omnicare-muted);
      font-size: 0.86rem;
    }

    .center-state {
      align-items: center;
      color: var(--omnicare-muted);
      display: grid;
      gap: 14px;
      justify-items: center;
      min-height: 220px;
      text-align: center;
    }

    .done-state mat-icon {
      color: var(--omnicare-success);
      font-size: 64px;
      height: 64px;
      width: 64px;
    }

    .preview-title,
    .validity {
      color: var(--omnicare-text);
      font-weight: 700;
      margin: 0;
    }

    .preview-table {
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
    }

    .invalid-row {
      background: #fef2f2;
    }

    .row-error {
      color: #b91c1c;
      font-size: 18px;
      height: 18px;
      margin-right: 4px;
      vertical-align: middle;
      width: 18px;
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
    }
  `,
})
export class ImportCsvDialogComponent {
  private readonly facade = inject(DemandesFacade);
  private readonly dialogRef = inject(MatDialogRef<ImportCsvDialogComponent>);
  private readonly data = inject<ImportCsvData>(MAT_DIALOG_DATA);

  protected readonly state = signal<ImportState>('idle');
  protected readonly previewRows = signal<CsvPreviewRow[]>([]);
  protected readonly importedCount = signal(0);
  protected readonly displayedColumns = ['adherent', 'category', 'provider', 'actDate', 'amount', 'facture'];

  private readonly adherents = signal<Adherent[]>(this.readAdherents());

  protected readonly validRows = computed(() => this.previewRows().filter((row) => !row.error));
  protected readonly invalidRows = computed(() => this.previewRows().filter((row) => row.error));

  protected downloadTemplate(): void {
    const csv = [
      'matricule_adherent,categorie_acte,prestataire,date_acte,montant,numero_facture',
      'AH-789,CONSULTATION,Cabinet Dr Ben Salem,2026-05-12,85,FAC-DEMO-001',
      'SO-214,KINESITHERAPIE,Centre Rehab Tunis,2026-05-13,420,FAC-DEMO-002',
      'KA-552,RADIOLOGIE,Imagerie Lac 2,2026-05-14,180,FAC-DEMO-003',
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modele-demandes.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  protected parseSelectedFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.state.set('parsing');
    const reader = new FileReader();
    reader.onload = () => {
      this.previewRows.set(this.parseCsv(String(reader.result ?? '')));
      this.state.set('preview');
    };
    reader.readAsText(file);
    input.value = '';
  }

  protected generateMockRows(): void {
    const memberships = this.adherents().slice(0, 3).map((adherent) => adherent.membershipId);
    const fallback = ['AH-789', 'SO-214', 'KA-552'];
    const rows = [
      `${memberships[0] ?? fallback[0]},CONSULTATION,Cabinet Dr Ben Salem,2026-05-10,95,FAC-TEST-001`,
      `${memberships[1] ?? fallback[1]},DENTAIRE,Centre Dentaire Ariana,2026-05-11,320,FAC-TEST-002`,
      `${memberships[2] ?? fallback[2]},RADIOLOGIE,Imagerie Lac 2,2026-05-12,180,FAC-TEST-003`,
    ].join('\n');

    this.previewRows.set(this.parseCsv(`matricule_adherent,categorie_acte,prestataire,date_acte,montant,numero_facture\n${rows}`));
    this.state.set('preview');
  }

  protected cancelPreview(): void {
    this.previewRows.set([]);
    this.state.set('idle');
  }

  protected importValidRows(): void {
    const now = Date.now();
    const demandes = this.validRows().map((row, index) => this.toDemande(row, now, index));

    demandes.forEach((demande) => this.facade.addDemande(demande));
    this.importedCount.set(demandes.length);
    this.state.set('done');

    if (demandes.length === 0) {
      this.dialogRef.disableClose = false;
    }
  }

  private parseCsv(rawCsv: string): CsvPreviewRow[] {
    return rawCsv
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(1)
      .map((line, index) => {
        const [matricule = '', category = 'AUTRE', provider = '', actDate = '', amount = '', facture = ''] =
          line.split(',').map((cell) => cell.trim());
        const parsedAmount = Number(amount);
        const normalizedCategory = this.normalizeCategory(category);
        const error =
          !matricule || !amount || Number.isNaN(parsedAmount)
            ? 'Matricule ou montant manquant'
            : null;

        return {
          index,
          matricule,
          category: normalizedCategory,
          categoryLabel: this.labelForCategory(normalizedCategory),
          provider,
          actDate,
          amount: Number.isNaN(parsedAmount) ? 0 : parsedAmount,
          factureNumber: facture,
          error,
        };
      });
  }

  private toDemande(row: CsvPreviewRow, nowMs: number, index: number): DemandeRemboursement {
    const adherent = this.adherents().find((item) => item.membershipId === row.matricule);
    const nowIso = new Date(nowMs).toISOString();

    return {
      id: `DEM-IMP-${index + 1}-${nowMs}`,
      companyId: this.data.companyId,
      patientName: adherent?.patientName ?? row.matricule,
      patientMemberId: row.matricule,
      planTierName: adherent?.planTierName ?? 'Basique',
      employerName: adherent?.employer?.employerName,
      contractId: adherent?.employer?.contractId,
      factureNumber: row.factureNumber || `FAC-IMP-${index + 1}`,
      factureDate: row.actDate,
      providerName: row.provider || 'Prestataire non précisé',
      providerType: this.providerTypeFor(row.category),
      providerInNetwork: true,
      actCategory: row.category,
      actDescription: this.labelForCategory(row.category),
      totalAmount: row.amount,
      source: 'IMPORT_CSV',
      documents: [],
      status: 'SOUMISE',
      submittedAt: nowIso,
      actDate: row.actDate,
      lastUpdatedAt: nowIso,
      flags: [],
      riskScore: 'FAIBLE',
    };
  }

  private normalizeCategory(value: string): ActCategory {
    const categories: ActCategory[] = [
      'CONSULTATION',
      'CHIRURGIE',
      'KINESITHERAPIE',
      'SOINS_INFIRMIERS',
      'RADIOLOGIE',
      'BIOLOGIE',
      'HOSPITALISATION',
      'DENTAIRE',
      'OPTIQUE',
      'PSYCHIATRIE',
      'MATERNITE',
      'URGENCES',
      'AUTRE',
    ];

    return categories.includes(value as ActCategory) ? (value as ActCategory) : 'AUTRE';
  }

  private labelForCategory(category: ActCategory): string {
    const labels: Record<ActCategory, string> = {
      AUTRE: 'Autre',
      BIOLOGIE: 'Biologie',
      CHIRURGIE: 'Chirurgie',
      CONSULTATION: 'Consultation',
      DENTAIRE: 'Dentaire',
      HOSPITALISATION: 'Hospitalisation',
      KINESITHERAPIE: 'Kinésithérapie',
      MATERNITE: 'Maternité',
      OPTIQUE: 'Optique',
      PSYCHIATRIE: 'Psychiatrie',
      RADIOLOGIE: 'Radiologie',
      SOINS_INFIRMIERS: 'Soins infirmiers',
      URGENCES: 'Urgences',
    };

    return labels[category];
  }

  private providerTypeFor(category: ActCategory): DemandeRemboursement['providerType'] {
    if (category === 'KINESITHERAPIE') {
      return 'KINE';
    }

    if (category === 'SOINS_INFIRMIERS') {
      return 'INFIRMIER';
    }

    if (['CHIRURGIE', 'HOSPITALISATION'].includes(category)) {
      return 'CLINIQUE';
    }

    return 'MEDECIN';
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
}
