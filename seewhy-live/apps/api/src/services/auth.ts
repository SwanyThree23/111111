import jwt from 'jsonwebtoken';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import redis from './redis.js';

const PRIVATE_KEY = process.env.JWT_PRIVATE_KEY!.replace(/\\n/g, '\n');
const PUBLIC_KEY = process.env.JWT_PUBLIC_KEY!.replace(/\\n/g, '\n');
const ACCESS_EXPIRY = 15 * 60; // 15 minutes
const REFRESH_EXPIRY = 7 * 24 * 60 * 60; // 7 days

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  jti: string;
  familyId: string;
}

export function issueAccessToken(payload: Omit<TokenPayload, 'jti'>): string {
  const jti = randomBytes(16).toString('hex');
  return jwt.sign({ ...payload, jti }, PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: ACCESS_EXPIRY,
  });
}

export function issueRefreshToken(familyId: string, sub: string): { token: string; jti: string } {
  const jti = randomBytes(16).toString('hex');
  const token = jwt.sign({ sub, familyId, jti, type: 'refresh' }, PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: REFRESH_EXPIRY,
  });
  return { token, jti };
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] }) as TokenPayload;
}

export function verifyRefreshToken(token: string): { sub: string; familyId: string; jti: string } {
  return jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] }) as { sub: string; familyId: string; jti: string };
}

export async function revokeToken(jti: string, expiry: number): Promise<void> {
  await redis.set(`revoked:${jti}`, '1', 'EX', expiry);
}

export async function isTokenRevoked(jti: string): Promise<boolean> {
  const result = await redis.get(`revoked:${jti}`);
  return result !== null;
}

export async function storeRefreshToken(jti: string, familyId: string, sub: string): Promise<void> {
  await redis.set(`refresh:${jti}`, JSON.stringify({ familyId, sub }), 'EX', REFRESH_EXPIRY);
}

export async function getRefreshFamily(familyId: string): Promise<string[]> {
  const keys = await redis.keys(`family:${familyId}:*`);
  return keys;
}

export async function revokeEntireFamily(familyId: string): Promise<void> {
  const keys = await redis.keys(`family:${familyId}:*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  await redis.set(`family_revoked:${familyId}`, '1', 'EX', REFRESH_EXPIRY);
}

export async function isFamilyRevoked(familyId: string): Promise<boolean> {
  const result = await redis.get(`family_revoked:${familyId}`);
  return result !== null;
}

export async function rotateRefreshToken(
  oldJti: string,
  familyId: string,
  sub: string
): Promise<{ token: string; jti: string } | null> {
  const existing = await redis.get(`refresh:${oldJti}`);
  if (!existing) {
    // Token reuse detected — revoke entire family
    await revokeEntireFamily(familyId);
    return null;
  }
  // Invalidate old token
  await redis.del(`refresh:${oldJti}`);
  // Issue new token in same family
  const { token, jti } = issueRefreshToken(familyId, sub);
  await storeRefreshToken(jti, familyId, sub);
  await redis.set(`family:${familyId}:${jti}`, '1', 'EX', REFRESH_EXPIRY);
  return { token, jti };
}

export function hashSecret(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
