import { hash, verify } from '@node-rs/argon2';
import { sign, verify as jwtVerify, type JwtPayload } from 'jsonwebtoken';
import { env } from '@/config/env';

const ARGON2_CONFIG = {
  memoryCost: 19456, 
  timeCost: 2,       
  parallelism: 1,    
} as const;

const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

interface TokenPayload extends JwtPayload {
  userId: string;
}

/**
 * Hash de senha usando Argon2id
 * @param password - Senha em texto plano
 * @returns Hash Argon2
 */
export const hashPassword = async (password: string): Promise<string> => {
  if (!password || password.length === 0) {
    throw new Error('Password cannot be empty');
  }

  return hash(password, ARGON2_CONFIG);
};

/**
 * Verifica senha contra hash Argon2
 * @param password - Senha em texto plano
 * @param hashedPassword - Hash Argon2
 * @returns true se a senha corresponde
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  if (!password || !hashedPassword) {
    return false;
  }

  try {
    return await verify(hashedPassword, password, ARGON2_CONFIG);
  } catch {
    return false;
  }
};

/**
 * Gera JWT token para usuário
 * @param userId - ID do usuário
 * @returns JWT token
 */
export const generateToken = (userId: string): string => {
  if (!userId) {
    throw new Error('userId is required to generate token');
  }

  return sign({ userId } satisfies TokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Verifica e decodifica JWT token
 * @param token - JWT token
 * @returns userId se válido, null se inválido
 */
export const verifyToken = (token: string): string | null => {
  if (!token) {
    return null;
  }

  try {
    const decoded = jwtVerify(token, JWT_SECRET) as TokenPayload;
    
    if (!decoded || typeof decoded === 'string' || !decoded.userId) {
      return null;
    }
    
    return decoded.userId;
  } catch {
    return null;
  }
};

/**
 * Gera token de refresh (vida mais longa)
 * @param userId - ID do usuário
 * @returns JWT refresh token
 */
export const generateRefreshToken = (userId: string): string => {
  if (!userId) {
    throw new Error('userId is required to generate refresh token');
  }

  return sign({ userId } satisfies TokenPayload, JWT_SECRET, {
    expiresIn: '30d',
  });
};