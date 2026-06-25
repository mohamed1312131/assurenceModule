import { RequestDocument } from './request-document.model';
import { ActCategory, ClaimSource } from './shared.model';

export interface DemandeRemboursement {
  id: string;
  companyId: string;
  patientName: string;
  patientMemberId: string;
  planTierName: string;
  employerName?: string;
  contractId?: string;
  factureNumber: string;
  factureDate: string;
  providerName: string;
  providerType: 'CLINIQUE' | 'MEDECIN' | 'KINE' | 'INFIRMIER' | 'AUTRE';
  providerInNetwork: boolean;
  actCategory: ActCategory;
  actDescription: string;
  totalAmount: number;
  priorAuthorizationRef?: string;
  source: ClaimSource;
  documents: RequestDocument[];
  status: DemandeStatus;
  submittedAt: string;
  actDate: string;
  lastUpdatedAt: string;
  respondedAt?: string;
  respondedBy?: string;
  approvedAmount?: number;
  reimbursementAmount?: number;
  rejectionReason?: RejectionReason;
  rejectionNotes?: string;
  conditions?: string;
  flags: ClaimFlag[];
  riskScore: 'FAIBLE' | 'MOYEN' | 'ELEVE';
  crossCompanyDuplicateDetected?: boolean;
  internalNotes?: string;
  comarBulletin?: ComarBulletinData;
}

export interface ComarBulletinData {
  identity: {
    identifiantUnique: string;
    societyName: string;
    adherentFullName: string;
    address: string;
    contractNumber: string;
    matricule: string;
    patientFirstName: string;
  };
  provider: {
    specialistNameAndAddress: string;
    establishmentStamp: string;
    doctorSignatureLabel: string;
    providerFiscalNumber: string;
  };
  medicalActs: Array<{
    actDate: string;
    actDesignation: string;
    actCoefficient: string;
    honorairesAmount: string;
    ordonnanceDelivered: string;
    invoiceAmount: string;
  }>;
  pharmacy: {
    pharmacyOrSupplierStamp: string;
  };
  declaration: {
    declarationDate: string;
    adherentVisa: string;
    employerVisa: string;
  };
  assuranceDecision?: {
    label: string;
    approvedAmount: string;
    reimbursementAmount?: string;
    reviewerName: string;
    reviewedDate: string;
    dossierReference?: string;
  };
}

export type DemandeStatus =
  | 'SOUMISE'
  | 'DOCUMENTS_INCOMPLETS'
  | 'EN_EXAMEN'
  | 'APPROUVEE'
  | 'APPROUVEE_PARTIELLEMENT'
  | 'APPROUVEE_AUTO'
  | 'REFUSEE';

export type ClaimFlag =
  | 'DOCUMENTS_MANQUANTS'
  | 'DOUBLON_SUSPECT'
  | 'MONTANT_ELEVE'
  | 'AUTORISATION_MANQUANTE'
  | 'DELAI_SOUMISSION'
  | 'SEUIL_REASSURANCE'
  | 'PRESTATAIRE_HORS_RESEAU';

export type RejectionReason =
  | 'DOCUMENT_MANQUANT'
  | 'ACTE_NON_COUVERT'
  | 'DOUBLON'
  | 'PLAFOND_ATTEINT'
  | 'AUTORISATION_MANQUANTE'
  | 'DELAI_DEPASSE'
  | 'PRESTATAIRE_NON_AGREE'
  | 'MONTANT_NON_CONFORME'
  | 'FRAUDE_SUSPECTEE'
  | 'AUTRE';
