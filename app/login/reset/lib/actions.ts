'use server';

import { defaultLocale, isValidLocale, localeCookieName } from '@/i18n/config';
import { prisma } from '@/prisma/client';
import { hashPassword, verifyPassword } from '@/utils/crypto';
import { createAndVerifyTransporter } from '@/utils/email';
import { createHash, randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import {
  createResetFormSchema,
  createSetPasswordFormSchema,
  FormState,
  SetPasswordFormState,
  getResetMessages,
} from './definitions';

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

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

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function reset(state: FormState, formData: FormData) {
  const locale = await getCurrentLocale();
  const messages = getResetMessages(locale);
  const result = createResetFormSchema(locale).safeParse({
    email: formData.get('email'),
  });

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const record = await prisma.user.findFirst({
      where: { email: result.data.email },
      select: { id: true, email: true, encryptionEnabled: true },
    });

    // Always return success to prevent user enumeration (CWE-204).
    if (!record) {
      return { success: true };
    }

    const transporter = await createAndVerifyTransporter();

    const token = randomBytes(32).toString('hex');
    const hashedToken = hashResetToken(token);
    const expires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await prisma.user.update({
      where: { id: record.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expires,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const resetLink = `${appUrl}/login/reset/${token}`;

    const encryptionNotice = record.encryptionEnabled
      ? messages.encryptionNotice
      : '';

    await transporter.sendMail({
      from: `"${'daylog'} accounts" <${process.env.SMTP_SERVER_USER}>`,
      to: record.email,
      subject: messages.emailSubject,
      text: messages.emailBody
        .replace('{resetLink}', resetLink)
        .replace('{expiryMinutes}', '60') + encryptionNotice,
    });

    return { success: true };
  } catch (e) {
    console.error(e);
    return {
      message: messages.unexpectedError,
    };
  }
}

export async function setPassword(
  state: SetPasswordFormState,
  formData: FormData,
) {
  const locale = await getCurrentLocale();
  const messages = getResetMessages(locale);
  const result = createSetPasswordFormSchema(locale).safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const hashedToken = hashResetToken(result.data.token);

    const record = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() },
      },
      select: { id: true, encryptionEnabled: true },
    });

    if (!record) {
      return { message: messages.invalidOrExpiredToken };
    }

    const hashedPassword = await hashPassword(result.data.password);

    await prisma.user.update({
      where: { id: record.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        // If encryption was enabled, the derived key is now unrecoverable.
        // Mark data as locked so the recovery flow is shown on next login.
        ...(record.encryptionEnabled ? { encryptedDataLocked: true } : {}),
      },
    });

    if (record.encryptionEnabled) {
      await prisma.session.deleteMany({ where: { userId: record.id } });
    }

    return { success: true };
  } catch (e) {
    console.error(e);
    return { message: messages.unexpectedError };
  }
}
