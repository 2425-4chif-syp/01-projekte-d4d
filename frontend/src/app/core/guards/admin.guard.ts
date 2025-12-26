import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

/**
 * Admin Guard - Protects routes that require admin privileges
 * TODO: Integrate with Keycloak when authentication is fully set up
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // TODO: Check admin status
  // For now, allow access to all routes
  return true;

  // Future implementation:
  // const keycloakService = inject(KeycloakService);
  // await keycloakService.ensureThatUserIsAuthenticated();
  // const user = await keycloakService.getCurrentUser();
  // if (!user || user === 'guest') {
  //   router.navigate(['/']);
  //   return false;
  // }
  // if (keycloakService.isAdmin()) {
  //   return true;
  // }
  // router.navigate(['/']);
  // return false;
};
