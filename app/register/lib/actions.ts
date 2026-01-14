'use server';

import { getSettings } from '@/app/admin/lib/actions';
import { prisma } from '@/prisma/client';
import { hashPassword } from '@/utils/crypto';
import { FormState, SignupFormSchema } from './definitions';
import { getCurrentSession } from '@/app/login/lib/actions';

export async function signup(state: FormState, formData: FormData) {
  const data = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    terms: formData.get('terms'),
  };

  const result = SignupFormSchema.safeParse(data);

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
      message: 'Registration is not allowed.',
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
        message: 'User already exists.',
        success: false,
      };
    }

    const hashedPassword = hashPassword(result.data.password);

    result.data.password = hashedPassword;

    await prisma.user.create({ data: result.data });

    return {
      success: true,
    };
  } catch (e) {
    console.error(e)
    return {
      success: false,
      data: result.data,
      message: 'An error occurred while creating your account.',
    };
  }
}

export async function validateAllowRegistration(): Promise<boolean> {
  const settings = await getSettings();
  const allowReg = settings?.allowReg ?? false;
  return allowReg;
}
