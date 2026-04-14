import { navigateWithProgress, navigateToHash } from '@/lib/utils/navigation';
import NProgress from 'nprogress';

jest.mock('nprogress', () => ({
  start: jest.fn(),
}));

describe('navigation utilities', () => {
  it('starts the progress bar before navigating', () => {
    const router = { push: jest.fn() };

    navigateWithProgress(router as any, '/events', { scroll: false });

    expect(NProgress.start).toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith('/events', { scroll: false });
  });

  it('navigates to hash and scrolls to the element', () => {
    const pushState = jest.fn();
    const scrollIntoView = jest.fn();

    window.history.pushState = pushState;
    document.querySelector = jest.fn(() => ({ scrollIntoView }) as any);

    navigateToHash('section-1');

    expect(pushState).toHaveBeenCalledWith(null, '', '#section-1');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('prepends # when hash does not start with it', () => {
    const pushState = jest.fn();
    window.history.pushState = pushState;
    document.querySelector = jest.fn(() => null);

    navigateToHash('no-hash-prefix');

    expect(pushState).toHaveBeenCalledWith(null, '', '#no-hash-prefix');
  });

  it('does not scroll when the target element is not found', () => {
    const scrollIntoView = jest.fn();
    window.history.pushState = jest.fn();
    document.querySelector = jest.fn(() => null);

    navigateToHash('#missing-element');

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('falls back to window.location.hash when pushState is unavailable', () => {
    // jsdom's history.pushState is non-configurable; spy on the history getter instead
    const historySpy = jest.spyOn(window, 'history', 'get').mockReturnValue({
      pushState: undefined as any,
    } as History);
    document.querySelector = jest.fn(() => null);

    navigateToHash('#fallback');

    expect(window.location.hash).toBe('#fallback');

    historySpy.mockRestore();
  });
});
