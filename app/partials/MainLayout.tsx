'use client';

import { ThemeProvider } from 'next-themes';
import { PropsWithChildren, useEffect, useState } from 'react';

export default function MainLayout({ children }: PropsWithChildren) {
  const [mounted, setMounted] = useState(false);

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <ThemeProvider attribute="class">
      {children}
    </ThemeProvider>
  );
}
