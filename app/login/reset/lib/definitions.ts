import { z } from 'zod';
import type { AppLocale } from '@/i18n/config';
import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';
import deMessages from '@/messages/de.json';
import frMessages from '@/messages/fr.json';

type ResetMessages = {
  invalidEmail: string;
  unexpectedError: string;
  invalidOrExpiredToken: string;
  passwordTooShort: string;
  passwordMismatch: string;
  emailSubject: string;
  emailBody: string;
  encryptionNotice: string;
};

const resetMessagesByLocale: Record<AppLocale, ResetMessages> = {
  en: enMessages.ResetPage.messages,
  es: esMessages.ResetPage.messages,
  de: deMessages.ResetPage.messages,
  fr: frMessages.ResetPage.messages,
};

export function getResetMessages(locale: AppLocale): ResetMessages {
  return resetMessagesByLocale[locale] ?? resetMessagesByLocale.en;
}

export function createResetFormSchema(locale: AppLocale) {
  const messages = getResetMessages(locale);

  return z.object({
    email: z
      .string()
      .email({ message: messages.invalidEmail })
      .trim(),
  });
}

export function createSetPasswordFormSchema(locale: AppLocale) {
  const messages = getResetMessages(locale);

  return z
    .object({
      token: z.string().min(1),
      password: z.string().min(8, { message: messages.passwordTooShort }),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: messages.passwordMismatch,
      path: ['confirmPassword'],
    });
}

export type FormState =
  | {
      errors?: {
        email?: string[];
      };
      message?: string;
      success?: boolean;
    }
  | undefined;

export type SetPasswordFormState =
  | {
      errors?: {
        token?: string[];
        password?: string[];
        confirmPassword?: string[];
      };
      message?: string;
      success?: boolean;
    }
  | undefined;
