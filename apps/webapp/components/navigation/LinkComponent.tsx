'use client';

import Link, { LinkProps } from 'next/link';
import React from 'react';

const LinkComponent = React.forwardRef<HTMLAnchorElement, LinkProps>(function LinkComponent(props, ref) {
  return <Link ref={ref} {...props} />;
});

LinkComponent.displayName = 'LinkComponent';

export default LinkComponent;
export type { LinkProps } from 'next/link';
