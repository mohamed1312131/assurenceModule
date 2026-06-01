import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';

export const ftusaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();

  if (user?.role === 'FTUSA_ADMIN') {
    return true;
  }

  return router.createUrlTree(['/login']);
};
