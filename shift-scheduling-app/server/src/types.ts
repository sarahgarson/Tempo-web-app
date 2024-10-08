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



// interface User {
//   id: number;
//   email: string;
//   password?: string;
//   username: string;
//   created_at: Date;
//   google_id?: string;
//   role: 'employee' | 'manager';
// }