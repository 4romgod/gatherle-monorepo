'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, IconButton, InputAdornment, Popover, Tab, Tabs, TextField, Tooltip, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { STORAGE_KEYS } from '@/hooks/usePersistentState';
import {
  CHAT_EMOJI_CATEGORIES,
  CHAT_EMOJI_OPTIONS,
  type ChatEmojiCategoryKey,
  type ChatEmojiOption,
} from '@/components/messages/chatEmojiPickerData';

const RECENTS_LIMIT = 18;

export interface EmojiPickerPopoverProps {
  anchorEl: HTMLButtonElement | null;
  onClose: () => void;
  /** Called when the user selects an emoji. */
  onSelect: (emoji: string) => void;
  anchorOrigin?: React.ComponentProps<typeof Popover>['anchorOrigin'];
  transformOrigin?: React.ComponentProps<typeof Popover>['transformOrigin'];
}

export function EmojiPickerPopover({
  anchorEl,
  onClose,
  onSelect,
  anchorOrigin = { vertical: 'top', horizontal: 'left' },
  transformOrigin = { vertical: 'bottom', horizontal: 'left' },
}: EmojiPickerPopoverProps) {
  const open = Boolean(anchorEl);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ChatEmojiCategoryKey>('smileys');
  const [recents, setRecents] = useState<string[]>([]);

  // Load recents from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEYS.CHAT_EMOJI_RECENTS);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return;
      setRecents(parsed.filter((item): item is string => typeof item === 'string').slice(0, RECENTS_LIMIT));
    } catch {
      setRecents([]);
    }
  }, []);

  // Reset search when closed
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const optionsByCategory = useMemo(() => {
    const query = search.trim().toLowerCase();
    const map = new Map<ChatEmojiCategoryKey, ChatEmojiOption[]>();
    CHAT_EMOJI_CATEGORIES.forEach((cat) => {
      if (!query) {
        map.set(cat.key, cat.emojis);
        return;
      }
      map.set(
        cat.key,
        cat.emojis.filter(
          (opt) =>
            opt.label.toLowerCase().includes(query) || opt.keywords.some((kw) => kw.toLowerCase().includes(query)),
        ),
      );
    });
    return map;
  }, [search]);

  // Fall back to a category that still has results when search filters the active one out
  useEffect(() => {
    if ((optionsByCategory.get(category)?.length ?? 0) > 0) return;
    const fallback =
      CHAT_EMOJI_CATEGORIES.find((c) => (optionsByCategory.get(c.key)?.length ?? 0) > 0)?.key ?? 'smileys';
    setCategory(fallback);
  }, [category, optionsByCategory]);

  const recentOptions = useMemo(() => {
    if (recents.length === 0) return [];
    const byEmoji = new Map(CHAT_EMOJI_OPTIONS.map((o) => [o.emoji, o]));
    return recents.map((e) => byEmoji.get(e)).filter((o): o is ChatEmojiOption => Boolean(o));
  }, [recents]);

  const handleSelect = useCallback(
    (emoji: string) => {
      // Persist to recents
      setRecents((prev) => {
        const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, RECENTS_LIMIT);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEYS.CHAT_EMOJI_RECENTS, JSON.stringify(next));
        }
        return next;
      });
      onSelect(emoji);
    },
    [onSelect],
  );

  const selectedOptions = optionsByCategory.get(category) ?? [];

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      slotProps={{
        paper: {
          sx: {
            width: 336,
            mt: -1,
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'background.paper',
            color: 'text.primary',
            boxShadow: 4,
          },
        },
      }}
    >
      <Box sx={{ p: 1.25 }}>
        <TextField
          fullWidth
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emoji"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 1, '& .MuiInputBase-root': { borderRadius: 2.5 } }}
        />

        {!search.trim() && recentOptions.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', px: 0.5 }}>
              Recently used
            </Typography>
            <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {recentOptions.map((option) => (
                <IconButton
                  key={`recent-${option.emoji}`}
                  size="small"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(option.emoji)}
                  aria-label={`Insert ${option.label}`}
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 2,
                    color: 'text.primary',
                    '&:hover': { backgroundColor: 'action.hover' },
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
          value={category}
          onChange={(_, value: ChatEmojiCategoryKey) => setCategory(value)}
          variant="scrollable"
          scrollButtons={false}
          sx={{
            minHeight: 36,
            borderTop: '1px solid',
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTabs-indicator': { backgroundColor: 'primary.main' },
          }}
        >
          {CHAT_EMOJI_CATEGORIES.map((cat) => {
            const hasMatches = (optionsByCategory.get(cat.key)?.length ?? 0) > 0;
            return (
              <Tab
                key={cat.key}
                value={cat.key}
                disabled={search.trim().length > 0 && !hasMatches}
                aria-label={cat.label}
                icon={
                  <Tooltip title={cat.label} placement="top" arrow>
                    <Box component="span" sx={{ fontSize: '1.1rem', lineHeight: 1 }}>
                      {cat.tabEmoji}
                    </Box>
                  </Tooltip>
                }
                sx={{
                  minWidth: 48,
                  minHeight: 36,
                  color: 'text.secondary',
                  '&.Mui-selected': { color: 'text.primary' },
                }}
              />
            );
          })}
        </Tabs>

        <Box sx={{ pt: 1, maxHeight: 236, overflowY: 'auto', pr: 0.25 }}>
          {selectedOptions.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', px: 0.5, py: 1 }}>
              No emojis match your search.
            </Typography>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: 0.35 }}>
              {selectedOptions.map((option) => (
                <IconButton
                  key={`${category}-${option.emoji}`}
                  size="small"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(option.emoji)}
                  aria-label={`Insert ${option.label}`}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    color: 'text.primary',
                    '&:hover': { backgroundColor: 'action.hover' },
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
  );
}
