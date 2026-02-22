'use client';

import { PropsWithChildren } from 'react';

export default function PageBody({ children }: PropsWithChildren) {
  return (
    <div className="flex-1 px-4 md:px-6 lg:px-8 py-6">
      <div className="max-w-7xl mx-auto">{children}</div>
    </div>
  );
}
