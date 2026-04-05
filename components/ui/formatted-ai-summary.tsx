"use client";

import React from "react";

/**
 * Convert markdown text to React elements.
 * Supports **bold** and *italic*.
 * Line breaks become <br />.
 */
function markdownToReact(text: string): React.ReactNode[] {
  if (!text) return [];

  const nodes: React.ReactNode[] = [];
  let remaining = text;

  // Helper to push a plain text node
  const pushText = (str: string) => {
    if (str.length === 0) return;
    // Replace newlines with <br /> elements
    const parts = str.split(/\n/);
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) nodes.push(<br key={`br-${i}`} />);
      if (parts[i]) nodes.push(parts[i]);
    }
  };

  // Process the string looking for ** and *
  while (remaining.length > 0) {
    const boldMatch = /\*\*(.*?)\*\*/.exec(remaining);
    const italicMatch = /\*(.*?)\*/.exec(remaining);

    let match: RegExpExecArray | null = null;
    let type: "bold" | "italic" | null = null;

    if (boldMatch && italicMatch) {
      if (boldMatch.index < italicMatch.index) {
        match = boldMatch;
        type = "bold";
      } else {
        match = italicMatch;
        type = "italic";
      }
    } else if (boldMatch) {
      match = boldMatch;
      type = "bold";
    } else if (italicMatch) {
      match = italicMatch;
      type = "italic";
    }

    if (match && type) {
      // Push text before the match
      const before = remaining.substring(0, match.index);
      pushText(before);

      // Recursively process inner content (to handle nested formatting)
      const innerNodes = markdownToReact(match[1]);
      const element = type === "bold" ? (
        <strong key={`${type}-${match.index}`}>{innerNodes}</strong>
      ) : (
        <em key={`${type}-${match.index}`}>{innerNodes}</em>
      );
      nodes.push(element);

      // Move remaining past the match
      remaining = remaining.substring(match.index + match[0].length);
    } else {
      // No more formatting, push the rest
      pushText(remaining);
      break;
    }
  }

  return nodes;
}

interface FormattedAISummaryProps {
  /** The markdown-formatted text (supports **bold** and *italic*) */
  content: string;
  /** Optional className for the container div */
  className?: string;
}

export function FormattedAISummary({
  content,
  className = "",
}: FormattedAISummaryProps) {
  const nodes = markdownToReact(content);

  return (
    <div className={`whitespace-pre-wrap ${className}`}>
      {nodes.length === 0 ? content : nodes}
    </div>
  );
}