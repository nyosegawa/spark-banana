import type { BananaSuggestion } from './types';

export interface NanobananaConfig {
  apiKey?: string;
  model?: string;
}

const DEFAULT_MODEL = 'gemini-3-pro-image-preview';
const FETCH_TIMEOUT_MS = 90_000; // 90s per variation

const BASE_PROMPT = `You are a senior UI/UX designer. Given the screenshot of a UI and the user's instruction, generate an improved version of the UI as an image.

Rules:
1. Generate a NEW image showing the improved UI based on the instruction.
2. Keep the same general layout and dimensions unless the instruction asks for a redesign.
3. Make the improvement visually clear and polished.
4. Also provide a brief text description of what you changed (1-2 sentences).`;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
    finishReason?: string;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

/**
 * Lightweight Gemini-based UI image generator.
 * Sends a screenshot + instruction to Gemini's image generation API
 * and returns improved UI images.
 */
export class Nanobanana {
  private apiKey: string;
  private model: string;

  constructor(config: NanobananaConfig = {}) {
    const key = config.apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error(
        'Gemini API key is required. Pass it via config.apiKey or set the GEMINI_API_KEY environment variable.',
      );
    }
    this.apiKey = key;
    this.model = config.model || DEFAULT_MODEL;
    console.log(`   [nanobanana] Initialized (model: ${this.model}, key: ${key.slice(0, 6)}...)`);
  }

  async analyze(
    screenshotBase64: string,
    instruction: string,
    onProgress?: (message: string) => void,
    count: number = 3,
  ): Promise<BananaSuggestion[]> {
    const base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');
    const screenshotKB = Math.round(base64Data.length * 0.75 / 1024);
    console.log(`   [nanobanana] analyze() called — screenshot: ${screenshotKB}KB, instruction: "${instruction.slice(0, 60)}", count: ${count}`);
    onProgress?.(`Generating UI variation${count > 1 ? 's' : ''} (model: ${this.model})...`);

    const allVariations = [
      { label: 'A', emphasis: '' },
      { label: 'B', emphasis: 'Take a bolder, more creative approach. ' },
      { label: 'C', emphasis: 'Focus on minimal, subtle refinements. ' },
    ];
    const variations = allVariations.slice(0, count);

    console.log(`   [nanobanana] Launching ${variations.length} parallel image generations...`);

    const results = await Promise.allSettled(
      variations.map((v) =>
        this.generateImage(base64Data, instruction, v.emphasis, v.label, (msg) => {
          onProgress?.(`[${v.label}] ${msg}`);
        }),
      ),
    );

    // Report results
    const suggestions: BananaSuggestion[] = [];
    const errors: string[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const label = variations[i].label;
      if (result.status === 'fulfilled' && result.value) {
        console.log(`   [nanobanana] ✅ ${label}: image received (${Math.round(result.value.image.length / 1024)}KB)`);
        suggestions.push({
          id: `suggestion-${Date.now()}-${i}`,
          title: `Option ${label}`,
          description: result.value.description,
          image: result.value.image,
        });
      } else if (result.status === 'rejected') {
        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
        console.log(`   [nanobanana] ❌ ${label}: ${reason}`);
        errors.push(`${label}: ${reason}`);
        onProgress?.(`[${label}] Failed: ${reason.slice(0, 100)}`);
      }
    }

    if (suggestions.length === 0) {
      const detail = errors.join('; ');
      console.log(`   [nanobanana] All variations failed: ${detail}`);
      throw new Error(`All image generations failed. ${detail}`);
    }

    console.log(`   [nanobanana] ${suggestions.length}/${variations.length} variations succeeded`);
    onProgress?.(`Generated ${suggestions.length} UI variations.`);
    return suggestions;
  }

  private async generateImage(
    base64Data: string,
    instruction: string,
    emphasis: string,
    label: string,
    onProgress?: (message: string) => void,
  ): Promise<{ image: string; description: string }> {
    const prompt = `${BASE_PROMPT}

${emphasis}User instruction: "${instruction}"

Generate the improved UI image now.`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/png',
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    onProgress?.('Sending to Gemini...');
    console.log(`   [nanobanana] [${label}] POST ${this.model}:generateContent (payload: ${Math.round(JSON.stringify(requestBody).length / 1024)}KB)`);

    const startMs = Date.now();
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        throw new Error(`Gemini API timed out after ${elapsed}s`);
      }
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Gemini API request failed after ${elapsed}s: ${message}`);
    }

    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
    console.log(`   [nanobanana] [${label}] Response: ${response.status} (${elapsed}s)`);

    if (!response.ok) {
      let detail = '';
      try {
        const errBody = (await response.json()) as GeminiResponse;
        detail = errBody.error?.message || JSON.stringify(errBody);
      } catch {
        detail = await response.text();
      }
      throw new Error(`Gemini ${response.status}: ${detail.slice(0, 200)}`);
    }

    onProgress?.(`Response received (${elapsed}s), parsing...`);

    const data = (await response.json()) as GeminiResponse;

    // Dump raw response structure for debugging
    const rawCandidate = data.candidates?.[0];
    const rawParts = (rawCandidate as any)?.content?.parts;
    console.log(`   [nanobanana] [${label}] Raw response: finishReason=${rawCandidate?.finishReason}, partsCount=${rawParts?.length ?? 0}`);
    if (rawParts?.length) {
      for (let pi = 0; pi < rawParts.length; pi++) {
        const p = rawParts[pi];
        const keys = Object.keys(p);
        const preview = keys.map(k => {
          const v = p[k];
          if (typeof v === 'string') return `${k}: "${v.slice(0, 80)}${v.length > 80 ? '...' : ''}"`;
          if (typeof v === 'object' && v !== null) return `${k}: {${Object.keys(v).join(', ')}}`;
          return `${k}: ${v}`;
        }).join(', ');
        console.log(`   [nanobanana] [${label}] Part[${pi}] keys=[${keys.join(',')}] → ${preview}`);
      }
    }

    const candidate = data.candidates?.[0];

    if (!candidate?.content?.parts?.length) {
      const reason = candidate?.finishReason || 'no candidates';
      console.log(`   [nanobanana] [${label}] Empty response: finishReason=${reason}`);
      throw new Error(`Gemini returned empty response (${reason})`);
    }

    // Extract image and text from response parts
    let imageData = '';
    let description = '';
    const partTypes: string[] = [];

    for (const part of candidate.content.parts) {
      if (part.inlineData?.data) {
        imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        partTypes.push(`image(${part.inlineData.mimeType}, ${Math.round(part.inlineData.data.length / 1024)}KB)`);
      }
      if (part.text) {
        description += part.text;
        partTypes.push(`text(${part.text.length}chars)`);
      }
    }

    console.log(`   [nanobanana] [${label}] Parts: [${partTypes.join(', ')}]`);

    if (!imageData) {
      throw new Error(`Gemini did not return an image. Parts: ${partTypes.join(', ') || 'none'}`);
    }

    onProgress?.('Image generated!');
    return { image: imageData, description: description.trim() || 'UI improvement' };
  }

  /**
   * Compare original screenshot with generated target image and produce
   * a detailed, implementable description of the visual differences.
   * This is used to feed Codex (text-only) with enough detail to apply changes.
   */
  async describeDiff(
    originalBase64: string,
    targetBase64: string,
    instruction: string,
    onProgress?: (message: string) => void,
  ): Promise<string> {
    onProgress?.('Analyzing visual differences...');

    const origData = originalBase64.replace(/^data:image\/\w+;base64,/, '');
    const targetData = targetBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `You are a front-end engineer. Compare the ORIGINAL UI screenshot (first image) with the TARGET UI screenshot (second image).

