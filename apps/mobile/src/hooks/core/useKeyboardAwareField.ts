import { useCallback, useEffect, useRef } from 'react';
import type { TextInput } from 'react-native';
import { useKeyboardAwareScroll } from '@/components/core/KeyboardAwareScrollView';

export function useKeyboardAwareField() {
  const keyboardAwareScroll = useKeyboardAwareScroll();
  const inputRef = useRef<TextInput | null>(null);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingFocusTimeout = useCallback(() => {
    if (focusTimeoutRef.current !== null) {
      clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearPendingFocusTimeout, [clearPendingFocusTimeout]);

  const handleFocus = useCallback(() => {
    if (!keyboardAwareScroll) {
      return;
    }

    clearPendingFocusTimeout();

    focusTimeoutRef.current = setTimeout(() => {
      focusTimeoutRef.current = null;
      keyboardAwareScroll.scrollToInput(inputRef.current);
    }, 60);
  }, [clearPendingFocusTimeout, keyboardAwareScroll]);

  return {
    handleFocus,
    inputRef,
  };
}
