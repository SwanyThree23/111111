import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';
import { prisma } from './db.js';
import redis from './redis.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const WARN_THRESHOLD = 0.50;
const HIDE_THRESHOLD = 0.75;
const BAN_THRESHOLD = 0.95;

const inFlight = new Map<string, Promise<ModerationResult>>();

export interface ModerationResult {
  score: number;
  action: 'allow' | 'warn' | 'hide' | 'ban';
  reason?: string;
}

export async function moderateMessage(
  messageId: string,
  streamId: string,
  content: string,
  userId?: string
): Promise<ModerationResult> {
  const hash = createHash('sha256').update(content).digest('hex');
  const cacheKey = `guardian:${hash}`;

  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    const result = JSON.parse(cached) as ModerationResult;
    await logGuardianEvent(messageId, streamId, hash, result, null);
    return result;
  }

  // Dedup in-flight requests
  if (inFlight.has(hash)) {
    return inFlight.get(hash)!;
  }

  const promise = runModeration(messageId, streamId, hash, content, userId);
  inFlight.set(hash, promise);

  try {
    return await promise;
  } finally {
    inFlight.delete(hash);
  }
}

async function runModeration(
  messageId: string,
  streamId: string,
  hash: string,
  content: string,
  userId?: string
): Promise<ModerationResult> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `You are a content moderation system. Evaluate this chat message for a live streaming platform.

Message: "${content}"

Respond with ONLY a JSON object: {"score": 0.0-1.0, "reason": "brief reason"}
Score guidelines:
- 0.0-0.49: Safe content, allow
- 0.50-0.74: Borderline, warn
- 0.75-0.94: Inappropriate, hide
- 0.95-1.0: Severely harmful, ban user`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{"score": 0}';
    const parsed = JSON.parse(text.match(/\{.*\}/s)?.[0] ?? '{"score": 0}');
    const score = Math.min(1, Math.max(0, parsed.score ?? 0));

    const action = score >= BAN_THRESHOLD ? 'ban'
      : score >= HIDE_THRESHOLD ? 'hide'
      : score >= WARN_THRESHOLD ? 'warn'
      : 'allow';

    const result: ModerationResult = { score, action, reason: parsed.reason };

    await redis.set(`guardian:${hash}`, JSON.stringify(result), 'EX', 300);
    await logGuardianEvent(messageId, streamId, hash, result, response);

    if (action === 'hide' || action === 'ban') {
      await prisma.chatMessage.update({
        where: { id: messageId },
        data: { isDeleted: true, moderationScore: score },
      });
    } else {
      await prisma.chatMessage.update({
        where: { id: messageId },
        data: { moderationScore: score },
      });
    }

    return result;
  } catch (err) {
    // Fail-open: allow message through on AI failure
    const result: ModerationResult = { score: 0, action: 'allow' };
    await logGuardianEvent(messageId, streamId, hash, result, null, err as Error);
    return result;
  }
}

async function logGuardianEvent(
  messageId: string,
  streamId: string,
  contentHash: string,
  result: ModerationResult,
  modelResponse: unknown,
  error?: Error
): Promise<void> {
  await prisma.guardianEvent.create({
    data: {
      streamId,
      messageId,
      contentHash,
      score: result.score,
      action: result.action,
      modelResponse: modelResponse ? (modelResponse as object) : (error ? { error: error.message } : null),
    },
  });
}
