import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import LocaleSwitcher from './LocaleSwitcher';
import { changeLocale } from '@/lib/locale';
import { locales } from '@/i18n/config';

vi.mock('@/lib/locale', () => ({
  changeLocale: vi.fn(),
}));

afterEach(cleanup);

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists every configured locale with the current one checked', async () => {
    const user = userEvent.setup();
    render(<LocaleSwitcher />);

    await user.click(screen.getByRole('button', { name: 'Switch language' }));

    const items = await screen.findAllByRole('menuitemradio');
    expect(items).toHaveLength(locales.length);
    expect(screen.getByRole('menuitemradio', { name: 'English' })).toBeChecked();
    expect(screen.getByRole('menuitemradio', { name: 'Spanish' })).not.toBeChecked();
  });

  it('calls changeLocale with the selected and current locale and disables the trigger', async () => {
    vi.mocked(changeLocale).mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<LocaleSwitcher />);

    await user.click(screen.getByRole('button', { name: 'Switch language' }));
    await user.click(await screen.findByRole('menuitemradio', { name: 'Spanish' }));

    expect(changeLocale).toHaveBeenCalledWith('es', 'en');
    expect(screen.getByRole('button', { name: 'Switch language' })).toBeDisabled();
  });
});
