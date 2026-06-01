export interface Communication {
  id: string;
  sentBy: string;
  sentAt: string;
  category: 'ALERTE_FRAUDE' | 'REGLEMENTAIRE' | 'ANNONCE_SYSTEME' | 'INFORMATION';
  priority: 'INFO' | 'IMPORTANT' | 'URGENT';
  subject: string;
  body: string;
  recipientCompanyIds: string[];
  readReceipts: ReadReceipt[];
  isMandatory: false;
}

export interface ReadReceipt {
  companyId: string;
  readBy: string;
  readAt: string;
}
