export type EmojiCategory = {
  emojis: string[];
  id: string;
  label: string;
};

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: 'smileys',
    label: 'Smileys',
    emojis: [
      '😀',
      '😃',
      '😄',
      '😁',
      '😆',
      '😅',
      '🤣',
      '😂',
      '🙂',
      '😉',
      '😊',
      '😍',
      '🥰',
      '😘',
      '😗',
      '😋',
      '😜',
      '🤪',
      '😎',
      '🥳',
      '🤩',
      '😇',
      '🥺',
      '😭',
      '😡',
      '😴',
      '🤔',
      '🤗',
    ],
  },
  {
    id: 'gestures',
    label: 'Gestures',
    emojis: ['👏', '🙌', '👍', '👎', '👊', '✌️', '🤝', '🙏', '💪', '🔥', '✨', '👀'],
  },
  {
    id: 'love',
    label: 'Love',
    emojis: ['❤️', '💜', '🫶', '💯', '💫', '💥', '🌟', '💌', '💘', '💕', '💖', '💗'],
  },
  {
    id: 'celebration',
    label: 'Celebrate',
    emojis: ['🎉', '🎊', '✅', '📍', '📅', '☕', '🎵', '🍾', '🥂', '🎂', '🚀', '🏆'],
  },
];

export const DEFAULT_RECENT_EMOJIS = ['😘', '😊', '😳', '😆', '😡', '🥹', '😌', '🥰'];
