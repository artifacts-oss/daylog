import { z } from 'zod';
import type { AppLocale } from '@/i18n/config';
import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';
import deMessages from '@/messages/de.json';
import frMessages from '@/messages/fr.json';

type LoginActionMessages = {
  invalidEmail: string;
  passwordRequired: string;
  accountLocked: string;
  tooManyAttempts: string;
  invalidCredentials: string;
  signinUnexpected: string;
  userNotFound: string;
  secretNotFound: string;
  otpInvalid: string;
  attemptsRemaining: string;
  otpUnexpected: string;
};

const loginActionMessagesByLocale: Record<AppLocale, LoginActionMessages> = {
  en: enMessages.LoginPage.messages,
  es: esMessages.LoginPage.messages,
  de: deMessages.LoginPage.messages,
  fr: frMessages.LoginPage.messages,
};

export function getLoginActionMessages(locale: AppLocale): LoginActionMessages {
  return loginActionMessagesByLocale[locale] ?? loginActionMessagesByLocale.en;
}

export function createSigninFormSchema(locale: AppLocale) {
  const messages = getLoginActionMessages(locale);

  return z.object({
    email: z.string().email({ message: messages.invalidEmail }).trim(),
    password: z.string().min(1, { message: messages.passwordRequired }).trim(),
  });
}

export function createValidateMFAFormSchema(locale: AppLocale) {
  const messages = getLoginActionMessages(locale);

  return z.object({
    password: z.string().min(1, { message: messages.passwordRequired }).trim(),
  });
}

export type FormState =
  | {
      errors?: {
        email?: string[];
        password?: string[];
      };
      message?: string;
    }
  | undefined;

export type ValidateMFAFormState =
  | {
      errors?: {
        password?: string[];
      };
      message?: string;
      success?: boolean;
      isLocked?: boolean;
    }
  | undefined;
