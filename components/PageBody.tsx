'use client';

import { PropsWithChildren } from 'react';

export default function PageBody({ children }: PropsWithChildren) {
  return (
    <div
      className="relative flex-1 px-5 py-5 md:px-8 md:py-8 overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 0% 20%, hsl(var(--color-primary) / 0.03) 0%, transparent 50%),
          radial-gradient(circle at 100% 80%, hsl(var(--color-primary) / 0.02) 0%, transparent 50%),
          var(--color-background)
        `,
      }}
    >
      <div className="relative z-10 max-w-7xl mx-auto">{children}</div>
    </div>
  );
}
