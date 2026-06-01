import { Component, OnInit, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LucideAngularModule } from 'lucide-angular';

import { AuthService } from '../../../core/auth/auth.service';
import { CommunicationsService } from '../../../core/communications/communications.service';
import { Communication } from '../../../models/communication.model';
import { InsightCardComponent } from '../../../shared/insight-card/insight-card.component';
import { CountUpDirective } from '../../../shared/utils/count-up.directive';
import { AssuranceMessageDialogComponent } from '../communications/assurance-message-dialog.component';
import { AlertBannerComponent } from '../../../shared/alert-banner/alert-banner.component';
import {
  AssuranceDashboardFacade,
  DashboardInsight,
  QuickAction,
} from './dashboard.facade';

@Component({
  selector: 'app-assurance-dashboard',
  imports: [
    CountUpDirective,
    AlertBannerComponent,
    InsightCardComponent,
    LucideAngularModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  providers: [AssuranceDashboardFacade],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  protected readonly comms = inject(CommunicationsService);
  protected readonly facade = inject(AssuranceDashboardFacade);
  protected readonly dashboardData = this.facade.dashboardData;
  protected readonly companyId = computed(() => this.auth.currentUser()?.companyId ?? '');
  protected readonly importantMessages = computed(() =>
    this.companyId() ? this.comms.importantUnread(this.companyId()) : [],
  );

  ngOnInit(): void {
    this.comms.load();
    const user = this.auth.currentUser();

    if (!user?.companyId) {
      return;
    }

    for (const message of this.comms.urgentUnread(user.companyId)) {
      const key = `omnicare_urgent_seen_${user.companyId}_${message.id}`;

      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) {
        continue;
      }

      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(key, 'true');
      }

      this.openMessage(message);
      break;
    }
  }

  protected openInsight(insight: DashboardInsight): void {
    void this.router.navigate(insight.commands, {
      queryParams: insight.queryParams,
    });
  }

  protected runQuickAction(action: QuickAction): void {
    if (action.disabled || !action.commands) {
      return;
    }

    void this.router.navigate(action.commands, {
      queryParams: action.queryParams,
    });
  }

  protected openMessage(message: Communication): void {
    const user = this.auth.currentUser();

    if (user?.companyId) {
      this.comms.markRead(message.id, user.companyId, user.name);
    }

    this.dialog.open(AssuranceMessageDialogComponent, {
      data: message,
      width: '640px',
    });
  }
}
