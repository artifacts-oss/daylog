import { PropsWithChildren } from 'react';
import Template from './Template';

export default function PageContainer({ children }: PropsWithChildren) {
  return (
    <div className="flex-1 overflow-y-auto">
      <Template>{children}</Template>
    </div>
  );
}
