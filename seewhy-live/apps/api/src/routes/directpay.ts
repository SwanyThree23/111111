import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { prisma } from '../services/db.js';

const router = Router();

const PLATFORM_URL_TEMPLATES: Record<string, (handle: string) => string> = {
  paypal:  (h) => `https://paypal.me/${h}`,
  cashapp: (h) => `https://cash.app/$${h}`,
  venmo:   (h) => `https://venmo.com/${h}`,
  zelle:   (h) => h, // phone or email — user provides directly
  chime:   (h) => `https://pay.chime.me/${h}`,
};

const SUPPORTED_PLATFORMS = Object.keys(PLATFORM_URL_TEMPLATES);

// Get all direct pay links for a creator (public)
router.get('/creator/:creatorId', async (req, res) => {
  const links = await prisma.directPayLink.findMany({
    where: { creatorId: req.params.creatorId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  return res.json(links);
});

// Get my links
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const links = await prisma.directPayLink.findMany({
    where: { creatorId: req.user!.id },
    orderBy: { createdAt: 'asc' },
  });
  return res.json(links);
});

// Upsert a link for a platform
router.put('/:platform', authenticate, async (req: AuthRequest, res: Response) => {
  const { platform } = req.params;
  const { handle } = req.body as { handle: string };

  if (!SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: `Unsupported platform. Use: ${SUPPORTED_PLATFORMS.join(', ')}` });
  }
  if (!handle?.trim()) {
    return res.status(400).json({ error: 'handle required' });
  }

  const url = PLATFORM_URL_TEMPLATES[platform]?.(handle.trim()) ?? null;

  const link = await prisma.directPayLink.upsert({
    where: { creatorId_platform: { creatorId: req.user!.id, platform } },
    create: { creatorId: req.user!.id, platform, handle: handle.trim(), url },
    update: { handle: handle.trim(), url, isActive: true },
  });
  return res.json(link);
});

// Toggle active state
router.patch('/:platform/toggle', authenticate, async (req: AuthRequest, res: Response) => {
  const link = await prisma.directPayLink.findUnique({
    where: { creatorId_platform: { creatorId: req.user!.id, platform: req.params.platform } },
  });
  if (!link) return res.status(404).json({ error: 'Not found' });

  const updated = await prisma.directPayLink.update({
    where: { id: link.id },
    data: { isActive: !link.isActive },
  });
  return res.json(updated);
});

// Delete a link
router.delete('/:platform', authenticate, async (req: AuthRequest, res: Response) => {
  await prisma.directPayLink.deleteMany({
    where: { creatorId: req.user!.id, platform: req.params.platform },
  });
  return res.json({ ok: true });
});

export default router;
