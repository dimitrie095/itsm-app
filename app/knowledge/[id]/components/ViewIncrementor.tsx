"use client";

import { useEffect, useRef } from "react";
import { incrementArticleViews } from "../../actions";

interface ViewIncrementorProps {
  articleId: string;
}

export default function ViewIncrementor({ articleId }: ViewIncrementorProps) {
  const hasIncremented = useRef(false);

  useEffect(() => {
    // Increment view count only once per component mount
    if (!hasIncremented.current) {
      hasIncremented.current = true;
      incrementArticleViews(articleId).catch((error: Error) => {
        // Silently ignore errors (e.g., network, server error)
        console.error("Failed to increment article views:", error);
      });
    }
  }, [articleId]);

  // This component renders nothing
  return null;
}