export interface RequestDocument {
  id: string;
  type: DocumentType;
  label: string;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: 'PATIENT' | 'ADMIN' | 'EMPLOYER';
  status: 'RECU' | 'MANQUANT' | 'DEMANDE';
}

export type DocumentType =
  | 'FACTURE'
  | 'BULLETIN_DE_SOINS'
  | 'ORDONNANCE'
  | 'CERTIFICAT_MEDICAL'
  | 'COMPTE_RENDU_OPERATOIRE'
  | 'AUTRES';
