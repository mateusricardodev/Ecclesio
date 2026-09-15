import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restringe a rota aos papéis informados. Exige `RolesGuard` (e `JwtGuard`
 * antes dele, para que `request.user` já exista).
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
