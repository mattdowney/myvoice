import fs from 'fs';
import path from 'path';
import os from 'os';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from './prompt.js';
import { validate, type ValidationResult } from './validate.js';
import { stripCodeFence } from './utils.js';

export const DEFAULT_MODEL = 'opus';

export const MODELS: Record<string, string> = {
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-20250514',
};

function loadApiKey(): string {
  // Check env first
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  // Fallback: ~/.config/anthropic/.env
  const envPath = path.join(os.homedir(), '.config', 'anthropic', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/^ANTHROPIC_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  }

  console.error('Missing ANTHROPIC_API_KEY. Set it in your environment or in ~/.config/anthropic/.env');
  process.exit(1);
}

export async function processPost(
  content: string,
  model: string,
  maxRetries = 3
): Promise<{ text: string; result: ValidationResult }> {
  const apiKey = loadApiKey();

  const anthropic = new Anthropic({ apiKey });

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `Rewrite this blog post to remove AI patterns and match the author's voice. Return the complete markdown file:\n\n${content}`,
    },
  ];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from API');
    }

    const text = stripCodeFence(textBlock.text);
    const result = validate(content, text);

    if (result.passed || attempt === maxRetries) {
      return { text, result };
    }

    // Feed validation errors back for retry
    const failureMsg = `Validation failed: ${result.warnings.join('; ')}. Please fix these issues and return the complete rewritten markdown file again.`;
    messages.push(
      { role: 'assistant', content: textBlock.text },
      { role: 'user', content: failureMsg }
    );

    process.stderr.write(`  retry ${attempt + 1}...\n`);
    await new Promise((r) => setTimeout(r, 300));
  }

  throw new Error('Unexpected end of retry loop');
}
