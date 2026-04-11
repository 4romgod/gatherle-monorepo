'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, InputAdornment, Popover, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Search, Send, SentimentSatisfiedAlt } from '@mui/icons-material';
import { STORAGE_KEYS } from '@/hooks/usePersistentState';
import {
  CHAT_EMOJI_CATEGORIES,
  CHAT_EMOJI_OPTIONS,
  type ChatEmojiCategoryKey,
  type ChatEmojiOption,
} from '@/components/messages/chatEmojiPickerData';

const CHAT_EMOJI_RECENTS_LIMIT = 18;

interface MessageComposerProps {
  /** Called with the trimmed message text. Returns true if sent, false if send failed. */
  onSend: (message: string) => boolean;
  isConnected: boolean;
  targetUserId: string | undefined;
}

export function MessageComposer({ onSend, isConnected, targetUserId }: MessageComposerProps) {
  const theme = useTheme();
  const [draftMessage, setDraftMessage] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [emojiSearch, setEmojiSearch] = useState('');
  const [emojiCategory, setEmojiCategory] = useState<ChatEmojiCategoryKey>('smileys');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  const draftInputRef = useRef<HTMLTextAreaElement | null>(null);
  const draftSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const isEmojiPickerOpen = Boolean(emojiAnchorEl);

  // Load recent emojis from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEYS.CHAT_EMOJI_RECENTS);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return;
      setRecentEmojis(
        parsed.filter((item): item is string => typeof item === 'string').slice(0, CHAT_EMOJI_RECENTS_LIMIT),
      );
    } catch {
      setRecentEmojis([]);
    }
  }, []);

  // Reset composer state when switching conversations
  useEffect(() => {
    setEmojiAnchorEl(null);
    setEmojiSearch('');
  }, [targetUserId]);

  const handleSend = useCallback(() => {
    const trimmed = draftMessage.trim();
    if (!trimmed) return;

    const sent = onSend(trimmed);
    if (!sent) {
      setSendError('Unable to send message right now. Reconnecting...');
      return;
    }

    setSendError(null);
    setDraftMessage('');
    draftSelectionRef.current = { start: 0, end: 0 };
  }, [draftMessage, onSend]);

  const captureDraftSelection = useCallback(() => {
    const input = draftInputRef.current;
    if (!input) return;
    draftSelectionRef.current = {
      start: input.selectionStart ?? draftSelectionRef.current.start,
      end: input.selectionEnd ?? draftSelectionRef.current.end,
    };
  }, []);

  const rememberEmoji = useCallback((emoji: string) => {
    setRecentEmojis((previous) => {
      const next = [emoji, ...previous.filter((item) => item !== emoji)].slice(0, CHAT_EMOJI_RECENTS_LIMIT);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEYS.CHAT_EMOJI_RECENTS, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const insertEmojiAtCursor = useCallback(
    (emoji: string) => {
      const input = draftInputRef.current;
      const liveStart = input?.selectionStart;
      const liveEnd = input?.selectionEnd;
      let nextCursorPosition = 0;

      setDraftMessage((currentValue) => {
        const fallbackIndex = currentValue.length;
        const start = Math.min(liveStart ?? draftSelectionRef.current.start ?? fallbackIndex, currentValue.length);
        const end = Math.min(liveEnd ?? draftSelectionRef.current.end ?? start, currentValue.length);
        const updated = `${currentValue.slice(0, start)}${emoji}${currentValue.slice(end)}`;
        nextCursorPosition = start + emoji.length;
        return updated;
      });

      rememberEmoji(emoji);
      setSendError(null);

      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          const nextInput = draftInputRef.current;
          if (!nextInput) return;
          nextInput.focus();
          nextInput.setSelectionRange(nextCursorPosition, nextCursorPosition);
          draftSelectionRef.current = { start: nextCursorPosition, end: nextCursorPosition };
        });
      }
    },
    [rememberEmoji],
  );

  const openEmojiPicker = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      captureDraftSelection();
      setEmojiAnchorEl(event.currentTarget);
    },
    [captureDraftSelection],
  );

  const closeEmojiPicker = useCallback(() => {
    setEmojiAnchorEl(null);
    setEmojiSearch('');
  }, []);

  const emojiOptionsByCategory = useMemo(() => {
    const query = emojiSearch.trim().toLowerCase();
    const map = new Map<ChatEmojiCategoryKey, ChatEmojiOption[]>();

    CHAT_EMOJI_CATEGORIES.forEach((category) => {
      if (!query) {
        map.set(category.key, category.emojis);
        return;
      }
      map.set(
        category.key,
        category.emojis.filter((option) => {
          const keywordMatch = option.keywords.some((kw) => kw.toLowerCase().includes(query));
          return option.label.toLowerCase().includes(query) || keywordMatch;
        }),
      );
    });

    return map;
  }, [emojiSearch]);

  const selectedEmojiOptions = emojiOptionsByCategory.get(emojiCategory) ?? [];

  const recentEmojiOptions = useMemo(() => {
    if (recentEmojis.length === 0) return [];
    const optionByEmoji = new Map(CHAT_EMOJI_OPTIONS.map((option) => [option.emoji, option]));
    return recentEmojis
      .map((emoji) => optionByEmoji.get(emoji))
      .filter((option): option is ChatEmojiOption => Boolean(option));
  }, [recentEmojis]);

  // Fall back to a category that has results when search filters the active one out
  useEffect(() => {
    if ((emojiOptionsByCategory.get(emojiCategory)?.length ?? 0) > 0) return;
    const fallback =
      CHAT_EMOJI_CATEGORIES.find((c) => (emojiOptionsByCategory.get(c.key)?.length ?? 0) > 0)?.key ?? 'smileys';
    setEmojiCategory(fallback);
  }, [emojiCategory, emojiOptionsByCategory]);

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          alignItems: 'flex-end',
          border: '1px solid',
          borderColor: (muiTheme) =>
            muiTheme.palette.mode === 'light'
              ? alpha(muiTheme.palette.text.primary, 0.2)
              : alpha(muiTheme.palette.common.white, 0.22),
          borderRadius: 4,
          px: 1.25,
          py: 0.75,
          backgroundColor: (muiTheme) =>
            muiTheme.palette.mode === 'light'
              ? alpha(muiTheme.palette.common.black, 0.015)
              : muiTheme.palette.background.default,
          boxShadow: (muiTheme) =>
            muiTheme.palette.mode === 'light' ? `0 1px 2px ${alpha(muiTheme.palette.common.black, 0.08)}` : 'none',
        }}
      >
        <IconButton
          aria-label={isEmojiPickerOpen ? 'Close emoji picker' : 'Open emoji picker'}
          onClick={(event) => {
            if (isEmojiPickerOpen) {
              closeEmojiPicker();
              return;
            }
            openEmojiPicker(event);
          }}
          sx={{ width: 38, height: 38, mt: 0.5, color: 'text.secondary' }}
        >
          <SentimentSatisfiedAlt />
        </IconButton>

        <TextField
          fullWidth
          multiline
          minRows={1}
          maxRows={4}
          variant="standard"
          value={draftMessage}
          inputRef={draftInputRef}
          onChange={(event) => {
            const { value, selectionStart, selectionEnd } = event.target;
            setDraftMessage(value);
            draftSelectionRef.current = {
              start: selectionStart ?? value.length,
              end: selectionEnd ?? value.length,
            };
          }}
          onClick={captureDraftSelection}
          onSelect={captureDraftSelection}
          onKeyUp={captureDraftSelection}
          onFocus={captureDraftSelection}
          placeholder="Message..."
          slotProps={{ input: { disableUnderline: true } }}
          sx={{
            '& .MuiInputBase-root': { py: 0, minHeight: 42, display: 'flex', alignItems: 'center' },
            '& .MuiInputBase-inputMultiline': {
              paddingTop: '10px',
              paddingBottom: '10px',
              fontSize: '0.98rem',
              lineHeight: 1.45,
            },
            '& textarea::placeholder': { opacity: 1 },
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
        />

        <IconButton
          color="primary"
          onClick={handleSend}
          disabled={!draftMessage.trim() || !isConnected || !targetUserId}
          aria-label="Send message"
          sx={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': { backgroundColor: 'primary.dark' },
            '&.Mui-disabled': { backgroundColor: 'action.disabledBackground', color: 'action.disabled' },
          }}
        >
          <Send />
        </IconButton>
      </Box>

      {sendError && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
          {sendError}
        </Typography>
      )}

      <Popover
        open={isEmojiPickerOpen}
        anchorEl={emojiAnchorEl}
        onClose={closeEmojiPicker}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              width: 336,
              mt: -1,
              borderRadius: 3,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: (muiTheme) =>
                muiTheme.palette.mode === 'light'
                  ? alpha(muiTheme.palette.common.black, 0.16)
                  : alpha(muiTheme.palette.common.white, 0.18),
              backgroundColor: (muiTheme) =>
                muiTheme.palette.mode === 'light' ? '#1f2127' : muiTheme.palette.background.paper,
              color: 'common.white',
              boxShadow: '0 18px 40px rgba(0, 0, 0, 0.35)',
            },
          },
        }}
      >
        <Box sx={{ p: 1.25 }}>
          <TextField
            fullWidth
            size="small"
            value={emojiSearch}
            onChange={(event) => setEmojiSearch(event.target.value)}
            placeholder="Search emoji"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" sx={{ color: alpha(theme.palette.common.white, 0.68) }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              mb: 1,
              '& .MuiInputBase-root': {
                borderRadius: 2.5,
                backgroundColor: alpha(theme.palette.common.white, 0.08),
                color: 'common.white',
              },
              '& .MuiInputBase-input::placeholder': { color: alpha(theme.palette.common.white, 0.72), opacity: 1 },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(theme.palette.common.white, 0.12) },
            }}
          />

          {!emojiSearch.trim() && recentEmojiOptions.length > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ color: alpha(theme.palette.common.white, 0.7), px: 0.5 }}>
                Recently used
              </Typography>
              <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {recentEmojiOptions.map((option) => (
                  <IconButton
                    key={`recent-${option.emoji}`}
                    size="small"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insertEmojiAtCursor(option.emoji)}
                    aria-label={`Insert ${option.label}`}
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: 2,
                      color: 'common.white',
                      '&:hover': { backgroundColor: alpha(theme.palette.common.white, 0.12) },
                    }}
                  >
                    <Box component="span" sx={{ fontSize: '1.2rem', lineHeight: 1 }}>
                      {option.emoji}
                    </Box>
                  </IconButton>
                ))}
              </Box>
            </Box>
          )}

          <Tabs
            value={emojiCategory}
            onChange={(_, value: ChatEmojiCategoryKey) => setEmojiCategory(value)}
            variant="scrollable"
            scrollButtons={false}
            sx={{
              minHeight: 36,
              borderTop: '1px solid',
              borderBottom: '1px solid',
              borderColor: alpha(theme.palette.common.white, 0.12),
              '& .MuiTabs-indicator': { backgroundColor: alpha(theme.palette.common.white, 0.9) },
            }}
          >
            {CHAT_EMOJI_CATEGORIES.map((category) => {
              const hasMatches = (emojiOptionsByCategory.get(category.key)?.length ?? 0) > 0;
              return (
                <Tab
                  key={category.key}
                  value={category.key}
                  disabled={emojiSearch.trim().length > 0 && !hasMatches}
                  aria-label={category.label}
                  icon={
                    <Tooltip title={category.label} placement="top" arrow>
                      <Box component="span" sx={{ fontSize: '1.1rem', lineHeight: 1 }}>
                        {category.tabEmoji}
                      </Box>
                    </Tooltip>
                  }
                  sx={{
                    minWidth: 48,
                    minHeight: 36,
                    color: alpha(theme.palette.common.white, 0.72),
                    '&.Mui-selected': { color: theme.palette.common.white },
                  }}
                />
              );
            })}
          </Tabs>

          <Box sx={{ pt: 1, maxHeight: 236, overflowY: 'auto', pr: 0.25 }}>
            {selectedEmojiOptions.length === 0 ? (
              <Typography variant="body2" sx={{ color: alpha(theme.palette.common.white, 0.72), px: 0.5, py: 1 }}>
                No emojis match your search.
              </Typography>
            ) : (
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: 0.35 }}>
                {selectedEmojiOptions.map((option) => (
                  <IconButton
                    key={`${emojiCategory}-${option.emoji}`}
                    size="small"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insertEmojiAtCursor(option.emoji)}
                    aria-label={`Insert ${option.label}`}
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      color: 'common.white',
                      '&:hover': { backgroundColor: alpha(theme.palette.common.white, 0.12) },
                    }}
                  >
                    <Box component="span" sx={{ fontSize: '1.25rem', lineHeight: 1 }}>
                      {option.emoji}
                    </Box>
                  </IconButton>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Popover>
    </>
  );
}
