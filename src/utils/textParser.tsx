import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Parse text content and convert @mentions, #hashtags, and URLs into clickable elements
 * @param text - The text content to parse
 * @param navigate - React Router navigate function
 * @returns Array of React nodes with parsed content
 */
export const parseContentWithMentionsAndTags = (
  text: string,
  navigate: ReturnType<typeof useNavigate>
): React.ReactNode[] => {
  if (!text) return [];

  const parts: React.ReactNode[] = [];
  const regex = /(@[\w]+|#[\w]+|https?:\/\/[^\s]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const matchText = match[0];
    
    if (matchText.startsWith('@')) {
      // Mention - Navigate to user profile
      const username = matchText.substring(1);
      parts.push(
        <span
          key={`mention-${match.index}`}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer font-medium transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            console.log('🔗 [MENTION] Navigating to profile:', username);
            navigate(`/profile/${username}`);
          }}
          title={`View @${username}'s profile`}
        >
          {matchText}
        </span>
      );
    } else if (matchText.startsWith('#')) {
      // Hashtag - Search for posts with this tag
      const tag = matchText.substring(1);
      parts.push(
        <span
          key={`hashtag-${match.index}`}
          className="text-primary hover:text-primary/80 hover:underline cursor-pointer font-medium transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            console.log('🔍 [HASHTAG] Searching for:', tag);
            navigate(`/search?q=${encodeURIComponent('#' + tag)}`);
          }}
          title={`Search for #${tag}`}
        >
          {matchText}
        </span>
      );
    } else if (matchText.startsWith('http')) {
      // URL - Open in new tab
      parts.push(
        <a
          key={`link-${match.index}`}
          href={matchText}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
          onClick={(e) => e.stopPropagation()}
          title={matchText}
        >
          {matchText}
        </a>
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};

/**
 * Extract all mentions from text
 * @param text - The text to extract mentions from
 * @returns Array of usernames (without @)
 */
export const extractMentions = (text: string): string[] => {
  if (!text) return [];
  
  const regex = /@([\w]+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
};

/**
 * Extract all hashtags from text
 * @param text - The text to extract hashtags from
 * @returns Array of tags (without #)
 */
export const extractHashtags = (text: string): string[] => {
  if (!text) return [];
  
  const regex = /#([\w]+)/g;
  const hashtags: string[] = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    hashtags.push(match[1]);
  }
  
  return hashtags;
};

/**
 * Check if text contains mentions
 * @param text - The text to check
 * @returns true if text contains at least one mention
 */
export const hasMentions = (text: string): boolean => {
  return /@[\w]+/.test(text);
};

/**
 * Check if text contains hashtags
 * @param text - The text to check
 * @returns true if text contains at least one hashtag
 */
export const hasHashtags = (text: string): boolean => {
  return /#[\w]+/.test(text);
};
