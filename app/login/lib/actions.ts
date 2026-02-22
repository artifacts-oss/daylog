'use server';

import type { Session, User } from '@/prisma/generated/client';

import { getSettings } from '@/app/(authenticated)/admin/lib/actions';
import { prisma } from '@/prisma/client';
import { encodeBase32, encodeHex, verifyPassword } from '@/utils/crypto';
import { randomDelay } from '@/utils/delay';
import { validateTOTP } from '@/utils/totp';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { setSessionTokenCookie } from './cookies';
import {
  FormState,
  SigninFormSchema,
  ValidateMFAFormSchema,
  ValidateMFAFormState,
} from './definitions';
import { NextRequest } from 'next/server';
import { authRateLimiter, getClientIP } from '@/utils/rateLimit';
import { SECURITY_CONFIG } from '@/config/security';

interface AttemptLimitResult {
  isLocked: boolean;
  lockUntil?: Date;
  remainingAttempts?: number;
  message?: string;
}

async function checkAttemptLimit(user: {
  id: number;
  failedAttempts?: number | null;
  lockUntil?: Date | null;
}): Promise<AttemptLimitResult> {
  const MAX_FAILED_ATTEMPTS = SECURITY_CONFIG.LOCKOUT.MAX_FAILED_ATTEMPTS;
  
  if (user.lockUntil && Date.now() < user.lockUntil.getTime()) {
    return {
      isLocked: true,
      lockUntil: user.lockUntil,
      message: 'Account temporarily locked. Please try again later.',
    };
  }
  
  const remainingAttempts = MAX_FAILED_ATTEMPTS - (user.failedAttempts || 0);
  
  return {
    isLocked: false,
    remainingAttempts,
  };
}

async function registerFailedAttempt(userId: number): Promise<AttemptLimitResult> {
  const MAX_FAILED_ATTEMPTS = SECURITY_CONFIG.LOCKOUT.MAX_FAILED_ATTEMPTS;
  const LOCK_DURATION = SECURITY_CONFIG.LOCKOUT.LOCK_DURATION_MS;
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedAttempts: true }
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const newFailedAttempts = (user.failedAttempts || 0) + 1;
  const shouldLock = newFailedAttempts >= MAX_FAILED_ATTEMPTS;
  
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      failedAttempts: newFailedAttempts,
      lockUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION) : null,
    },
  });
  
  return await checkAttemptLimit(updatedUser);
}

async function resetFailedAttempts(userId: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedAttempts: 0,
      lockUntil: null,
    },
  });
}

export async function validateAdminUserNotExists(): Promise<boolean> {
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
  return !admin;
}

async function generateSessionToken(): Promise<string> {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const token = encodeBase32(bytes);
  return token;
}

async function createSession(token: string, userId: number): Promise<Session> {
  const sessionId = encodeHex(token);
  const session: Session = {
    id: sessionId,
    userId,
    expiresAt: new Date(
      Date.now() + SECURITY_CONFIG.SESSION.EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    ),
  };
  await prisma.session.create({
    data: session,
  });
  return session;
}

export async function validateSessionToken(
  token: string,
): Promise<SessionValidationResult> {
  const sessionId = encodeHex(token);
  const result = await prisma.session.findUnique({
    where: {
      id: sessionId,
    },
    include: {
      user: true,
    },
  });
  if (result === null) {
    return { session: null, user: null };
  }
  const { user, ...session } = result;
  if (Date.now() >= session.expiresAt.getTime()) {
    await prisma.session.delete({ where: { id: sessionId } });
    return { session: null, user: null };
  }
  if (
    Date.now() >=
    session.expiresAt.getTime() -
      SECURITY_CONFIG.SESSION.RENEWAL_THRESHOLD_DAYS * 24 * 60 * 60 * 1000
  ) {
    session.expiresAt = new Date(
      Date.now() + SECURITY_CONFIG.SESSION.EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );
    await prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        expiresAt: session.expiresAt,
      },
    });
  }
  return { session, user };
}

export type SessionValidationResult =
  | { session: Session; user: User }
  | { session: null; user: null };

