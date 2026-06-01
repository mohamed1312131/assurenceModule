import { Injectable, computed, signal } from '@angular/core';

import { AdminAccount } from '../../models/admin-account.model';
import { Communication } from '../../models/communication.model';
import { InsuranceCompany } from '../../models/insurance-company.model';

@Injectable({ providedIn: 'root' })
export class CommunicationsService {
  readonly communications = signal<Communication[]>([]);
  readonly companies = signal<InsuranceCompany[]>([]);
  readonly admins = signal<AdminAccount[]>([]);

  readonly sortedCommunications = computed(() =>
    [...this.communications()].sort(
      (left, right) => new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime(),
    ),
  );

  load(): void {
    this.communications.set(this.readJson<Communication[]>('omnicare_ftusa_communications', []));
    this.companies.set(this.readJson<InsuranceCompany[]>('omnicare_ftusa_companies', []));
    this.admins.set(this.readJson<AdminAccount[]>('omnicare_ftusa_admins', []));
  }

  send(communication: Communication): void {
    const next = [communication, ...this.communications()];
    this.communications.set(next);
    this.persist(next);
  }

  targetedFor(companyId: string): Communication[] {
    return this.sortedCommunications().filter(
      (communication) =>
        communication.recipientCompanyIds.length === 0 ||
        communication.recipientCompanyIds.includes(companyId),
    );
  }

  unreadFor(companyId: string): Communication[] {
    return this.targetedFor(companyId).filter(
      (communication) =>
        !communication.readReceipts.some((receipt) => receipt.companyId === companyId),
    );
  }

  unreadCount(companyId: string): number {
    return this.unreadFor(companyId).length;
  }

  urgentUnread(companyId: string): Communication[] {
    return this.unreadFor(companyId).filter((communication) => communication.priority === 'URGENT');
  }

  importantUnread(companyId: string): Communication[] {
    return this.unreadFor(companyId).filter(
      (communication) => communication.priority === 'IMPORTANT',
    );
  }

  markRead(communicationId: string, companyId: string, readBy: string): void {
    const next = this.communications().map((communication) => {
      if (
        communication.id !== communicationId ||
        communication.readReceipts.some((receipt) => receipt.companyId === companyId)
      ) {
        return communication;
      }

      return {
        ...communication,
        readReceipts: [
          ...communication.readReceipts,
          {
            companyId,
            readAt: new Date().toISOString(),
            readBy,
          },
        ],
      };
    });

    this.communications.set(next);
    this.persist(next);
  }

  recipientsFor(communication: Communication): InsuranceCompany[] {
    if (communication.recipientCompanyIds.length === 0) {
      return this.companies();
    }

    return this.companies().filter((company) =>
      communication.recipientCompanyIds.includes(company.id),
    );
  }

  adminFor(companyId: string): AdminAccount | undefined {
    return this.admins().find((admin) => admin.companyId === companyId);
  }

  readCompanyName(companyId: string): string {
    return this.companies().find((company) => company.id === companyId)?.name ?? companyId;
  }

  private persist(communications: Communication[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem('omnicare_ftusa_communications', JSON.stringify(communications));
  }

  private readJson<T>(key: string, fallback: T): T {
    if (typeof localStorage === 'undefined') {
      return fallback;
    }

    const raw = localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
}
