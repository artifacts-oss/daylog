import { z } from 'zod';
import type { AppLocale } from '@/i18n/config';
import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';
import deMessages from '@/messages/de.json';
import frMessages from '@/messages/fr.json';

type InitRegisterMessages = {
  nameMin: string;
  invalidEmail: string;
  passwordMin: string;
  passwordLetter: string;
  passwordNumber: string;
  passwordSpecial: string;
  adminExists: string;
  unexpectedError: string;
};

const initRegisterMessagesByLocale: Record<AppLocale, InitRegisterMessages> = {
  en: enMessages.InitRegisterPage.messages,
  es: esMessages.InitRegisterPage.messages,
  de: deMessages.InitRegisterPage.messages,
  fr: frMessages.InitRegisterPage.messages,
};

export function getInitRegisterMessages(locale: AppLocale): InitRegisterMessages {
  return initRegisterMessagesByLocale[locale] ?? initRegisterMessagesByLocale.en;
}

export function createInitSignupFormSchema(locale: AppLocale) {
  const messages = getInitRegisterMessages(locale);

  return z.object({
    name: z.string().min(2, { message: messages.nameMin }).trim(),
    email: z.string().email({ message: messages.invalidEmail }).trim(),
    password: z
      .string()
      .min(8, { message: messages.passwordMin })
      .regex(/[a-zA-Z]/, { message: messages.passwordLetter })
      .regex(/[0-9]/, { message: messages.passwordNumber })
      .regex(/[^a-zA-Z0-9]/, {
        message: messages.passwordSpecial,
      })
      .trim(),
  });
}

export type InitFormState =
  | {
      errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
      };
      message?: string;
      success?: boolean;
      data?: {
        name?: FormDataEntryValue | null;
        email?: FormDataEntryValue | null;
        password?: FormDataEntryValue | null;
      };
    }
  | undefined;
