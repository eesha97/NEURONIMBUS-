'use server';
/**
 * @fileOverview Extracts keywords from memory captions using a fallback algorithm
 * (stopword removal and noun detection) or, if available, a more sophisticated LLM.
 *
 * - extractKeywords - Extracts keywords from memory captions.
 * - ExtractKeywordsInput - The input type for the extractKeywords function.
 * - ExtractKeywordsOutput - The return type for the extractKeywords function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractKeywordsInputSchema = z.object({
  caption: z.string().describe('The caption of the memory.'),
});
export type ExtractKeywordsInput = z.infer<typeof ExtractKeywordsInputSchema>;

// Changed schema to a string for the AI's direct output
const ExtractKeywordsAIOutputSchema = z.string().describe('The space-dot-space separated keywords.');

const ExtractKeywordsOutputSchema = z.object({
  keywords: z.array(z.string()).describe('The extracted keywords.'),
});
export type ExtractKeywordsOutput = z.infer<typeof ExtractKeywordsOutputSchema>;

export async function extractKeywords(input: ExtractKeywordsInput): Promise<ExtractKeywordsOutput> {
  return extractKeywordsFlow(input);
}

const keywordExtractionPrompt = ai.definePrompt({
  name: 'keywordExtractionPrompt',
  input: { schema: ExtractKeywordsInputSchema },
  output: { format: 'text' }, // Use text format to get raw string output
  prompt: `You are a keyword extraction module for the NeuroNimbus memory reconstruction system.

Your job is to return ONLY keywords.

Strict Output Rules:
- Extract 3 to 6 important keywords.
- Use TF-IDF style importance.
- Remove stopwords.
- Do not include common emotional words (happy, fun, nice, good).
- Prefer nouns, locations, events, and proper names.
- All keywords must be lowercase.
- Output must be in a single line.
- Separate keywords using " • " (space dot space).
- Do NOT explain.
- Do NOT repeat the caption.
- Do NOT add extra text.
- If no keywords found, return: none

Memory Caption:
{{{caption}}}`,
});

const extractKeywordsFlow = ai.defineFlow(
  {
    name: 'extractKeywordsFlow',
    inputSchema: ExtractKeywordsInputSchema,
    outputSchema: ExtractKeywordsOutputSchema,
  },
  async input => {
    try {
      const { text } = await keywordExtractionPrompt(input);

      if (!text || text.trim().toLowerCase() === 'none') {
        return { keywords: [] };
      }

      // Split the dot-separated string back into an array
      const keywords = text
        .split(' • ')
        .map(k => k.trim().toLowerCase())
        .filter(k => k !== '');

      return { keywords: keywords.slice(0, 6) }; // Ensure max 6
    } catch (e) {
      console.error('Error extracting keywords with LLM, falling back to default extraction:', e);

      // Fallback keyword extraction (enhanced to better match the new rules)
      const caption = input.caption.toLowerCase();
      const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'and', 'or', 'but', 'not', 'for', 'of', 'at', 'by', 'to', 'from', 'in', 'on', 'with', 'my', 'me', 'i', 'you', 'your', 'we', 'us', 'our', 'during']);
      const emotionalWords = new Set(['happy', 'fun', 'nice', 'good', 'sad', 'great', 'lovely', 'beautiful', 'wonderful']);

      const words = caption.split(/\W+/);
      const keywords = [...new Set(words)]
        .filter(word => word.length > 2)
        .filter(word => !stopWords.has(word))
        .filter(word => !emotionalWords.has(word))
        .filter(word => /^[a-z]+$/.test(word));

      return { keywords: keywords.slice(0, 6) };
    }
  }
);
