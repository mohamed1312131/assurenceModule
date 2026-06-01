import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.open(message, 'Fermer', 'notification-success');
  }

  info(message: string): void {
    this.open(message, 'Fermer', 'notification-info');
  }

  warning(message: string): void {
    this.open(message, 'Fermer', 'notification-warning');
  }

  error(message: string): void {
    this.open(message, 'Fermer', 'notification-error');
  }

  private open(message: string, action: string, panelClass: string): void {
    this.snackBar.open(message, action, {
      duration: 3500,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass,
    });
  }
}
