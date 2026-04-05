/**
 * Formatting utilities for AI-generated summaries and markdown-like text.
 */

/**
 * Escape HTML special characters to prevent XSS.
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Convert simple markdown formatting to HTML.
 * Supports **bold** and *italic*.
 * Also converts line breaks to <br>.
 * Does NOT support nested formatting.
 */
export function markdownToHtml(text: string): string {
  if (!text) return '';

  // Escape HTML first
  let html = escapeHtml(text);

  // Convert line breaks
  html = html.replace(/\n/g, '<br />');

  // Convert **bold** (non-greedy match)
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Convert *italic* (non-greedy match)
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Note: if we need to handle underscores, add here.

  return html;
}

/**
 * Convert markdown to plain text with formatting removed (e.g., strip ** and *).
 */
export function stripMarkdown(text: string): string {
  if (!text) return '';
  return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
}

/**
 * Generate React PDF compatible fragments from markdown text.
 * Returns an array of objects that can be used to build Text components.
 * For simplicity, we'll return an array of strings with optional bold flag.
 * This is a basic implementation; can be enhanced.
 */
export function markdownToPdfFragments(text: string): Array<{ text: string; bold?: boolean; italic?: boolean }> {
  const fragments: Array<{ text: string; bold?: boolean; italic?: boolean }> = [];
  let remaining = text;

  // Simple tokenization for ** and *
  // This is a naive implementation; for production consider a proper parser.
  const boldRegex = /\*\*(.*?)\*\*/;
  const italicRegex = /\*(.*?)\*/;

  while (remaining.length > 0) {
    const boldMatch = boldRegex.exec(remaining);
    const italicMatch = italicRegex.exec(remaining);

    // Determine which match comes first
    let match: RegExpExecArray | null = null;
    let type: 'bold' | 'italic' | null = null;
    if (boldMatch && italicMatch) {
      if (boldMatch.index < italicMatch.index) {
        match = boldMatch;
        type = 'bold';
      } else {
        match = italicMatch;
        type = 'italic';
      }
    } else if (boldMatch) {
      match = boldMatch;
      type = 'bold';
    } else if (italicMatch) {
      match = italicMatch;
      type = 'italic';
    }

    if (match && type) {
      // Add text before the match as normal
      const before = remaining.substring(0, match.index);
      if (before) {
        fragments.push({ text: before });
      }
      // Add the matched content with appropriate style
      fragments.push({ text: match[1], bold: type === 'bold', italic: type === 'italic' });
      // Move remaining past the match
      remaining = remaining.substring(match.index + match[0].length);
    } else {
      // No more formatting, push the rest as normal
      fragments.push({ text: remaining });
      break;
    }
  }

  // Merge adjacent fragments with same style for efficiency
  const merged: typeof fragments = [];
  for (const frag of fragments) {
    const last = merged[merged.length - 1];
    if (last && last.bold === frag.bold && last.italic === frag.italic) {
      last.text += frag.text;
    } else {
      merged.push(frag);
    }
  }

  return merged;
}

/**
 * Utility to format AI summary for HTML display.
 */
export function formatAISummary(text: string): string {
  return markdownToHtml(text);
}

/**
 * Utility to format AI summary for plain text (strip markdown).
 */
export function formatAISummaryPlain(text: string): string {
  return stripMarkdown(text);
}