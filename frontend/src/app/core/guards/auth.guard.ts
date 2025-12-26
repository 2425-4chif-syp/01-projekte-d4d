import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

/**
 * Auth Guard - Protects routes that require authentication
 * TODO: Integrate with Keycloak when authentication is fully set up
 */
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // TODO: Check authentication status
  // For now, allow access to all routes
  return true;

  // Future implementation:
  // const keycloakService = inject(KeycloakService);
  // await keycloakService.ensureThatUserIsAuthenticated();
  // const user = await keycloakService.getCurrentUser();
  // if (user && user !== 'guest') {
  //   return true;
  // }
  // router.navigate(['/']);
  // return false;
};
