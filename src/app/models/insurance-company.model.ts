export interface InsuranceCompany {
  id: string;
  name: string;
  code: string;
  logoUrl: string;
  cgaRegistrationNumber: string;
  inpdpDeclarationNumber: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  status: 'EN_ATTENTE' | 'ACTIVE' | 'SUSPENDUE';
  onboardedAt: string;
  onboardingCompleted: boolean;
  participatesInCrossFraudDetection: boolean;
  participatesInMarketAnalytics: boolean;
}
