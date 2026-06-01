export type ActCategory =
  | 'CONSULTATION'
  | 'CHIRURGIE'
  | 'KINESITHERAPIE'
  | 'SOINS_INFIRMIERS'
  | 'RADIOLOGIE'
  | 'BIOLOGIE'
  | 'HOSPITALISATION'
  | 'DENTAIRE'
  | 'OPTIQUE'
  | 'PSYCHIATRIE'
  | 'MATERNITE'
  | 'URGENCES'
  | 'AUTRE';

export type ClaimSource = 'OMNICARE' | 'MANUEL' | 'IMPORT_CSV' | 'WEBSITE' | 'EMAIL' | 'AUTRE';

export interface EmployerReference {
  contractId: string;
  employerName: string;
  employeeMatricule: string;
  departmentOrGrade?: string;
}

export interface PlatformSettings {
  minimumMarketSlaDays: number;
  mandatoryPriorAuthCategories: ActCategory[];
  legalAutoApprovalDays: number;
}

export interface CompanySettings {
  companyId: string;
  participatesInCrossFraudDetection: boolean;
  participatesInMarketAnalytics: boolean;
  defaultSlaDays: number;
  priorAuthCategories: ActCategory[];
}

export interface ActCategoryMetadata {
  id: ActCategory;
  label: string;
  active: boolean;
}
