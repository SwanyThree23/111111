import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { liveKitService } from '../services/livekit-service';
import { saveModAction, getBannedUsers, getChatHistory, saveChatMessage } from '../services/supabase';
import { translationService } from '../services/translation-service';
import { logger } from '../config/logger';

const router = Router();

// ─── Token Generation ─────────────────────────────────────────────────────────

router.post('/token', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      roomName: z.string(),
      isHost: z.boolean().optional(),
    });
    const data = schema.parse(req.body);

    const token = liveKitService.generateToken({
      roomName: data.roomName,
      participantName: req.user!.email.split('@')[0],
      participantId: req.user!.id,
      isHost: data.isHost ?? req.user!.role === 'admin',
      canPublish: true,
      canSubscribe: true,
      canScreenShare: true,
    });

    res.json(token);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    logger.error('Token generation error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// ─── Room Management ──────────────────────────────────────────────────────────

router.post('/rooms', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      roomName: z.string(),
      maxParticipants: z.number().max(100).optional(),
    });
    const data = schema.parse(req.body);
    const room = await liveKitService.createRoom(data.roomName, data.maxParticipants);
    res.json({ room });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

router.get('/rooms/:roomName/participants', authenticateToken, async (req, res) => {
  try {
    const participants = await liveKitService.getRoomParticipants(req.params.roomName);
    res.json({ participants });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get participants' });
  }
});

// ─── Host Moderation ──────────────────────────────────────────────────────────

router.post('/rooms/:roomName/kick', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({ participantId: z.string(), reason: z.string().optional() });
    const data = schema.parse(req.body);

    await liveKitService.kickParticipant(req.params.roomName, data.participantId);

    await saveModAction({
      roomId: req.params.roomName,
      moderatorId: req.user!.id,
      targetUserId: data.participantId,
      targetUsername: data.participantId,
      action: 'ban',
      reason: data.reason,
    });

    res.json({ message: 'Participant removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to kick participant' });
  }
});

router.post('/rooms/:roomName/ban', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      targetUserId: z.string(),
      targetUsername: z.string(),
      reason: z.string().optional(),
    });
    const data = schema.parse(req.body);

    await saveModAction({
      roomId: req.params.roomName,
      moderatorId: req.user!.id,
      targetUserId: data.targetUserId,
      targetUsername: data.targetUsername,
      action: 'ban',
      reason: data.reason,
    });

    res.json({ message: 'User banned' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

router.get('/rooms/:roomName/banned', authenticateToken, async (req, res) => {
  const banned = await getBannedUsers(req.params.roomName);
  res.json({ banned });
});

// ─── RTMP Ingress for OBS ─────────────────────────────────────────────────────

router.post('/rtmp-ingress', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({ streamId: z.string() });
    const data = schema.parse(req.body);
    const ingress = liveKitService.generateRtmpIngress(data.streamId);
    res.json({ ingress });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate RTMP ingress' });
  }
});

// ─── Chat History (Supabase) ──────────────────────────────────────────────────

router.get('/chat/:roomId/history', authenticateToken, async (req, res) => {
  try {
    const history = await getChatHistory(req.params.roomId, 200);
    res.json({ messages: history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

router.post('/chat/:roomId/message', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      text: z.string().max(500),
      platform: z.string().default('app'),
      translateTo: z.string().optional(),
    });
    const data = schema.parse(req.body);

    let translatedText: string | undefined;
    let originalLang: string | undefined;

    if (data.translateTo) {
      const result = await translationService.translateChatMessage(data.text, data.translateTo);
      translatedText = result.translatedText;
      originalLang = result.detectedLanguage;
    }

    const message = await saveChatMessage(req.params.roomId, {
      username: req.user!.email.split('@')[0],
      userId: req.user!.id,
      text: data.text,
      platform: data.platform,
      isTranslated: !!translatedText,
      translatedText,
      originalLang,
    });

    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// ─── Transcription ────────────────────────────────────────────────────────────

router.post('/transcribe', authenticateToken, async (req, res) => {
  try {
    const schema = z.object({
      lang: z.string().default('en'),
      translateTo: z.string().optional(),
    });
    const data = schema.parse(req.body);

    if (!req.body.audio) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    const audioBuffer = Buffer.from(req.body.audio, 'base64');
    const result = await translationService.transcribeAudio(audioBuffer, data.lang);

    let translation;
    if (result.transcript && data.translateTo) {
      translation = await translationService.translateText(result.transcript, data.translateTo);
    }

    res.json({ transcription: result, translation });
  } catch (error) {
    res.status(500).json({ error: 'Transcription failed' });
  }
});

router.post('/translate', authenticateToken, async (req, res) => {
  try {
    const schema = z.object({
      text: z.string(),
      targetLang: z.string(),
      sourceLang: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const result = await translationService.translateText(data.text, data.targetLang, data.sourceLang);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Translation failed' });
  }
});

export default router;