export async function signin(
  state: FormState,
  formData: FormData,
  request?: NextRequest,
) {
  const callbackUrl = formData.get('callbackUrl')?.toString() || '/';
  const result = SigninFormSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  // Rate limiting check
  if (request) {
    const ip = getClientIP(request);
    const rateLimitResult = authRateLimiter.isAllowed(`signin:${ip}`);

    if (!rateLimitResult.allowed) {
      return {
        data: result.data,
        message: 'Too many login attempts. Please try again later.',
      };
    }
  }

  let goMFA = false;
  let userId: number | null = null;

  try {
    if (!result.success) {
      return {
        data: result.data,
        errors: result.error.flatten().fieldErrors,
      };
    }

    await randomDelay();
    const record = await prisma.user.findFirst({
      where: { email: result.data.email },
    });

    if (!record) {
      console.warn(`Failed login attempt for email: ${result.data.email}`);
      return {
        data: result.data,
        message: 'Invalid email or password.',
      };
    }

    const attemptLimit = await checkAttemptLimit(record);
    if (attemptLimit.isLocked) {
      console.warn(
        `Account locked: User with email ${result.data.email} is temporarily locked until ${attemptLimit.lockUntil}`,
      );
      return {
        data: result.data,
        message: attemptLimit.message,
      };
    }

    const isPasswordValid = await verifyPassword(
      result.data.password,
      record.password,
    );
    if (!isPasswordValid) {
      const failedAttemptResult = await registerFailedAttempt(record.id);
      
      console.warn(`Failed login attempt for email: ${result.data.email}`);
      return {
        data: result.data,
        message: failedAttemptResult.isLocked 
          ? failedAttemptResult.message 
          : 'Invalid email or password.',
      };
    }

    // Reset failed attempts on successful login
    await resetFailedAttempts(record.id);

    const settings = await getSettings();
    if (record.mfa && settings?.mfa) {
      goMFA = record.mfa;
      userId = record.id;
    } else {
      await generateUserSession(record);
    }
  } catch (e) {
    console.error(e);
    return {
      data: result.data,
      message: 'An error occurred while signing in to your account.',
    };
  }

  if (goMFA && userId !== null) {
    revalidatePath(`/login/otp/${userId}`);
    redirect(`/login/otp/${userId}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  } else {
    revalidatePath('/');
    redirect(callbackUrl);
  }
}

export const getCurrentSession = cache(
  async (
    req?: NextRequest | null,
    token?: string | null,
  ): Promise<SessionValidationResult> => {
    if (token == null && req) {
      token = req.cookies.get('session')?.value ?? null;
    } else if (token == null) {
      const cookieStore = await cookies();
      token = cookieStore.get('session')?.value ?? null;
    }
    if (token === null) {
      return { session: null, user: null };
    }
    const result = await validateSessionToken(token);
    return result;
  },
);

export async function validateMFA(
  state: ValidateMFAFormState,
  formData: FormData,
) {
  const data = {
    id: Number(formData.get('id')),
    password: formData.get('password'),
  };

  const result = ValidateMFAFormSchema.safeParse(data);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
      data: data,
      success: false,
    };
  }

  try {
    const record = await prisma.user.findUnique({
      where: { id: data.id },
    });

    if (!record) {
      throw new Error('User not found.');
    }

    const attemptLimit = await checkAttemptLimit(record);
    if (attemptLimit.isLocked) {
      console.warn(
        `Account locked for OTP validation: User ${data.id} is temporarily locked until ${attemptLimit.lockUntil}`,
      );
      return {
        data: result.data,
        message: attemptLimit.message,
        success: false,
      };
    }

    const secret = record.secret;
    if (!secret) {
      throw new Error('Secret not found');
    }

    if (!validateTOTP(secret, result.data.password)) {
      const failedAttemptResult = await registerFailedAttempt(record.id);
      
      let message = failedAttemptResult.isLocked 
        ? failedAttemptResult.message 
        : 'OTP is not valid or is expired.';
      
      if (!failedAttemptResult.isLocked && failedAttemptResult.remainingAttempts !== undefined) {
        message += ` ${failedAttemptResult.remainingAttempts} attempts remaining.`;
      }
      
      return {
        data: result.data,
        message,
        success: false,
      };
    }

    // Reset failed attempts on successful OTP validation
    await resetFailedAttempts(record.id);
    await generateUserSession(record);
  } catch (e) {
    console.error(e);
    return {
      data: result.data,
      message: 'An error occurred while validating your OTP.',
      success: false,
    };
  }

  revalidatePath('/');
  const callbackUrl = formData.get('callbackUrl')?.toString() || '/';
  redirect(callbackUrl);
}

async function generateUserSession(record: {
  name: string | null;
  id: number;
  email: string;
  password: string;
  secret: string | null;
  mfa: boolean;
  role: string;
  terms: string;
}) {
  const token = await generateSessionToken();
  await createSession(token, record!.id);
  await setSessionTokenCookie(
    token,
    new Date(
      Date.now() + SECURITY_CONFIG.SESSION.EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    ),
  );
}

export async function getUserMFA(userId: number) {
  try {
    const record = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!record) {
      throw new Error('User not found.');
    }

    return record.mfa;
  } catch (e) {
    console.error(e);
    return false;
  }
}
