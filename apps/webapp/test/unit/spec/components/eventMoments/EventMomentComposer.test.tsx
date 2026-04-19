import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import EventMomentComposer from '@/components/eventMoments/EventMomentComposer';

const mockUseSession = jest.fn();
const mockUseMutation = jest.fn();
const mockUseLazyQuery = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

jest.mock('@apollo/client', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  useLazyQuery: (...args: unknown[]) => mockUseLazyQuery(...args),
}));

jest.mock('@/data/graphql/query', () => ({
  CreateEventMomentDocument: {},
  GetEventMomentUploadUrlDocument: {},
  ReadEventMomentsDocument: {},
}));

jest.mock('@/data/graphql/types/graphql', () => ({
  EventMomentType: { Text: 'Text', Image: 'Image', Video: 'Video' },
}));

jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: () => ({ Authorization: 'Bearer test-token' }),
}));

jest.mock('@/lib/utils', () => ({
  getFileExtension: jest.fn((file: File) => file.name.split('.').pop() ?? 'jpg'),
}));

jest.mock('@/components/core/EmojiPickerPopover', () => ({
  EmojiPickerPopover: () => null,
}));

const defaultProps = {
  eventId: 'event-1',
  eventSlug: 'summer-party-2025',
  open: true,
  onClose: jest.fn(),
  onCreated: jest.fn(),
};

describe('EventMomentComposer — file validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSession.mockReturnValue({
      data: { user: { token: 'mock-token' } },
    });

    mockUseMutation.mockReturnValue([jest.fn(), { loading: false }]);
    mockUseLazyQuery.mockReturnValue([jest.fn(), {}]);
  });

  it('displays the 15 MB file size limit hint on the Photo tab', async () => {
    render(<EventMomentComposer {...defaultProps} />);

    // Navigate to the Photo tab
    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Photo' }));
    });

    expect(screen.getByText(/15 MB/i)).toBeTruthy();
  });

  it('displays the 75 MB file size limit hint on the Video tab', async () => {
    render(<EventMomentComposer {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Video' }));
    });

    expect(screen.getByText(/75 MB/i)).toBeTruthy();
  });

  it('shows an error and does not proceed when an image file exceeds 15 MB', async () => {
    const mockGetUploadUrl = jest.fn();
    mockUseMutation.mockReturnValueOnce([jest.fn(), { loading: false }]).mockReturnValueOnce([mockGetUploadUrl, {}]);

    render(<EventMomentComposer {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Photo' }));
    });

    const input = document.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    const bigFile = new File([new ArrayBuffer(16 * 1024 * 1024)], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [bigFile], writable: false, configurable: true });

    await act(async () => {
      fireEvent.change(input);
    });

    expect(screen.getByText(/too large/i)).toBeTruthy();
    expect(mockGetUploadUrl).not.toHaveBeenCalled();
  });

  it('shows an error and does not proceed when a video file exceeds 75 MB', async () => {
    const mockGetUploadUrl = jest.fn();
    mockUseMutation.mockReturnValueOnce([jest.fn(), { loading: false }]).mockReturnValueOnce([mockGetUploadUrl, {}]);
    URL.createObjectURL = jest.fn().mockReturnValue('blob:mock');

    render(<EventMomentComposer {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Video' }));
    });

    const input = document.querySelector('input[type="file"][accept*="video"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    const bigFile = new File([new ArrayBuffer(76 * 1024 * 1024)], 'huge.mp4', { type: 'video/mp4' });
    Object.defineProperty(input, 'files', { value: [bigFile], writable: false, configurable: true });

    await act(async () => {
      fireEvent.change(input);
    });

    expect(screen.getByText(/too large/i)).toBeTruthy();
    expect(mockGetUploadUrl).not.toHaveBeenCalled();
  });

  it('shows an error for unsupported image MIME types', async () => {
    render(<EventMomentComposer {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Photo' }));
    });

    const input = document.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement;
    const badFile = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [badFile], writable: false, configurable: true });

    await act(async () => {
      fireEvent.change(input);
    });

    expect(screen.getByText(/unsupported file type/i)).toBeTruthy();
  });

  it('does not show an error for a valid image file under 15 MB', async () => {
    const mockGetUploadUrl = jest.fn().mockResolvedValue({
      data: { getEventMomentUploadUrl: { uploadUrl: 'https://s3.example.com/upload', key: 'media/key.jpg' } },
      errors: undefined,
    });
    mockUseMutation.mockReturnValueOnce([jest.fn(), { loading: false }]).mockReturnValueOnce([mockGetUploadUrl, {}]);

    // Mock fetch for the S3 PUT
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    // Mock FileReader for the image preview
    class MockFileReader {
      result: string | null = null;
      onloadend: (() => void) | null = null;
      readAsDataURL(_file: Blob) {
        this.result = 'data:image/jpeg;base64,MOCK';
        this.onloadend?.();
      }
    }
    Object.defineProperty(global, 'FileReader', { value: MockFileReader, writable: true });

    render(<EventMomentComposer {...defaultProps} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Photo' }));
    });

    const input = document.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement;
    const validFile = new File([new ArrayBuffer(5 * 1024 * 1024)], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(input, 'files', { value: [validFile], writable: false, configurable: true });

    await act(async () => {
      fireEvent.change(input);
    });

    // No size error or type error should appear
    expect(screen.queryByText(/too large/i)).toBeNull();
    expect(screen.queryByText(/unsupported file type/i)).toBeNull();
  });
});
