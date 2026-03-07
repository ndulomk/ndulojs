export interface CreateSessionDTO {
  userId: string;
  token: string;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  deviceType?: string;
  expiresAt: Date;
}

export interface SessionResponseDTO {
  id: string;
  userId: string;
  token: string;
  refreshToken: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  deviceType: string | null;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
}

export interface RefreshTokenRequestDTO {
  refreshToken: string;
}

export interface RefreshTokenResponseDTO {
  accessToken: string;
  refreshToken: string;
}