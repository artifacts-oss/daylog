'use server';

import { getSettings } from '@/app/(authenticated)/admin/lib/actions';
import { defaultLocale, isValidLocale, localeCookieName } from '@/i18n/config';
import { prisma } from '@/prisma/client';
import { hashPassword } from '@/utils/crypto';
import { createSignupFormSchema, FormState, getRegisterMessages } from './definitions';
import { getCurrentSession } from '@/app/login/lib/actions';
import { cookies } from 'next/headers';

async function getCurrentLocale() {
  try {
    const cookieStore = await cookies();
    const requestedLocale = cookieStore.get(localeCookieName)?.value;

    if (requestedLocale && isValidLocale(requestedLocale)) {
      return requestedLocale;
    }
  } catch {
    // Fallback for tests or non-request contexts.
  }

  return defaultLocale;
}

export async function signup(state: FormState, formData: FormData) {
  const locale = await getCurrentLocale();
  const messages = getRegisterMessages(locale);
  const data = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    terms: formData.get('terms'),
  };

  const result = createSignupFormSchema(locale).safeParse(data);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
      data: data,
      success: false,
    };
  }

  const isRegistrationAllowed = await validateAllowRegistration();

  const { user } = await getCurrentSession();

  if (!isRegistrationAllowed && (!user || user?.role !== 'admin')) {
    return {
      message: messages.registrationNotAllowed,
      success: false,
    };
  }

  try {
    // Changes the "on" value of checkbox to "accept"
    result.data.terms = 'accept';

    // Check if the user already exists
    const user = await prisma.user.findUnique({
      where: {
        email: result.data.email,
      },
    });
    if (user) {
      return {
        message: messages.userExists,
        success: false,
      };
    }

    const hashedPassword = await hashPassword(result.data.password);

    result.data.password = hashedPassword;

    await prisma.user.create({ data: result.data });

    return {
      success: true,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      data: result.data,
      message: messages.unexpectedError,
    };
  }
}

export async function validateAllowRegistration(): Promise<boolean> {
  const settings = await getSettings();
  const allowReg = settings?.allowReg ?? false;
  return allowReg;
}
