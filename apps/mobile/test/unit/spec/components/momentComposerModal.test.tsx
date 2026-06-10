import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { MomentComposerModal } from '@/components/moments/MomentComposerModal';

const mockLaunchImageLibraryAsync = jest.fn();
const mockCreateMoment = jest.fn();
const mockEnsurePickedAssetIsAvailableLocally = jest.fn();

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibraryAsync(...args),
  UIImagePickerPreferredAssetRepresentationMode: {
    Compatible: 'Compatible',
  },
  VideoExportPreset: {
    MediumQuality: 'MediumQuality',
  },
}));

jest.mock('expo-video', () => ({
  VideoView: (props: object) => {
    const ReactNative = require('react-native');
    return <ReactNative.View {...props} />;
  },
  useVideoPlayer: () => ({
    loop: false,
    muted: false,
    pause: jest.fn(),
    play: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

jest.mock('@/app/theme/AppThemeProvider', () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        background: '#05070d',
        border: '#1f2430',
        error: '#ff5f56',
        errorSoft: '#2b1215',
        primary: '#6c63ff',
        primaryContrast: '#ffffff',
        primarySoft: '#201d45',
        secondary: '#ff8b3d',
        surface: '#0f1420',
        textMuted: '#7d8596',
        textPrimary: '#f4f7fb',
        textSecondary: '#b7c0d1',
      },
    },
  }),
}));

jest.mock('@/hooks/moments/useCreateEventMoment', () => ({
  useCreateEventMoment: () => ({
    createMoment: mockCreateMoment,
    loading: false,
  }),
}));

jest.mock('@/lib/media/pickedAsset', () => ({
  ensurePickedAssetIsAvailableLocally: (...args: unknown[]) => mockEnsurePickedAssetIsAvailableLocally(...args),
}));

describe('MomentComposerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsurePickedAssetIsAvailableLocally.mockResolvedValue({
      extension: 'jpg',
      fileSize: 1024,
      mimeType: 'image/jpeg',
      uri: 'file:///mock.jpg',
    });
  });

  function renderComposer(onClose = jest.fn()) {
    render(<MomentComposerModal authToken="token" eventId="event-1" onClose={onClose} onCreated={jest.fn()} open />);

    return { onClose };
  }

  it('clears the blocking state when image picking throws so the modal can be closed', async () => {
    mockLaunchImageLibraryAsync.mockRejectedValueOnce(new Error('Picker failed.'));
    const { onClose } = renderComposer();

    fireEvent.press(screen.getByText('Image'));
    fireEvent.press(screen.getByText('Choose image'));

    await waitFor(() => expect(screen.getByText('Image unavailable')).toBeTruthy());
    expect(screen.getByText('Picker failed.')).toBeTruthy();
    expect(screen.queryByText('Preparing image')).toBeNull();

    fireEvent.press(screen.getByLabelText('Close moment composer'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockEnsurePickedAssetIsAvailableLocally).not.toHaveBeenCalled();
  });

  it('clears the blocking state when video picking throws so the modal can be closed', async () => {
    mockLaunchImageLibraryAsync.mockRejectedValueOnce(new Error('Video picker failed.'));
    const { onClose } = renderComposer();

    fireEvent.press(screen.getByText('Video'));
    fireEvent.press(screen.getByText('Choose video'));

    await waitFor(() => expect(screen.getByText('Video unavailable')).toBeTruthy());
    expect(screen.getByText('Video picker failed.')).toBeTruthy();
    expect(screen.queryByText('Preparing video')).toBeNull();

    fireEvent.press(screen.getByLabelText('Close moment composer'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockEnsurePickedAssetIsAvailableLocally).not.toHaveBeenCalled();
  });
});
