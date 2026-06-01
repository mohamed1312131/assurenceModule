export interface AdminAccount {
  id: string;
  role: 'FTUSA_ADMIN' | 'ASSURANCE_ADMIN';
  companyId?: string;
  name: string;
  email: string;
  status: 'ACTIVE' | 'SUSPENDED';
  lastLoginAt?: string;
}
