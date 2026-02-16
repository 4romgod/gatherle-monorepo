export interface ChatEmojiOption {
  emoji: string;
  label: string;
  keywords: string[];
}

export type ChatEmojiCategoryKey = 'smileys' | 'gestures' | 'hearts' | 'activity' | 'symbols';

export interface ChatEmojiCategory {
  key: ChatEmojiCategoryKey;
  label: string;
  tabEmoji: string;
  emojis: ChatEmojiOption[];
}

export const CHAT_EMOJI_CATEGORIES: ChatEmojiCategory[] = [
  {
    key: 'smileys',
    label: 'Smileys',
    tabEmoji: '😀',
    emojis: [
      { emoji: '😀', label: 'Grinning face', keywords: ['grin', 'happy', 'smile'] },
      { emoji: '😃', label: 'Smiling face with big eyes', keywords: ['happy', 'smile', 'joy'] },
      { emoji: '😄', label: 'Smiling face with smiling eyes', keywords: ['laugh', 'smile', 'joy'] },
      { emoji: '😁', label: 'Beaming face with smiling eyes', keywords: ['beam', 'grin', 'happy'] },
      { emoji: '😆', label: 'Grinning squinting face', keywords: ['laugh', 'haha', 'funny'] },
      { emoji: '😅', label: 'Grinning face with sweat', keywords: ['relief', 'nervous', 'laugh'] },
      { emoji: '🤣', label: 'Rolling on the floor laughing', keywords: ['rofl', 'funny', 'lol'] },
      { emoji: '😂', label: 'Face with tears of joy', keywords: ['lol', 'funny', 'cry'] },
      { emoji: '🙂', label: 'Slightly smiling face', keywords: ['smile', 'friendly'] },
      { emoji: '🙃', label: 'Upside-down face', keywords: ['sarcasm', 'silly'] },
      { emoji: '😉', label: 'Winking face', keywords: ['wink', 'flirt'] },
      { emoji: '😊', label: 'Smiling face with smiling eyes', keywords: ['blush', 'happy'] },
      { emoji: '😇', label: 'Smiling face with halo', keywords: ['angel', 'innocent'] },
      { emoji: '🥰', label: 'Smiling face with hearts', keywords: ['love', 'adore'] },
      { emoji: '😍', label: 'Smiling face with heart-eyes', keywords: ['love', 'crush'] },
      { emoji: '🤩', label: 'Star-struck face', keywords: ['excited', 'amazed'] },
      { emoji: '😘', label: 'Face blowing a kiss', keywords: ['kiss', 'love'] },
      { emoji: '😗', label: 'Kissing face', keywords: ['kiss'] },
      { emoji: '😚', label: 'Kissing face with closed eyes', keywords: ['kiss', 'affection'] },
      { emoji: '😙', label: 'Kissing face with smiling eyes', keywords: ['kiss', 'smile'] },
      { emoji: '😋', label: 'Face savoring food', keywords: ['yum', 'tasty', 'hungry'] },
      { emoji: '😛', label: 'Face with tongue', keywords: ['playful', 'tease'] },
      { emoji: '😜', label: 'Winking face with tongue', keywords: ['joke', 'playful'] },
      { emoji: '🤪', label: 'Zany face', keywords: ['crazy', 'wild'] },
      { emoji: '😝', label: 'Squinting face with tongue', keywords: ['playful', 'silly'] },
      { emoji: '🫠', label: 'Melting face', keywords: ['awkward', 'heat'] },
      { emoji: '🫣', label: 'Face with peeking eye', keywords: ['shy', 'peek'] },
      { emoji: '🤭', label: 'Face with hand over mouth', keywords: ['oops', 'giggle'] },
      { emoji: '🤫', label: 'Shushing face', keywords: ['quiet', 'secret'] },
      { emoji: '🤔', label: 'Thinking face', keywords: ['hmm', 'ponder'] },
      { emoji: '🫡', label: 'Saluting face', keywords: ['respect', 'salute'] },
      { emoji: '🤗', label: 'Hugging face', keywords: ['hug', 'care'] },
      { emoji: '🤤', label: 'Drooling face', keywords: ['want', 'hungry'] },
      { emoji: '😌', label: 'Relieved face', keywords: ['calm', 'relaxed'] },
      { emoji: '😎', label: 'Smiling face with sunglasses', keywords: ['cool', 'confident'] },
      { emoji: '🥺', label: 'Pleading face', keywords: ['please', 'puppy eyes'] },
      { emoji: '😢', label: 'Crying face', keywords: ['sad', 'tear'] },
      { emoji: '😭', label: 'Loudly crying face', keywords: ['cry', 'sad'] },
      { emoji: '😤', label: 'Face with steam from nose', keywords: ['frustrated', 'angry'] },
      { emoji: '😡', label: 'Pouting face', keywords: ['angry', 'mad'] },
      { emoji: '😱', label: 'Face screaming in fear', keywords: ['shocked', 'scared'] },
      { emoji: '😴', label: 'Sleeping face', keywords: ['sleep', 'tired'] },
    ],
  },
  {
    key: 'gestures',
    label: 'Gestures',
    tabEmoji: '🙌',
    emojis: [
      { emoji: '🫶', label: 'Heart hands', keywords: ['love', 'hands'] },
      { emoji: '🤝', label: 'Handshake', keywords: ['deal', 'agreement'] },
      { emoji: '👍', label: 'Thumbs up', keywords: ['ok', 'approve', 'yes'] },
      { emoji: '👎', label: 'Thumbs down', keywords: ['no', 'disapprove'] },
      { emoji: '👏', label: 'Clapping hands', keywords: ['applause', 'praise'] },
      { emoji: '🙌', label: 'Raising hands', keywords: ['celebrate', 'praise'] },
      { emoji: '🤟', label: 'Love-you gesture', keywords: ['love', 'gesture'] },
      { emoji: '🙏', label: 'Folded hands', keywords: ['please', 'thanks', 'pray'] },
      { emoji: '👀', label: 'Eyes', keywords: ['look', 'watch'] },
    ],
  },
  {
    key: 'hearts',
    label: 'Hearts',
    tabEmoji: '❤️',
    emojis: [
      { emoji: '❤️', label: 'Red heart', keywords: ['love', 'heart'] },
      { emoji: '🧡', label: 'Orange heart', keywords: ['heart', 'care'] },
      { emoji: '💛', label: 'Yellow heart', keywords: ['heart', 'friendship'] },
      { emoji: '💚', label: 'Green heart', keywords: ['heart', 'support'] },
      { emoji: '🩵', label: 'Light blue heart', keywords: ['heart', 'calm'] },
      { emoji: '💙', label: 'Blue heart', keywords: ['heart', 'loyalty'] },
      { emoji: '💜', label: 'Purple heart', keywords: ['heart', 'care'] },
      { emoji: '🖤', label: 'Black heart', keywords: ['heart', 'dark'] },
      { emoji: '🤍', label: 'White heart', keywords: ['heart', 'clean'] },
      { emoji: '🤎', label: 'Brown heart', keywords: ['heart', 'warm'] },
      { emoji: '💔', label: 'Broken heart', keywords: ['sad', 'heartbreak'] },
      { emoji: '❣️', label: 'Heart exclamation', keywords: ['heart', 'emphasis'] },
      { emoji: '💕', label: 'Two hearts', keywords: ['love', 'affection'] },
      { emoji: '💞', label: 'Revolving hearts', keywords: ['love', 'romance'] },
      { emoji: '💓', label: 'Beating heart', keywords: ['heart', 'pulse'] },
      { emoji: '💖', label: 'Sparkling heart', keywords: ['heart', 'sparkle'] },
      { emoji: '💘', label: 'Heart with arrow', keywords: ['cupid', 'love'] },
    ],
  },
  {
    key: 'activity',
    label: 'Activity',
    tabEmoji: '🎉',
    emojis: [
      { emoji: '🔥', label: 'Fire', keywords: ['lit', 'hot', 'awesome'] },
      { emoji: '💯', label: 'Hundred points', keywords: ['perfect', 'keep it real'] },
      { emoji: '✨', label: 'Sparkles', keywords: ['magic', 'clean', 'shine'] },
      { emoji: '⭐', label: 'Star', keywords: ['favorite', 'highlight'] },
      { emoji: '🎉', label: 'Party popper', keywords: ['party', 'celebrate'] },
      { emoji: '🥳', label: 'Partying face', keywords: ['celebrate', 'birthday'] },
      { emoji: '🎊', label: 'Confetti ball', keywords: ['party', 'celebration'] },
    ],
  },
  {
    key: 'symbols',
    label: 'Symbols',
    tabEmoji: '✅',
    emojis: [
      { emoji: '✅', label: 'Check mark button', keywords: ['done', 'yes'] },
      { emoji: '❌', label: 'Cross mark', keywords: ['no', 'cancel'] },
    ],
  },
];

export const CHAT_EMOJI_OPTIONS: ChatEmojiOption[] = CHAT_EMOJI_CATEGORIES.flatMap((category) => category.emojis);
