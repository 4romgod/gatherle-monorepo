import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export function useKeyboardBottomInset() {
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(Math.max(0, event.endCoordinates?.height ?? 0));
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return keyboardInset;
}
