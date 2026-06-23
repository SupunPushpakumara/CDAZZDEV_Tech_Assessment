import { SetMetadata } from '@nestjs/common';

export const REQUIRES_PROJECT_MANAGER_KEY = 'requiresProjectManager';
export const RequiresProjectManager = () => SetMetadata(REQUIRES_PROJECT_MANAGER_KEY, true);
