import { fireEvent, render, screen } from '@testing-library/react';
import RemoteImage from '@/components/core/RemoteImage';

describe('RemoteImage', () => {
  it('shows fallback while loading and removes it after load', () => {
    render(
      <RemoteImage alt="Remote poster" fallback={<span>Poster fallback</span>} src="https://example.com/poster.jpg" />,
    );

    expect(screen.getByText('Poster fallback')).toBeTruthy();

    fireEvent.load(screen.getByAltText('Remote poster'));
    expect(screen.queryByText('Poster fallback')).toBeNull();
  });

  it('keeps fallback visible when the remote image fails', () => {
    render(
      <RemoteImage alt="Broken poster" fallback={<span>Broken fallback</span>} src="https://example.com/broken.jpg" />,
    );

    fireEvent.error(screen.getByAltText('Broken poster'));
    expect(screen.getByText('Broken fallback')).toBeTruthy();
  });
});
