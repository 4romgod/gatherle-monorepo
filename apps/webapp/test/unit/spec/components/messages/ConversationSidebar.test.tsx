import { fireEvent, render, screen } from '@testing-library/react';
import { ConversationSidebar } from '@/components/messages/ConversationSidebar';

jest.mock('@/components/messages/ConversationUnreadToggleButton', () => ({
  ConversationUnreadToggleButton: () => null,
}));

jest.mock('next/link', () => {
  const React = require('react');

  const MockLink = React.forwardRef(
    ({ children, href, ...props }: { children: React.ReactNode; href: string }, ref: React.Ref<HTMLAnchorElement>) => (
      <a ref={ref} href={href} {...props}>
        {children}
      </a>
    ),
  );

  MockLink.displayName = 'MockLink';

  return {
    __esModule: true,
    default: MockLink,
  };
});

describe('ConversationSidebar', () => {
  it('shows the default empty state when there are no conversations', () => {
    render(
      <ConversationSidebar
        conversations={[]}
        conversationsLoading={false}
        conversationsError={null}
        currentUserId={null}
        username=""
        resolvedUsersByConversationId={{}}
      />,
    );

    expect(screen.getByText('No messages yet.')).toBeTruthy();
  });

  it('shows a search-specific empty state when no conversations match the filter', () => {
    render(
      <ConversationSidebar
        conversations={[
          {
            conversationWithUserId: 'user-1',
            updatedAt: '2026-06-05T10:00:00.000Z',
            lastMessage: { senderUserId: 'user-1', message: 'See you there' },
            unreadCount: 0,
            conversationWithUser: {
              given_name: 'Ada',
              family_name: 'Lovelace',
              username: 'ada',
            },
          },
        ]}
        conversationsLoading={false}
        conversationsError={null}
        currentUserId="me"
        username=""
        resolvedUsersByConversationId={{}}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Search conversations'), { target: { value: 'grace' } });

    expect(screen.getByText('No conversations match your search.')).toBeTruthy();
  });
});