The user requested: "${instruction}"

Produce a detailed, actionable description of EVERY visual difference. Be specific enough that a developer can implement the changes in code WITHOUT seeing the images. Include:
- Exact color changes (e.g. "background changed from #fff to #1a1a2e")
- Layout/spacing changes (e.g. "padding increased from ~8px to ~16px")
- Typography changes (font size, weight, color)
- New/removed/moved elements
- Border, shadow, border-radius changes
- Any other visual differences

Format as a numbered list. Be precise and exhaustive.`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/png', data: origData } },
            { inlineData: { mimeType: 'image/png', data: targetData } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'text/plain',
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    console.log(`   [nanobanana] describeDiff: POST ${this.model} (2 images)`);
    const startMs = Date.now();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
    console.log(`   [nanobanana] describeDiff: ${response.status} (${elapsed}s)`);

    if (!response.ok) {
      let detail = '';
      try {
        const errBody = (await response.json()) as GeminiResponse;
        detail = errBody.error?.message || JSON.stringify(errBody);
      } catch {
        detail = await response.text();
      }
      throw new Error(`Gemini describeDiff failed ${response.status}: ${detail.slice(0, 200)}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts
      ?.map(p => p.text ?? '')
      .join('')
      .trim();

    if (!text) {
      throw new Error('Gemini describeDiff returned empty text');
    }

    console.log(`   [nanobanana] describeDiff: ${text.length} chars`);
    onProgress?.('Visual diff analysis complete.');
    return text;
  }
}
