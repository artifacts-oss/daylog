import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import FormField from './FormField';
import PasswordInput from './PasswordInput';

describe('PasswordInput', () => {
  afterEach(cleanup);

  it('toggles password visibility', () => {
    render(<PasswordInput name="password" placeholder="Secret" />);
    const input = screen.getByPlaceholderText('Secret');
    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('forwards input props', () => {
    render(<PasswordInput id="pw" name="password" defaultValue="abc" required />);
    const input = screen.getByDisplayValue('abc');
    expect(input).toHaveAttribute('id', 'pw');
    expect(input).toHaveAttribute('name', 'password');
    expect(input).toBeRequired();
  });

  it('is used by FormField for password fields', () => {
    render(<FormField label="Password" name="password" type="password" />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
  });
});
