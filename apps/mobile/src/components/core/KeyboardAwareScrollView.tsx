import type { ComponentProps, ReactNode } from 'react';
import { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { Platform, ScrollView, findNodeHandle, type TextInput } from 'react-native';

type KeyboardAwareScrollContextValue = {
  scrollToInput: (input: TextInput | null) => void;
};

const KeyboardAwareScrollContext = createContext<KeyboardAwareScrollContextValue | null>(null);

type KeyboardAwareScrollViewProps = ComponentProps<typeof ScrollView> & {
  children: ReactNode;
  extraKeyboardOffset?: number;
};

export function KeyboardAwareScrollView({
  children,
  extraKeyboardOffset = 84,
  ...scrollViewProps
}: KeyboardAwareScrollViewProps) {
  const scrollRef = useRef<ScrollView | null>(null);

  const scrollToInput = useCallback(
    (input: TextInput | null) => {
      if (Platform.OS === 'web' || !input) {
        return;
      }

      const nodeHandle = findNodeHandle(input);
      const responder = scrollRef.current?.getScrollResponder?.();
      if (!nodeHandle || !responder?.scrollResponderScrollNativeHandleToKeyboard) {
        return;
      }

      requestAnimationFrame(() => {
        responder.scrollResponderScrollNativeHandleToKeyboard(nodeHandle, extraKeyboardOffset, true);
      });
    },
    [extraKeyboardOffset],
  );

  const contextValue = useMemo(
    () => ({
      scrollToInput,
    }),
    [scrollToInput],
  );

  return (
    <KeyboardAwareScrollContext.Provider value={contextValue}>
      <ScrollView ref={scrollRef} {...scrollViewProps}>
        {children}
      </ScrollView>
    </KeyboardAwareScrollContext.Provider>
  );
}

export function useKeyboardAwareScroll() {
  return useContext(KeyboardAwareScrollContext);
}
