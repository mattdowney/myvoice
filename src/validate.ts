import matter from 'gray-matter';

export const AI_WORDS = [
  'delve', 'tapestry', 'vibrant', 'landscape', 'pivotal', 'testament',
  'underscore', 'foster', 'garner', 'showcase', 'interplay', 'intricate',
  'intricacies', 'enduring', 'groundbreaking', 'nestled', 'breathtaking',
  'revolutionize', 'transformative', 'cutting-edge', 'robust', 'seamless',
  'holistic', 'comprehensive', 'actionable', 'leverage', 'utilize',
  'spearhead', 'facilitate', 'empower', 'streamline',
];

export const FORBIDDEN_PHRASES = [
  "here's the thing",
  "here's the kicker",
  "when it comes to",
  "it's worth noting",
  "in today's fast-paced",
  "at the end of the day",
  "the bottom line is",
  "let's dive in",
  "let's unpack",
  "let's explore",
  "that being said",
  "having said that",
  "with that in mind",
  "moving forward",
  "sound good?",
  "in order to",
  "it bears mentioning",
  "it should be noted",
  "it goes without saying",
  "needless to say",
  "moreover",
  "furthermore",
  "additionally",
  "in conclusion",
  "but the real challenge?",
  "in an era of",
  "in the ever-evolving",
  "as we navigate",
  "in the realm of",
  "this serves as",
  "this speaks volumes",
  "this underscores",
  "this highlights the need",
  "this is a game-changer",
];

export interface ValidationResult {
  passed: boolean;
  warnings: string[];
}

export function validate(original: string, rewritten: string): ValidationResult {
  const warnings: string[] = [];
  const hasFrontmatter = original.trimStart().startsWith('---');

  if (hasFrontmatter) {
    let origData: Record<string, unknown>;
    let rewriteData: Record<string, unknown>;
    try {
      origData = matter(original).data;
      rewriteData = matter(rewritten).data;
    } catch {
      return { passed: false, warnings: ['Failed to parse frontmatter'] };
    }

    if (!rewritten.startsWith('---')) {
      warnings.push('Missing opening frontmatter delimiter');
    }

    if (origData.title !== rewriteData.title) {
      warnings.push(`Title changed: "${origData.title}" -> "${rewriteData.title}"`);
    }
    if (String(origData.date) !== String(rewriteData.date)) {
      warnings.push('Date changed');
    }
    if (JSON.stringify(origData.tags) !== JSON.stringify(rewriteData.tags)) {
      warnings.push('Tags changed');
    }
  }

  // Get content (body only if frontmatter, otherwise full text)
  const rewriteContent = hasFrontmatter ? matter(rewritten).content : rewritten;

  // Check for remaining em dashes
  const emDashCount = (rewriteContent.match(/\u2014/g) || []).length;
  if (emDashCount > 0) {
    warnings.push(`${emDashCount} em dashes remain`);
  }

  // Check for AI vocabulary
  const contentLower = rewriteContent.toLowerCase();
  const foundAiWords = AI_WORDS.filter((w) => {
    const regex = new RegExp(`\\b${w}\\b`, 'i');
    return regex.test(contentLower);
  });
  if (foundAiWords.length > 0) {
    warnings.push(`AI words found: ${foundAiWords.join(', ')}`);
  }

  // Check for forbidden phrases
  const foundPhrases = FORBIDDEN_PHRASES.filter((p) => contentLower.includes(p));
  if (foundPhrases.length > 0) {
    warnings.push(`Forbidden phrases found: ${foundPhrases.map(p => `"${p}"`).join(', ')}`);
  }

  // Check image URLs preserved
  const origImages = original.match(/!\[.*?\]\(.*?\)/g) || [];
  const rewriteImages = rewritten.match(/!\[.*?\]\(.*?\)/g) || [];
  const origImageUrls = origImages.map((m) => m.match(/\((.*?)\)/)?.[1]).filter(Boolean);
  const rewriteImageUrls = rewriteImages.map((m) => m.match(/\((.*?)\)/)?.[1]).filter(Boolean);
  for (const url of origImageUrls) {
    if (!rewriteImageUrls.includes(url)) {
      warnings.push(`Missing image URL: ${url}`);
    }
  }

  // Check ALL links preserved
  const linkUrlRegex = /\[.*?\]\((https?:\/\/[^)]+)\)/g;
  const origLinks = new Set<string>();
  const rewriteLinks = new Set<string>();
  let match;
  while ((match = linkUrlRegex.exec(original)) !== null) {
    origLinks.add(match[1]);
  }
  linkUrlRegex.lastIndex = 0;
  while ((match = linkUrlRegex.exec(rewritten)) !== null) {
    rewriteLinks.add(match[1]);
  }
  const missingLinks: string[] = [];
  for (const url of origLinks) {
    if (!rewriteLinks.has(url)) {
      missingLinks.push(url);
    }
  }
  if (missingLinks.length > 0) {
    warnings.push(`Missing ${missingLinks.length} link(s): ${missingLinks.join(', ')}`);
  }

  // Check word count within range
  const origWords = original.split(/\s+/).length;
  const rewriteWords = rewritten.split(/\s+/).length;
  const ratio = rewriteWords / origWords;
  if (ratio < 0.75) {
    warnings.push(`Word count too low: ${rewriteWords} vs ${origWords} (${Math.round(ratio * 100)}%)`);
  } else if (ratio > 1.2) {
    warnings.push(`Word count too high: ${rewriteWords} vs ${origWords} (${Math.round(ratio * 100)}%)`);
  }

  const hasBlocker = warnings.some(
    (w) =>
      w.includes('Failed to parse') ||
      w.includes('Missing opening frontmatter') ||
      w.includes('Title changed') ||
      w.includes('Date changed') ||
      w.includes('Missing image URL') ||
      (w.includes('Missing') && w.includes('link(s)')) ||
      w.includes('Forbidden phrases found') ||
      w.includes('Word count too low') ||
      w.includes('Word count too high')
  );

  return { passed: !hasBlocker, warnings };
}
