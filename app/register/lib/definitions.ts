import { z } from 'zod';
import type { AppLocale } from '@/i18n/config';
import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';
import deMessages from '@/messages/de.json';
import frMessages from '@/messages/fr.json';

type RegisterMessages = {
  nameMin: string;
  invalidEmail: string;
  passwordMin: string;
  passwordLetter: string;
  passwordNumber: string;
  passwordSpecial: string;
  termsRequired: string;
  registrationNotAllowed: string;
  userExists: string;
  unexpectedError: string;
};

const registerMessagesByLocale: Record<AppLocale, RegisterMessages> = {
  en: enMessages.RegisterPage.messages,
  es: esMessages.RegisterPage.messages,
  de: deMessages.RegisterPage.messages,
  fr: frMessages.RegisterPage.messages,
};

export function getRegisterMessages(locale: AppLocale): RegisterMessages {
  return registerMessagesByLocale[locale] ?? registerMessagesByLocale.en;
}

export function createSignupFormSchema(locale: AppLocale) {
  const messages = getRegisterMessages(locale);

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
    terms: z.string({ message: messages.termsRequired }).trim(),
  });
}

export type FormState =
  | {
      errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
        terms?: string[];
      };
      message?: string;
    }
  | undefined;
