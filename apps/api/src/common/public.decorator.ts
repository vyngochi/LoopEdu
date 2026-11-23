import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';
/** Skips the access-token check. Use only for health and the auth endpoints. */
export const Public = () => SetMetadata(IS_PUBLIC, true);
