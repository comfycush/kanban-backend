import { Membership } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      createdAt: Date;
    }

    interface Request {
      /** Filled by RolesGuard for org-scoped routes */
      membership?: Membership;
    }
  }
}

export {};
