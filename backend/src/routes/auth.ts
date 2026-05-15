import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../server';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logger } from '../config/logger';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username, password, firstName, lastName } = req.body;

    if (!email || !username || !password) {
      res.status(400).json({ error: 'Email, username, and password are required' });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (existing) {
      res.status(409).json({ error: 'Email or username already in use' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, username, passwordHash, firstName, lastName },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
    });
  } catch (err) {
    logger.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        role: user.role,
      },
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, username: true, firstName: true, lastName: true, avatar: true, role: true, createdAt: true },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (err) {
    logger.error('Get me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/auth/profile
router.patch('/profile', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, username, avatar, bio, isPublic } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(firstName  !== undefined && { firstName }),
        ...(lastName   !== undefined && { lastName }),
        ...(username   !== undefined && { username }),
        ...(avatar     !== undefined && { avatar }),
        ...(bio        !== undefined && { bio }),
        ...(isPublic   !== undefined && { isPublic }),
      },
      select: {
        id: true, email: true, username: true, firstName: true,
        lastName: true, avatar: true, bio: true, isPublic: true, role: true,
      },
    });
    res.json({ user });
  } catch (err) {
    logger.error('Update profile error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current and new password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    logger.error('Change password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
