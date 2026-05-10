import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest, optionalAuth } from '../middleware/auth';
import { saveWatchPartyState, getWatchPartyState, getChatHistory } from '../services/supabase';
import { liveKitService } from '../services/livekit-service';
import { logger } from '../config/logger';

const router = Router();

// YouTube channel data — Fanbase Network creators
const FEATURED_CHANNELS = [
  {
    id: 'memoirsofashygirl',
    name: 'Memoirs of a Shy Girl',
    handle: '@memoirsofashygirl',
    url: 'https://youtube.com/@memoirsofashygirl',
    fanbaseUrl: 'https://fanbase.app.link/aFLSLHFDe2b',
    category: 'storytelling',
    avatar: 'https://yt3.googleusercontent.com/ytc/memoirsofashygirl',
  },
  {
    id: '2mg-2026',
    name: '2MG-2026',
    handle: '@2mg-2026',
    url: 'https://youtube.com/@2mg-2026',
    fanbaseUrl: 'https://fanbase.app.link/nR0eOqEDe2b',
    category: 'music-medicine',
    avatar: 'https://yt3.googleusercontent.com/ytc/2mg2026',
  },
  {
    id: 'dominoentertainment',
    name: 'Domino Entertainment',
    handle: '@dominoentertainment5513',
    url: 'https://youtube.com/@dominoentertainment5513',
    category: 'creator-economy',
    avatar: 'https://yt3.googleusercontent.com/ytc/dominoentertainment',
  },
];

// ─── Featured Channels ────────────────────────────────────────────────────────

router.get('/channels', async (req, res) => {
  res.json({ channels: FEATURED_CHANNELS });
});

// ─── YouTube Video Search ─────────────────────────────────────────────────────

router.get('/youtube/search', authenticateToken, async (req, res) => {
  try {
    const query = req.query.q as string;
    const channelId = req.query.channelId as string;

    if (!query && !channelId) {
      return res.status(400).json({ error: 'query or channelId required' });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      // Return mock data when no API key is configured
      return res.json({
        videos: [
          {
            id: 'dQw4w9WgXcQ',
            title: 'Hip Hop Biochemistry with Dr. Muk',
            channelTitle: 'STEAMulater',
            thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
            publishedAt: new Date().toISOString(),
          },
        ],
        note: 'Configure YOUTUBE_API_KEY for live results',
      });
    }

    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      key: apiKey,
      maxResults: '20',
      ...(query && { q: query }),
      ...(channelId && { channelId }),
    });

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${params}`
    );

    if (!response.ok) throw new Error(`YouTube API error: ${response.status}`);

    const data = await response.json() as any;
    const videos = data.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.high.url,
      publishedAt: item.snippet.publishedAt,
      description: item.snippet.description,
    }));

    res.json({ videos });
  } catch (error) {
    logger.error('YouTube search error:', error);
    res.status(500).json({ error: 'Failed to search YouTube' });
  }
});

// ─── Watch Party Room ─────────────────────────────────────────────────────────

router.post('/rooms', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      name: z.string(),
      maxParticipants: z.number().max(20).default(20),
      videoId: z.string().optional(),
    });

    const data = schema.parse(req.body);
    const roomName = `watch-${Date.now()}-${req.user!.id.slice(0, 6)}`;

    const [livekitToken, room] = await Promise.all([
      liveKitService.generateToken({
        roomName,
        participantName: req.user!.email.split('@')[0],
        participantId: req.user!.id,
        isHost: true,
      }),
      liveKitService.createRoom(roomName, data.maxParticipants),
    ]);

    if (data.videoId) {
      await saveWatchPartyState(roomName, {
        videoId: data.videoId,
        isPlaying: false,
        currentTime: 0,
        hostId: req.user!.id,
      });
    }

    res.status(201).json({
      roomName,
      livekitToken,
      hostId: req.user!.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    logger.error('Create watch party error:', error);
    res.status(500).json({ error: 'Failed to create watch party room' });
  }
});

router.post('/rooms/:roomName/join', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const token = liveKitService.generateToken({
      roomName: req.params.roomName,
      participantName: req.user!.email.split('@')[0],
      participantId: req.user!.id,
      isHost: false,
    });

    const [state, history] = await Promise.all([
      getWatchPartyState(req.params.roomName),
      getChatHistory(req.params.roomName),
    ]);

    res.json({ token, state, chatHistory: history });
  } catch (error) {
    logger.error('Join watch party error:', error);
    res.status(500).json({ error: 'Failed to join watch party' });
  }
});

router.put('/rooms/:roomName/state', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      videoId: z.string(),
      isPlaying: z.boolean(),
      currentTime: z.number(),
    });

    const data = schema.parse(req.body);

    await saveWatchPartyState(req.params.roomName, {
      ...data,
      hostId: req.user!.id,
    });

    res.json({ updated: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update state' });
  }
});

router.get('/rooms/:roomName/state', optionalAuth, async (req, res) => {
  try {
    const state = await getWatchPartyState(req.params.roomName);
    res.json({ state });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get state' });
  }
});

// ─── Room Info (state + meta in one call) ─────────────────────────────────────

router.get('/rooms/:roomName', optionalAuth, async (req, res) => {
  try {
    const [state] = await Promise.all([
      getWatchPartyState(req.params.roomName),
    ]);
    // Meta is stored alongside state; fall back to defaults
    const meta = (state as any)?.meta || {
      name: req.params.roomName,
      maxParticipants: 20,
      accent: 'burgundy',
      layout: 'auto',
      isLocked: false,
    };
    res.json({ state, meta });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get room' });
  }
});

// ─── Room Meta Update ─────────────────────────────────────────────────────────

router.put('/rooms/:roomName/meta', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      name:            z.string().max(60).optional(),
      maxParticipants: z.number().min(2).max(20).optional(),
      accent:          z.enum(['burgundy', 'gold', 'teal', 'violet']).optional(),
      layout:          z.enum(['auto', 'spotlight', 'cinema', 'split']).optional(),
      isLocked:        z.boolean().optional(),
    });
    const data = schema.parse(req.body);

    // Persist meta alongside watch state
    const existing = await getWatchPartyState(req.params.roomName);
    await saveWatchPartyState(req.params.roomName, {
      ...(existing || { videoId: null, isPlaying: false, currentTime: 0, hostId: req.user!.id }),
      meta: { ...((existing as any)?.meta || {}), ...data },
    } as any);

    res.json({ updated: true });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: 'Failed to update room meta' });
  }
});

export default router;
