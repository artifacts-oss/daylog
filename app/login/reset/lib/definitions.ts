import { z } from 'zod';
import type { AppLocale } from '@/i18n/config';
import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';
import deMessages from '@/messages/de.json';
import frMessages from '@/messages/fr.json';

type ResetMessages = {
  invalidEmail: string;
  notRegistered: string;
  unexpectedError: string;
  emailSubject: string;
  emailBody: string;
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

export type FormState =
  | {
      errors?: {
        email?: string[];
      };
      message?: string;
    }
  | undefined;
