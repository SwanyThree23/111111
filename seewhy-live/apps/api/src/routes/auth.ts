import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../services/db.js';
import {
  issueAccessToken, issueRefreshToken, verifyRefreshToken,
  storeRefreshToken, rotateRefreshToken, revokeToken, isFamilyRevoked,
} from '../services/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { randomBytes } from 'crypto';

const router = Router();
const REFRESH_EXPIRY = 7 * 24 * 60 * 60;

const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8),
  displayName: z.string().max(50).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/register', rateLimit(5, 60, 'auth_register'), async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, username, password, displayName } = parsed.data;

  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) return res.status(409).json({ error: 'Email or Username already taken' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, username, passwordHash, displayName, role: 'viewer' },
  });

  await prisma.creatorOnboarding.create({ data: { userId: user.id } });

  const familyId = randomBytes(16).toString('hex');
  const accessToken = issueAccessToken({ sub: user.id, email, role: user.role, familyId });
  const { token: refreshToken, jti } = issueRefreshToken(familyId, user.id);
  await storeRefreshToken(jti, familyId, user.id);

  res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: REFRESH_EXPIRY * 1000 });
  return res.status(201).json({ accessToken, user: { id: user.id, username, displayName, role: user.role, badge: user.badge } });
});

router.post('/login', rateLimit(10, 60, 'auth_login'), async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const user = await prisma.user.findFirst({ where: { OR: [{ email: email }, { username: email }] } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const familyId = randomBytes(16).toString('hex');
  const accessToken = issueAccessToken({ sub: user.id, email, role: user.role, familyId });
  const { token: refreshToken, jti } = issueRefreshToken(familyId, user.id);
  await storeRefreshToken(jti, familyId, user.id);

  res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: REFRESH_EXPIRY * 1000 });
  return res.json({ accessToken, user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role, badge: user.badge } });
});

router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: 'No refresh token' });

  try {
    const { sub, familyId, jti } = verifyRefreshToken(token);

    if (await isFamilyRevoked(familyId)) {
      res.clearCookie('refresh_token');
      return res.status(401).json({ error: 'Session revoked' });
    }

    const result = await rotateRefreshToken(jti, familyId, sub);
    if (!result) {
      res.clearCookie('refresh_token');
      return res.status(401).json({ error: 'Token reuse detected — session revoked' });
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: sub } });
    const accessToken = issueAccessToken({ sub, email: user.username, role: user.role, familyId });

    res.cookie('refresh_token', result.token, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: REFRESH_EXPIRY * 1000 });
    return res.json({ accessToken });
  } catch {
    res.clearCookie('refresh_token');
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

router.post('/logout', async (req, res) => {
  res.clearCookie('refresh_token');
  return res.json({ success: true });
});

// --- Profile / Settings endpoints ---
import { authenticate, AuthRequest } from '../middleware/auth.js';

const ProfileUpdateSchema = z.object({
  displayName: z.string().max(50).optional(),
  bio: z.string().max(200).optional(),
  avatarUrl: z.string().url().optional(),
});

router.patch('/profile', authenticate, async (req: AuthRequest, res) => {
  const parsed = ProfileUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: parsed.data,
    select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true, role: true, badge: true },
  });

  return res.json(updated);
});

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true, username: true, email: true, displayName: true,
      avatarUrl: true, bio: true, role: true, badge: true,
      stripeOnboarded: true, createdAt: true,
    },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

router.post('/change-password', authenticate, rateLimit(3, 300, 'auth_change_pw'), async (req: AuthRequest, res) => {
  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

  return res.json({ success: true });
});

router.delete('/account', authenticate, async (req: AuthRequest, res) => {
  await prisma.user.delete({ where: { id: req.user!.id } });
  res.clearCookie('refresh_token');
  return res.json({ success: true });
});

export default router;
