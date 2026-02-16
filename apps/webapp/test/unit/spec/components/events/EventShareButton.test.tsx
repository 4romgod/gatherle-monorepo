import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import EventShareButton from '@/components/events/EventShareButton';

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
  const userOne = {
    userId: 'user-1',
    username: 'jackbaur',
    given_name: 'Jack',
    family_name: 'Baur',
    profile_picture: null,
  };
  const userTwo = {
    userId: 'user-2',
    username: 'seancarter',
    given_name: 'Sean',
    family_name: 'Carter',
    profile_picture: null,
  };

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
          readUsers: [userOne, userTwo, { userId: 'current-user', username: 'self' }],
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

  it('shows supported platform actions and excludes removed options', async () => {
    renderButton();

    fireEvent.click(screen.getByRole('button', { name: `Share ${eventTitle}` }));

    expect(screen.getByText('Share')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'WhatsApp' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Facebook' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'X' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Email' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Instagram' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'More' })).toBeNull();

    await waitFor(() => {
      expect(loadUsers).toHaveBeenCalled();
    });
  });

  it('supports selecting multiple users and sending to each selected recipient', async () => {
    renderButton();

    fireEvent.click(screen.getByRole('button', { name: `Share ${eventTitle}` }));
    fireEvent.click(screen.getByText('Jack Baur'));
    fireEvent.click(screen.getByText('Sean Carter'));

    const sendSelectedButton = screen.getByRole('button', { name: 'Send (2)' });
    fireEvent.click(sendSelectedButton);

    expect(sendChatMessage).toHaveBeenCalledWith('user-1', `${eventTitle}\n${eventUrl}`);
    expect(sendChatMessage).toHaveBeenCalledWith('user-2', `${eventTitle}\n${eventUrl}`);
    expect(sendChatMessage).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Sent to 2 people.')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Send' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('uses the X share URL with a single encoded event link', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    renderButton();

    fireEvent.click(screen.getByRole('button', { name: `Share ${eventTitle}` }));
    fireEvent.click(screen.getByRole('button', { name: 'X' }));

    expect(openSpy).toHaveBeenCalledTimes(1);
    const [openedUrl] = openSpy.mock.calls[0];
    expect(typeof openedUrl).toBe('string');
    expect((openedUrl as string).startsWith('https://x.com/intent/tweet?')).toBe(true);
    expect(((openedUrl as string).match(new RegExp(encodeURIComponent(eventUrl), 'g')) ?? []).length).toBe(1);

    openSpy.mockRestore();
  });

  it('stops click propagation when stopPropagation is enabled', () => {
    const parentClick = jest.fn();
    render(
      <div onClick={parentClick}>
        <EventShareButton eventTitle={eventTitle} eventUrl={eventUrl} stopPropagation />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: `Share ${eventTitle}` }));

    expect(parentClick).not.toHaveBeenCalled();
  });
});
