jest.mock('expo-file-system/legacy', () => ({
  FileSystemUploadType: {
    BINARY_CONTENT: 'BINARY_CONTENT',
  },
  uploadAsync: jest.fn(),
}));

const mockFileState = jest.fn();

jest.mock('expo-file-system', () => ({
  File: function MockFile(this: { exists: boolean; size: number }, uri: string) {
    const state = mockFileState(uri);
    this.exists = state.exists;
    this.size = state.size;
  },
}));

import { uploadAsync } from 'expo-file-system/legacy';
import { getImageAssetExtension, uploadImageAssetToSignedUrl } from '@/lib/media/upload';
import { getMomentAssetExtension, uploadMomentAssetToSignedUrl } from '@/lib/moments/upload';

describe('mobile media upload helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileState.mockReset();
  });

  it('prefers the local asset URI extension over the original library filename', () => {
    const asset = {
      fileName: 'IMG.HEIC',
      mimeType: 'image/heic',
      uri: 'file:///data/user/0/host.exp.exponent/cache/cropped1814158652.jpg',
    } as any;

    expect(getMomentAssetExtension(asset)).toBe('jpg');
    expect(getImageAssetExtension(asset)).toBe('jpg');
  });

  it('falls back to mime type when the local URI does not include an extension', () => {
    const asset = {
      fileName: 'video',
      mimeType: 'video/quicktime',
      uri: 'file:///data/user/0/host.exp.exponent/cache/video-export',
    } as any;

    expect(getMomentAssetExtension(asset)).toBe('mov');
  });

  it('uploads moment media using the resolved local mime type', async () => {
    const asset = {
      fileName: 'IMG.HEIC',
      mimeType: 'image/heic',
      uri: 'file:///data/user/0/host.exp.exponent/cache/cropped1814158652.jpg',
    } as any;

    mockFileState.mockReturnValue({ exists: true, size: 1024 });
    (uploadAsync as jest.Mock).mockResolvedValue({ status: 200 });

    await expect(uploadMomentAssetToSignedUrl('https://upload.test/moment', asset)).resolves.toBe('jpg');

    expect(uploadAsync).toHaveBeenCalledWith('https://upload.test/moment', asset.uri, {
      headers: { 'Content-Type': 'image/jpeg' },
      httpMethod: 'PUT',
      uploadType: 'BINARY_CONTENT',
    });
  });

  it('fails image uploads early when the picked asset is not available locally yet', async () => {
    const asset = {
      fileName: 'IMG.HEIC',
      mimeType: 'image/heic',
      uri: 'file:///data/user/0/host.exp.exponent/cache/cropped1814158652.jpg',
    } as any;

    mockFileState.mockReturnValue({ exists: false, size: 0 });

    await expect(uploadImageAssetToSignedUrl('https://upload.test/image', asset)).rejects.toThrow(
      'Selected media is not available on this device yet.',
    );
    expect(uploadAsync).not.toHaveBeenCalled();
  });
});
