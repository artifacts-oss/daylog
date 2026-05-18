import messages from '@/messages/en.json';
import { NextIntlClientProvider } from 'next-intl';
import { PropsWithChildren, ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

function IntlWrapper({ children }: PropsWithChildren) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

export function renderWithIntl(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: IntlWrapper, ...options });
}