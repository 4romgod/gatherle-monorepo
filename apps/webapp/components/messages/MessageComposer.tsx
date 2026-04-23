'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Box, IconButton, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Send, SentimentSatisfiedAlt } from '@mui/icons-material';
import { EmojiPickerPopover } from '@/components/core/EmojiPickerPopover';

interface MessageComposerProps {
  /** Called with the trimmed message text. Returns true if sent, false if send failed. */
  onSend: (message: string) => boolean;
  isConnected: boolean;
  targetUserId: string | undefined;
  /** Custom placeholder text. Defaults to "Message..." */
  placeholder?: string;
  /** Called when the text input gains focus. */
  onFocus?: () => void;
  /** Called when the text input loses focus. */
  onBlur?: () => void;
  /** 'overlay' applies frosted-glass dark styling for use over content (e.g. story viewer). */
  variant?: 'default' | 'overlay';
  /** Called immediately after a successful send, once the draft has been cleared. */
  onAfterSend?: () => void;
}

export function MessageComposer({
  onSend,
  isConnected,
  targetUserId,
  placeholder = 'Message...',
  onFocus,
  onBlur,
  variant = 'default',
  onAfterSend,
}: MessageComposerProps) {
  const [draftMessage, setDraftMessage] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<HTMLButtonElement | null>(null);

  const draftInputRef = useRef<HTMLTextAreaElement | null>(null);
  const draftSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const isEmojiPickerOpen = Boolean(emojiAnchorEl);

  // Close emoji picker when switching conversations
  useEffect(() => {
    setEmojiAnchorEl(null);
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
    onAfterSend?.();
  }, [draftMessage, onSend, onAfterSend]);

  const captureDraftSelection = useCallback(() => {
    const input = draftInputRef.current;
    if (!input) return;
    draftSelectionRef.current = {
      start: input.selectionStart ?? draftSelectionRef.current.start,
      end: input.selectionEnd ?? draftSelectionRef.current.end,
    };
  }, []);

  const insertEmojiAtCursor = useCallback((emoji: string) => {
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
  }, []);

  const openEmojiPicker = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      captureDraftSelection();
      setEmojiAnchorEl(event.currentTarget);
    },
    [captureDraftSelection],
  );

  const closeEmojiPicker = useCallback(() => {
    setEmojiAnchorEl(null);
  }, []);

  return (
    <>
      <Box
        sx={
          variant === 'overlay'
            ? {
                display: 'flex',
                gap: 1,
                alignItems: 'flex-end',
                border: '1px solid',
                borderColor: (muiTheme) => alpha(muiTheme.palette.common.white, 0.35),
                borderRadius: 6,
                px: 2,
                py: 0.75,
                backgroundColor: (muiTheme) => alpha(muiTheme.palette.common.black, 0.5),
                backdropFilter: 'blur(8px)',
              }
            : {
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
                  muiTheme.palette.mode === 'light'
                    ? `0 1px 2px ${alpha(muiTheme.palette.common.black, 0.08)}`
                    : 'none',
              }
        }
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
          sx={{ width: 38, height: 38, mt: 0.5, color: variant === 'overlay' ? 'common.white' : 'text.secondary' }}
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
          onFocus={(event) => {
            captureDraftSelection();
            onFocus?.();
          }}
          onBlur={() => {
            onBlur?.();
          }}
          placeholder={placeholder}
          slotProps={{ input: { disableUnderline: true } }}
          sx={{
            '& .MuiInputBase-root': {
              py: 0,
              minHeight: 42,
              display: 'flex',
              alignItems: 'center',
              ...(variant === 'overlay' && { color: 'common.white' }),
            },
            '& .MuiInputBase-inputMultiline': {
              paddingTop: '10px',
              paddingBottom: '10px',
              fontSize: '0.98rem',
              lineHeight: 1.45,
              ...(variant === 'overlay' && { color: 'white', caretColor: 'white' }),
            },
            '& textarea::placeholder': {
              opacity: 1,
              ...(variant === 'overlay' && { color: 'rgba(255,255,255,0.65)' }),
            },
            ...(variant === 'overlay' && {
              '& .MuiInputBase-input': { color: 'white', caretColor: 'white' },
              '& input::placeholder': { color: 'rgba(255,255,255,0.65)', opacity: 1 },
            }),
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

      <EmojiPickerPopover
        anchorEl={emojiAnchorEl}
        onClose={closeEmojiPicker}
        onSelect={insertEmojiAtCursor}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      />
    </>
  );
}
