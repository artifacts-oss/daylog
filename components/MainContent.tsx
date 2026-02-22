import { PropsWithChildren } from 'react';

export default function MainContent({ children }: PropsWithChildren) {
  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden pt-16 md:pt-0">
      {children}
    </div>
  );
}
