'use server';

import {
  getCurrentSession,
  validateSessionToken,
} from '@/app/login/lib/actions';
import { deleteSessionTokenCookie } from '@/app/login/lib/cookies';
import { prisma } from '@/prisma/client';
import { hashPassword, verifyPassword } from '@/utils/crypto';
import { generateTOTP, validateTOTP } from '@/utils/totp';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { permanentRedirect, redirect } from 'next/navigation';
import {
  AdminPasswordFormSchema,
  BackupFormSchema,
  BackupFormState,
  DeleteAccountFormSchema,
  DeleteAccountFormState,
  DeleteMFAFormSchema,
  MFAValidationFormState as DeleteMFAFormState,
  PasswordFormSchema,
  PasswordFormState,
  ProfileFormSchema,
  ProfileFormState,
  UpdateMFAFormSchema,
  MFAFormState as UpdateMFAFormState,
} from './definitions';
import { createAndVerifyTransporter } from '@/utils/email';
import { User } from '@/prisma/generated/client';
import { SECURITY_CONFIG } from '@/config/security';

export async function updateProfile(
  state: ProfileFormState,
  formData: FormData
) {
  const data = {
    id: Number(formData.get('id')),
    name: formData.get('name'),
    email: formData.get('email'),
  };

  const result = ProfileFormSchema.safeParse(data);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
      data: data,
      success: false,
    };
  }

  const { user } = await getCurrentSession();

  if (!user || (user.id !== data.id && user.role !== 'admin')) {
    return {
      message: 'Not allowed',
      success: false,
    };
  }

  try {
    // Check if the user already exists
    const existentUser = await prisma.user.findUnique({
      where: {
        NOT: { id: data.id },
        email: result.data.email,
      },
    });
    if (existentUser) {
      return {
        message: 'Email already exists.',
        success: false,
      };
    }

    await prisma.user.update({
      where: { id: data.id },
      data: {
        name: result.data.name,
        email: result.data.email,
      },
    });

    // If the user is updating their own profile, revalidate the session
    if (user.id === data.id) {
      const cookieStore = await cookies();
      const token = cookieStore.get('session')?.value ?? null;
      if (token !== null) {
        await validateSessionToken(token); // revalidate the session
      }
    } else {
      return {
        data: result.data,
        success: true,
      };
    }
  } catch (e) {
    console.error(e);
    return {
      data: result.data,
      message: 'An error occurred while updating your account.',
    };
  }

  revalidatePath(`/profile/${data.id}`);
  return redirect(`/profile/${data.id}`);
}

export async function updatePassword(
  state: PasswordFormState,
  formData: FormData
) {
  const data = {
    id: Number(formData.get('id')),
    current: formData.get('current'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  };

  const { user } = await getCurrentSession();

  if (!user) {
    return {
      message: 'Unauthorized',
      success: false,
    };
  }

  if (user.id !== data.id && user.role !== 'admin') {
    return {
      message: 'Access denied',
      success: false,
    };
  }

  const isAdmin = user.role === 'admin';

  let result;
  if (!isAdmin) {
    result = PasswordFormSchema.safeParse(data);
  } else {
    result = AdminPasswordFormSchema.safeParse(data);
  }

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

    if (result.data.password !== result.data.confirm) {
      return {
        message: 'Passwords do not match.',
        data: {
          password: result.data.password,
        },
        success: false,
      };
    }

    const isCurrentPasswordValid = await verifyPassword(
      result.data.current ?? '',
      record?.password ?? ''
    );

    if (
      !isAdmin &&
      !isCurrentPasswordValid
    ) {
      return {
        message: 'Current password is incorrect.',
        data: {
          password: result.data.password,
        },
        success: false,
      };
    }

    const hashedPassword = await hashPassword(result.data.password);
    await prisma.user.update({
      where: { id: data.id },
      data: {
        password: hashedPassword,
      },
    });

    if (user?.id !== data.id && isAdmin) {
      await prisma.session.deleteMany({
        where: { userId: data.id },
      });
    }

    return {
      success: true,
      message: 'Password updated successfully.',
    };
  } catch (e) {
    console.error(e);
    return {
      data: result.data,
      message: 'An error occurred while updating your password.',
    };
  }
}

export async function backupData(state: BackupFormState, formData: FormData) {
  const data = {
    userId: Number(formData.get('userId')),
  };

  const result = BackupFormSchema.safeParse(data);

  if (!result.success) {
    return {
      message: 'Invalid user ID.',
      success: false,
    };
  }

  const { user } = await getCurrentSession();

  if (!user || user.id !== data.userId) {
    return {
      message: 'Not allowed',
      success: false,
    };
  }

  try {
    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: {
        id: result.data.userId,
      },
      select: {
        name: true,
        email: true,
        boards: {
          include: {
            notes: true,
          },
        },
      },
    });

    if (!user) {
      return {
        message: 'User not found.',
        success: false,
      };
    }

    const data = JSON.stringify(user);

    return {
      success: true,
      data: data,
    };
  } catch (e) {
    console.error(e);
    return {
      data: result.data,
      message: 'An error occurred while backing up data.',
    };
  }
}

