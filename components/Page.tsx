import { PropsWithChildren } from 'react';

export default function Page({ children }: PropsWithChildren) {
  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {children}
    </div>
  );
}
