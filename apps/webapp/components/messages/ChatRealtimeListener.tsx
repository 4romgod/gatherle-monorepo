'use client';

import { useChatRealtimeListener } from '@/hooks/useChatRealtime';

export default function ChatRealtimeListener() {
  useChatRealtimeListener(true);
  return null;
}
