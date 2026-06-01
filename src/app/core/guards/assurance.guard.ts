import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';

export const assuranceGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();
  const companyId = route.paramMap.get('companyId');

  if (user?.role === 'ASSURANCE_ADMIN' && user.companyId === companyId) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
