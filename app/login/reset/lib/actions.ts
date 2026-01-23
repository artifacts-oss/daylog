'use server';

import { prisma } from '@/prisma/client';
import { hashPassword } from '@/utils/crypto';
import { createAndVerifyTransporter } from '@/utils/email';
import { randomBytes } from 'crypto';
import { FormState, ResetFormSchema } from './definitions';

export async function reset(state: FormState, formData: FormData) {
  const result = ResetFormSchema.safeParse({
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
      select: { id: true, email: true },
    });

    if (!record) {
      return {
        message: 'This email is no registered.',
      };
    }

    // Create a transporter object using the default SMTP transport.
    // Expecting error if SMTPTransport is not well configured.
    const transporter = await createAndVerifyTransporter();

    // Generate a new password and hash it
const newPassword = randomBytes(8).toString('hex');
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: record.id },
      data: { password: hashedPassword },
    });

    const info = await transporter.sendMail({
      from: `"${'daylog'} accounts" <${process.env.SMTP_SERVER_USER}>`,
      to: record.email,
      subject: 'Account password reset',
      text: `Your account password has been reset, use ${newPassword} to login. Remember to change your password in profile section.`,
    });
    return {
      success: info.messageId ? true : false,
    };
  } catch (e) {
    console.error(e);
    return {
      message: `An error occurred while reseting your account.`,
    };
  }
}