'use client';

import { PropsWithChildren } from 'react';

export default function PageBody({ children }: PropsWithChildren) {
  return (
    <div className="flex-1 px-5 py-5 md:px-8 md:py-8">
      <div className="max-w-7xl mx-auto">{children}</div>
    </div>
  );
}
