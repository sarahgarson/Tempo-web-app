"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthenticatedRequest = void 0;
function isAuthenticatedRequest(req) {
    return req.user !== undefined;
}
exports.isAuthenticatedRequest = isAuthenticatedRequest;
// interface User {
//   id: number;
//   email: string;
//   password?: string;
//   username: string;
//   created_at: Date;
//   google_id?: string;
//   role: 'employee' | 'manager';
// }
