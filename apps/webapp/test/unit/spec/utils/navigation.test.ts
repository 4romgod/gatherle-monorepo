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
});
