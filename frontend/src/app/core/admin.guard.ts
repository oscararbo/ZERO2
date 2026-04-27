import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AdminService } from './admin.service';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const admin = inject(AdminService);

  return admin.hasAccess().pipe(
    map((isAdmin) => isAdmin || router.parseUrl('/dashboard')),
    catchError(() => of(router.parseUrl('/dashboard')))
  );
};
