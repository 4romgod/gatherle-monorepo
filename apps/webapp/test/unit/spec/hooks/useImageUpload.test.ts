import { renderHook, act } from '@testing-library/react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { ImageEntityType, ImageType } from '@/data/graphql/types/graphql';
import { useLazyQuery } from '@apollo/client';

/**
 * Unit tests for useImageUpload hook.
 * Covers the upload flow, FileReader preview, presigned URL fetch, S3 PUT,
 * error handling, and reset.
 */

// Mock @/lib/utils before imports to avoid ESM issues with jose
jest.mock('@/lib/utils', () => ({
  getAuthHeader: (token: string | undefined | null) => (token ? { Authorization: `Bearer ${token}` } : {}),
  getFileExtension: jest.fn((file: File) => file.name.split('.').pop() || 'jpg'),
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/lib/utils/auth', () => ({
  getAuthHeader: (token: string | undefined | null) => (token ? { Authorization: `Bearer ${token}` } : {}),
}));

const mockGetUploadUrl = jest.fn();

jest.mock('@apollo/client', () => ({
  useLazyQuery: jest.fn(() => [mockGetUploadUrl, {}]),
  gql: jest.fn((strings: TemplateStringsArray) => strings[0]),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: { user: { token: 'mock-token', userId: 'user-123' } },
    status: 'authenticated',
  })),
}));

// Provide a minimal FileReader that fires onloadend synchronously
class MockFileReader {
  result: string | null = null;
  onloadend: (() => void) | null = null;

  readAsDataURL(_file: Blob) {
    this.result = 'data:image/jpeg;base64,MOCK';
    this.onloadend?.();
  }
}

Object.defineProperty(global, 'FileReader', { value: MockFileReader, writable: true });

// Stub global fetch for the S3 PUT call
const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeFile(name = 'photo.jpg', type = 'image/jpeg'): File {
  return new File(['data'], name, { type });
}

const UPLOAD_URL = 'https://s3.example.com/presigned-upload';
const READ_URL = 'https://s3.example.com/presigned-read';

function mockSuccessfulUpload() {
  mockGetUploadUrl.mockResolvedValue({
    data: { getImageUploadUrl: { uploadUrl: UPLOAD_URL, readUrl: READ_URL, key: 'test/key.jpg', publicUrl: '' } },
    error: undefined,
  });
  mockFetch.mockResolvedValue({ ok: true });
}

describe('useImageUpload', () => {
  const defaultOptions = {
    entityType: ImageEntityType.Event,
    imageType: ImageType.Featured,
    entityId: 'event-001',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts with uploading=false, error=null, preview=null', () => {
    const { result } = renderHook(() => useImageUpload(defaultOptions));
    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.preview).toBeNull();
  });

  it('resolves with the readUrl on a successful upload', async () => {
    mockSuccessfulUpload();
    const { result } = renderHook(() => useImageUpload(defaultOptions));

    let returnedUrl: string | undefined;
    await act(async () => {
      returnedUrl = await result.current.upload(makeFile());
    });

    expect(returnedUrl).toBe(READ_URL);
  });

  it('calls getPresignedUploadUrl with correct variables', async () => {
    mockSuccessfulUpload();
    const { result } = renderHook(() => useImageUpload(defaultOptions));

    await act(async () => {
      await result.current.upload(makeFile('shot.png', 'image/png'));
    });

    expect(mockGetUploadUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: expect.objectContaining({
          entityType: ImageEntityType.Event,
          imageType: ImageType.Featured,
          extension: 'png',
          entityId: 'event-001',
        }),
      }),
    );
  });

  it('uses fetchPolicy:no-cache to avoid stale presigned URLs', () => {
    renderHook(() => useImageUpload(defaultOptions));
    expect(useLazyQuery).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ fetchPolicy: 'no-cache' }));
  });

  it('sets error and uploading=false when the presigned URL query fails', async () => {
    mockGetUploadUrl.mockResolvedValue({ data: undefined, error: new Error('Network error') });
    const { result } = renderHook(() => useImageUpload(defaultOptions));

    await act(async () => {
      await result.current.upload(makeFile()).catch(() => {});
    });

    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it('sets error and uploading=false when the S3 PUT request fails', async () => {
    mockGetUploadUrl.mockResolvedValue({
      data: { getImageUploadUrl: { uploadUrl: UPLOAD_URL, readUrl: READ_URL, key: 'k', publicUrl: '' } },
      error: undefined,
    });
    mockFetch.mockResolvedValue({ ok: false, status: 403, text: async () => 'Forbidden' });

    const { result } = renderHook(() => useImageUpload(defaultOptions));

    await act(async () => {
      await result.current.upload(makeFile()).catch(() => {});
    });

    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toMatch(/403/);
  });

  it('reset() clears uploading, error, and preview', async () => {
    mockGetUploadUrl.mockResolvedValue({ data: undefined, error: new Error('fail') });
    const { result } = renderHook(() => useImageUpload(defaultOptions));

    await act(async () => {
      await result.current.upload(makeFile()).catch(() => {});
    });
    expect(result.current.error).toBeTruthy();

    act(() => {
      result.current.reset();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.uploading).toBe(false);
    expect(result.current.preview).toBeNull();
  });

  it('omits entityId from query variables when not provided', async () => {
    mockSuccessfulUpload();
    const { result } = renderHook(() =>
      useImageUpload({ entityType: ImageEntityType.User, imageType: ImageType.Avatar }),
    );

    await act(async () => {
      await result.current.upload(makeFile());
    });

    const callVariables = mockGetUploadUrl.mock.calls[0][0].variables;
    expect(callVariables).not.toHaveProperty('entityId');
  });

  it('rejects and sets error for unsupported MIME type', async () => {
    const { result } = renderHook(() => useImageUpload(defaultOptions));

    await act(async () => {
      await result.current.upload(makeFile('document.pdf', 'application/pdf')).catch(() => {});
    });

    expect(result.current.error).toMatch(/Unsupported file type/);
    expect(mockGetUploadUrl).not.toHaveBeenCalled();
  });

  it('rejects and sets error when file exceeds max size', async () => {
    const bigFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    const { result } = renderHook(() => useImageUpload(defaultOptions));

    await act(async () => {
      await result.current.upload(bigFile).catch(() => {});
    });

    expect(result.current.error).toMatch(/too large/);
    expect(mockGetUploadUrl).not.toHaveBeenCalled();
  });

  it('throws when getImageUploadUrl returns no data', async () => {
    mockGetUploadUrl.mockResolvedValue({ data: { getImageUploadUrl: null }, error: undefined });
    const { result } = renderHook(() => useImageUpload(defaultOptions));

    await act(async () => {
      await result.current.upload(makeFile()).catch(() => {});
    });

    expect(result.current.error).toBe('Image upload failed. Please try again.');
  });

  it('handles non-Error throws in catch block', async () => {
    mockGetUploadUrl.mockRejectedValue('string-error');
    const { result } = renderHook(() => useImageUpload(defaultOptions));

    await act(async () => {
      await result.current.upload(makeFile()).catch(() => {});
    });

    expect(result.current.error).toBe('Image upload failed. Please try again.');
  });
});
