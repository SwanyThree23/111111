import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '../server';
import { logger } from '../config/logger';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';

class AIOrchestrator {
  async moderateChat(
    message: string,
    username: string,
    context?: string
  ): Promise<{ action: 'ALLOW' | 'BLOCK' | 'WARN'; reason: string; confidence: number }> {
    const job = await prisma.aiJob.create({
      data: { type: 'moderation', status: 'pending', input: { message, username, context: context || '' } },
    });

    try {
      const prompt = `You are a chat moderation AI. Analyze the following chat message and decide whether to ALLOW, WARN, or BLOCK it.

Username: ${username}
Message: ${message}
${context ? `Context: ${context}` : ''}

Respond with a JSON object containing:
- action: "ALLOW", "WARN", or "BLOCK"
- reason: brief explanation
- confidence: number between 0 and 1

Only respond with valid JSON, no other text.`;

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
      const result = JSON.parse(text);

      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'completed', output: result, completedAt: new Date() },
      });

      return result;
    } catch (err: any) {
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'error', error: err.message, completedAt: new Date() },
      });
      logger.error('Moderation error:', err);
      return { action: 'ALLOW', reason: 'Moderation service unavailable', confidence: 0 };
    }
  }

  async generateAvatar(script: string, avatarId: string): Promise<{ videoId?: string; status: string; error?: string }> {
    const job = await prisma.aiJob.create({
      data: { type: 'avatar', status: 'pending', input: { script, avatarId } },
    });

    try {
      if (!HEYGEN_API_KEY) {
        throw new Error('HeyGen API key not configured');
      }

      const response = await fetch('https://api.heygen.com/v2/video/generate', {
        method: 'POST',
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_inputs: [{
            character: { type: 'avatar', avatar_id: avatarId },
            voice: { type: 'text', input_text: script, voice_id: 'default' },
          }],
          dimension: { width: 1280, height: 720 },
        }),
      });

      const data = await response.json() as { data?: { video_id?: string } };
      const videoId = data?.data?.video_id;

      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'processing', output: { videoId }, completedAt: new Date() },
      });

      return { videoId, status: 'processing' };
    } catch (err: any) {
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'error', error: err.message, completedAt: new Date() },
      });
      logger.error('Generate avatar error:', err);
      return { status: 'error', error: err.message };
    }
  }

  async generateStreamSummary(streamId: string): Promise<string> {
    const job = await prisma.aiJob.create({
      data: { type: 'summary', status: 'pending', input: { streamId } },
    });

    try {
      const stream = await prisma.stream.findUnique({
        where: { id: streamId },
        include: {
          chatMessages: { orderBy: { timestamp: 'asc' }, take: 100 },
          stats: { orderBy: { timestamp: 'desc' }, take: 1 },
        },
      });

      if (!stream) throw new Error('Stream not found');

      const chatSample = stream.chatMessages
        .slice(0, 20)
        .map((m) => `${m.username}: ${m.message}`)
        .join('\n');

      const prompt = `Summarize the following live stream session in 2-3 paragraphs:

Stream Title: ${stream.title}
${stream.description ? `Description: ${stream.description}` : ''}
Status: ${stream.status}
${stream.startedAt ? `Started: ${stream.startedAt.toISOString()}` : ''}
${stream.endedAt ? `Ended: ${stream.endedAt.toISOString()}` : ''}

Recent chat messages:
${chatSample || 'No chat messages'}

Write an engaging summary suitable for a stream recap.`;

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });

      const summary = response.content[0].type === 'text' ? response.content[0].text : '';

      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'completed', output: { summary }, completedAt: new Date() },
      });

      return summary;
    } catch (err: any) {
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'error', error: err.message, completedAt: new Date() },
      });
      logger.error('Generate summary error:', err);
      throw err;
    }
  }

  async enhanceDescription(title: string, description: string): Promise<string> {
    const job = await prisma.aiJob.create({
      data: { type: 'enhance', status: 'pending', input: { title, description } },
    });

    try {
      const prompt = `You are a creative copywriter for live streaming content. Enhance the following stream description to be more engaging and SEO-friendly. Keep it under 200 words.

Stream Title: ${title}
Current Description: ${description || '(none provided)'}

Write only the enhanced description, no other text.`;

      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      });

      const enhanced = response.content[0].type === 'text' ? response.content[0].text : description;

      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'completed', output: { enhanced }, completedAt: new Date() },
      });

      return enhanced;
    } catch (err: any) {
      await prisma.aiJob.update({
        where: { id: job.id },
        data: { status: 'error', error: err.message, completedAt: new Date() },
      });
      logger.error('Enhance description error:', err);
      throw err;
    }
  }
}

export const aiOrchestrator = new AIOrchestrator();
