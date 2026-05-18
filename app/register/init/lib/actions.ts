'use server';

import { defaultLocale, isValidLocale, localeCookieName } from '@/i18n/config';
import { prisma } from '@/prisma/client';
import { hashPassword } from '@/utils/crypto';
import { revalidatePath } from 'next/cache';
import {
  createInitSignupFormSchema,
  getInitRegisterMessages,
  InitFormState,
} from './definitions';
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

export async function validateAdminUserExists() : Promise<boolean> {
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  return admin !== null;
}

export async function signupInit(state: InitFormState, formData: FormData) {
  const locale = await getCurrentLocale();
  const messages = getInitRegisterMessages(locale);
  const data = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const result = createInitSignupFormSchema(locale).safeParse(data);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
      data: data,
      success: false,
    };
  }

  try {
    // Check if the admin user already exists
    const user = await prisma.user.findUnique({
      where: {
        email: result.data.email,
        AND: { role: 'admin' },
      },
    });
    if (user) {
      return {
        message: messages.adminExists,
        success: false,
      };
    }

    const hashedPassword = await hashPassword(result.data.password);
    
    await prisma.user.create({
      data: {
        name: result.data.name,
        email: result.data.email,
        password: hashedPassword,
        terms: 'accept',
        role: 'admin',
      },
    });

    revalidatePath('/login', 'layout');

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
