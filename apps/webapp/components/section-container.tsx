import clsx from 'clsx';
import { PropsWithChildren } from 'react';

interface SectionContainerProps {
  className?: string;
}

const SectionContainer = ({
  children,
  className,
}: PropsWithChildren<SectionContainerProps>) => (
  <div
    className={clsx(
      `sm:py-18 container relative mx-auto px-6 py-16 md:py-24 lg:px-16 lg:py-24 xl:px-20`,
      className,
    )}
  >
    {children}
  </div>
);

export default SectionContainer;
