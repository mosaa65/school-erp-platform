export interface AuthUser {
  userId: string;
  email: string;
  roleCodes: string[];
  permissionCodes: string[];
  sessionId?: string;
}
