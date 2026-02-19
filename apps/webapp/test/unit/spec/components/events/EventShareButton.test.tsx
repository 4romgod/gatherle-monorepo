import { render } from '@testing-library/react';
import { ComponentProps } from 'react';
import EventShareButton from '@/components/events/share/EventShareButton';

const mockUseSession = jest.fn();
const mockUseLazyQuery = jest.fn();
const mockUseChatRealtime = jest.fn();
const mockGetAuthHeader = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('@apollo/client', () => ({
  useLazyQuery: (...args: unknown[]) => mockUseLazyQuery(...args),
}));

jest.mock('@/hooks', () => ({
  useChatRealtime: (...args: unknown[]) => mockUseChatRealtime(...args),
}));

jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: (...args: unknown[]) => mockGetAuthHeader(...args),
}));

describe('EventShareButton', () => {
  const eventTitle = 'Weekend Food Festival';
  const eventUrl = 'http://localhost:3000/events/weekend-food-festival';

  let sendChatMessage: jest.Mock;
  let loadUsers: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    sendChatMessage = jest.fn().mockReturnValue(true);
    loadUsers = jest.fn().mockResolvedValue({});

    mockUseSession.mockReturnValue({
      data: {
        user: {
          token: 'token-1',
          userId: 'current-user',
        },
      },
    });
    mockUseLazyQuery.mockReturnValue([
      loadUsers,
      {
        data: {
          readUsers: [
            { userId: 'user-1', username: 'jackbaur', given_name: 'Jack', family_name: 'Baur', profile_picture: null },
            {
              userId: 'user-2',
              username: 'seancarter',
              given_name: 'Sean',
              family_name: 'Carter',
              profile_picture: null,
            },
            { userId: 'current-user', username: 'self' },
          ],
        },
        loading: false,
      },
    ]);
    mockUseChatRealtime.mockReturnValue({
      sendChatMessage,
    });
    mockGetAuthHeader.mockReturnValue({ Authorization: 'Bearer token-1' });
  });

  const renderButton = (props?: Partial<ComponentProps<typeof EventShareButton>>) =>
    render(<EventShareButton eventTitle={eventTitle} eventUrl={eventUrl} {...props} />);

  it('renders the share button', () => {
    const { getByRole } = renderButton();

    expect(getByRole('button', { name: `Share ${eventTitle}` })).toBeTruthy();
  });
});
