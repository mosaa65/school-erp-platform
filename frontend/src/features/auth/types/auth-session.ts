export type AuthSessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleCodes: string[];
  permissionCodes: string[];
};

export type AuthSession = {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  user: AuthSessionUser;
};


