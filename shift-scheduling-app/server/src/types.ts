import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export function isAuthenticatedRequest(req: Request): req is AuthenticatedRequest {
  return (req as AuthenticatedRequest).user !== undefined;
}


