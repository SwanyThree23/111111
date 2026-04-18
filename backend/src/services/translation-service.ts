import { logger } from '../config/logger';

// Supported languages for the platform
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  pt: 'Portuguese',
  de: 'German',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
  hi: 'Hindi',
};

class TranslationService {
  private apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || '';

  // ─── Text Translation ─────────────────────────────────────────────────

  async translateText(text: string, targetLang: string, sourceLang?: string): Promise<{
    translatedText: string;
    detectedLanguage?: string;
  }> {
    if (!this.apiKey) {
      logger.warn('Google Translate API key not configured, returning original text');
      return { translatedText: text };
    }

    try {
      const params = new URLSearchParams({
        q: text,
        target: targetLang,
        key: this.apiKey,
        format: 'text',
        ...(sourceLang && { source: sourceLang }),
      });

      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?${params}`
      );

      if (!response.ok) throw new Error(`Translation API error: ${response.status}`);

      const data = await response.json() as any;
      const translated = data.data.translations[0];

      return {
        translatedText: translated.translatedText,
        detectedLanguage: translated.detectedSourceLanguage,
      };
    } catch (error) {
      logger.error('Translation failed:', error);
      return { translatedText: text };
    }
  }

  async detectLanguage(text: string): Promise<string> {
    if (!this.apiKey) return 'en';

    try {
      const params = new URLSearchParams({ q: text, key: this.apiKey });
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2/detect?${params}`
      );

      if (!response.ok) return 'en';

      const data = await response.json() as any;
      return data.data.detections[0][0].language;
    } catch {
      return 'en';
    }
  }

  // ─── Wisprflow Transcription ──────────────────────────────────────────

  async transcribeAudio(audioBuffer: Buffer, lang = 'en'): Promise<{
    transcript: string;
    confidence: number;
    words?: { word: string; start: number; end: number }[];
  }> {
    const wisprKey = process.env.WISPRFLOW_API_KEY;

    if (!wisprKey) {
      logger.warn('Wisprflow API key not configured');
      return { transcript: '', confidence: 0 };
    }

    try {
      const formData = new FormData();
      formData.append('audio', new Blob([audioBuffer], { type: 'audio/webm' }), 'audio.webm');
      formData.append('language', lang);

      const response = await fetch('https://api.wisprflow.ai/v1/transcribe', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${wisprKey}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error(`Wisprflow error: ${response.status}`);

      const data = await response.json() as any;

      return {
        transcript: data.transcript || '',
        confidence: data.confidence || 0,
        words: data.words,
      };
    } catch (error) {
      logger.error('Transcription failed:', error);
      return { transcript: '', confidence: 0 };
    }
  }

  // ─── Batch Translate Chat Messages ────────────────────────────────────

  async translateChatMessage(message: string, targetLang: string) {
    const detected = await this.detectLanguage(message);

    if (detected === targetLang) {
      return { translatedText: message, detectedLanguage: detected, wasSameLanguage: true };
    }

    const result = await this.translateText(message, targetLang, detected);
    return { ...result, wasSameLanguage: false };
  }
}

export const translationService = new TranslationService();
