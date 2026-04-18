import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, isTokenRevoked } from '../services/auth.js';
import logger from '../services/logger.js';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);

    if (await isTokenRevoked(payload.jti)) {
      res.status(401).json({ error: 'Token revoked' });
      return;
    }

    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    logger.warn('Auth failure', { error: (err as Error).message });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