export async function deleteAccount(
  state: DeleteAccountFormState,
  formData: FormData
) {
  const data = {
    userId: Number(formData.get('userId')),
    password: formData.get('password'),
  };

  const result = DeleteAccountFormSchema.safeParse(data);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { user } = await getCurrentSession();
  if (!user || (user.role !== 'admin' && user.id !== data.userId)) {
    return {
      message: 'Not allowed',
      success: false,
    };
  }

  let accountDeleted = false;
  try {
    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: {
        id: result.data.userId,
        password: result.data.password,
      },
    });

    if (!user) {
      return {
        message: 'You are not allowed to perform this action.',
        success: false,
      };
    }

    const deleteUser = await prisma.user.delete({
      where: { email: user.email },
    });

    if (deleteUser) {
      accountDeleted = true;
    }
  } catch (e) {
    console.error(e);
    return {
      data: result.data,
      message: 'An error occurred while deleting your account.',
    };
  }

  if (accountDeleted) {
    await deleteSessionTokenCookie();
    permanentRedirect('/login');
  } else {
    return {
      message: 'User could not be delete.',
      success: false,
    };
  }
}

export async function getProfile(userId: number) {
  const { user } = await getCurrentSession();
  if (user === null) {
    return redirect('/login');
  }

  const record = await prisma.user.findUnique({
    where: { id: userId },
  });

  // If the user is an admin, they can view any user's profile
  if (
    record &&
    (user.role === 'admin' || record?.id === user.id)
  ) {
    return record;
  } else {
    return null;
  }
}

export async function updateMFA(state: UpdateMFAFormState, formData: FormData) {
  const data = {
    id: Number(formData.get('id')),
    secret: formData.get('secret'),
    password: formData.get('password'),
  };

  const result = UpdateMFAFormSchema.safeParse(data);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
      data: data,
      success: false,
    };
  }

  const { user } = await getCurrentSession();

  if (!user || (user.id !== data.id && user.role !== 'admin')) {
    return {
      message: 'Not allowed',
      success: false,
    };
  }

  if (!validateTOTP(result.data.secret, result.data.password)) {
    return {
      data: result.data,
      message: 'OTP is not valid.',
    };
  }

  try {
    const record = await prisma.user.findUnique({
      where: { id: data.id },
    });

    if (!record) {
      throw new Error('User not found.');
    }

    await prisma.user.update({
      where: { id: data.id },
      data: {
        mfa: true,
        secret: result.data.secret,
      },
    });

    return {
      success: true,
      message:
        'MFA device has been updated successfully you can refresh this page.',
    };
  } catch (e) {
    console.error(e);
    return {
      data: result.data,
      message: 'An error occurred while updating your MFA.',
    };
  }
}

export async function deleteMFA(state: DeleteMFAFormState, formData: FormData) {
  const data = {
    id: Number(formData.get('id')),
    password: formData.get('password'),
  };

  const result = DeleteMFAFormSchema.safeParse(data);

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
      data: data,
      success: false,
    };
  }

  const { user } = await getCurrentSession();

  if (!user || user.id !== data.id) {
    throw new Error('Not allowed');
  }

  try {
    const record = await prisma.user.findUnique({
      where: { id: data.id },
    });

    if (!record) {
      throw new Error('User not found.');
    }

    const secret = record.secret;
    if (!secret) {
      throw new Error('Secret not found');
    }

    if (
      !validateMFACode(result.data.password, record) &&
      !validateTOTP(secret, result.data.password)
    ) {
      return {
        data: result.data,
        message: 'OTP is not valid.',
      };
    }

    await prisma.user.update({
      where: { id: data.id },
      data: {
        mfa: false,
        secret: null,
        mfaCode: null,
        mfaCodeSentAt: null,
      },
    });

    return {
      success: true,
      message: 'Your device has been deleted you can refresh this page.',
    };
  } catch (e) {
    console.error(e);
    return {
      data: result.data,
      message: 'An error occurred while deleting your MFA.',
    };
  }
}

export async function sendOTP() {
  const { user } = await getCurrentSession();

  if (!user) {
    throw new Error('Not authenticated');
  }

  try {
    const currentUser = await prisma.user.findFirst({
      where: { id: user.id },
    });

    if (!currentUser || !currentUser.secret) {
      throw new Error('User or secret not found');
    }

    const transporter = await createAndVerifyTransporter();

    const code = generateTOTP(currentUser.secret, 30);

    const result = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        mfaCode: code,
        mfaCodeSentAt: new Date(),
      },
    });

    const info = await transporter.sendMail({
      from: `"${'daylog'} accounts" <${process.env.SMTP_SERVER_USER}>`,
      to: currentUser.email,
      subject: 'Account MFA code',
      text: `Your OTP is: ${result.mfaCode}.\n This code will expire in 5 minutes.`,
    });
    return {
      success: info.messageId ? true : false,
    };
  } catch (e) {
    console.error(e);
    return {
      success: false,
    };
  }
}

function validateMFACode(password: string, user: User) {
  if (!user.mfaCode || !user.mfaCodeSentAt) {
    return false;
  }

  const now = new Date();
  const diff = now.getTime() - user.mfaCodeSentAt!.getTime();
  const diffMinutes = Math.floor(diff / 1000 / 60);
  return user.mfaCode === password && diffMinutes < SECURITY_CONFIG.MFA.TIME_STEP / 60; // Convert seconds to minutes
}
