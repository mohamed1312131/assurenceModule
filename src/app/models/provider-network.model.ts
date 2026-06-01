export interface ProviderNetworkEntry {
  id: string;
  companyId: string;
  providerName: string;
  providerType:
    | 'CLINIQUE'
    | 'MEDECIN'
    | 'KINE'
    | 'INFIRMIER'
    | 'CABINET_DENTAIRE'
    | 'LABORATOIRE'
    | 'AUTRE';
  specialties: string[];
  city: string;
  region: string;
  networkStatus: 'AGREE' | 'EN_COURS_AGREMENT' | 'HORS_RESEAU';
  tiersPayantEnabled: boolean;
  agreedSince?: string;
  claimsThisYear: number;
  totalReimbursedThisYear: number;
}
