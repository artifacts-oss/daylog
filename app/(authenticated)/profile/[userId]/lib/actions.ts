'use server';

import {
  getCurrentSession,
  validateSessionToken,
} from '@/app/login/lib/actions';
import { deleteSessionTokenCookie } from '@/app/login/lib/cookies';
import { prisma } from '@/prisma/client';
import { hashPassword, verifyPassword } from '@/utils/crypto';
import {
  deriveEncryptionKey,
  encryptBoardFields,
  decryptBoardFields,
  encryptNoteFields,
  decryptNoteFields,
  generateEncryptionSalt,
  wrapKeyWithMaster,
  reEncryptAll,
  isEncrypted,
  encryptField,
  decryptField,
} from '@/utils/encryption';
import { encodeHex } from '@/utils/crypto';
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
  EncryptionFormSchema,
  EncryptionFormState,
  RecoverEncryptionFormSchema,
  RecoverEncryptionFormState,
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
      // Admin changed another user's password — if that user had encryption enabled,
      // we can't re-encrypt (old password unknown), so disable encryption and mark data locked.
      if (record.encryptionEnabled) {
        await prisma.user.update({
          where: { id: data.id },
          data: { encryptedDataLocked: true, encryptionEnabled: false },
        });
      }
      await prisma.session.deleteMany({
        where: { userId: data.id },
      });
    } else if (record.encryptionEnabled && record.encryptionSalt) {
      // Self password change — re-encrypt all data with new key
      const oldPassword = result.data.current ?? '';
      const newPassword = result.data.password;
      const oldKey = await deriveEncryptionKey(oldPassword, record.encryptionSalt);
      const newKey = await deriveEncryptionKey(newPassword, record.encryptionSalt);
      await reEncryptAll(data.id, oldKey, newKey);
      const cookieStore = await cookies();
      const token = cookieStore.get('session')?.value;
      if (token) {
        const sessionId = encodeHex(token);
        const wrapped = wrapKeyWithMaster(newKey);
        await prisma.session.update({ where: { id: sessionId }, data: { encryptedKey: wrapped } });
        await prisma.session.updateMany({
          where: { userId: data.id, id: { not: sessionId } },
          data: { encryptedKey: null },
        });
      }
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

    // Decrypt content fields before exporting so the backup is human-readable
    const { user: sessionUser } = await getCurrentSession();
    const key = sessionUser?.encryptionEnabled ? await (async () => {
      const { getCurrentSessionKey } = await import('@/app/(authenticated)/lib/encryptionKey');
      return getCurrentSessionKey();
    })() : null;

    const exportData = key ? {
      ...user,
      boards: user.boards.map((b) => ({
        ...decryptBoardFields(b, key),
        notes: b.notes.map((n) => decryptNoteFields(n, key)),
      })),
    } : user;

    const data = JSON.stringify(exportData);

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
    // Re-authenticate against the target account's password hash.
    // The previous implementation compared the plaintext password directly
    // in the WHERE clause against the bcrypt hash, which never matched.
    const targetUser = await prisma.user.findUnique({
      where: { id: result.data.userId },
    });

    if (
      !targetUser ||
      !(await verifyPassword(result.data.password, targetUser.password))
    ) {
      return {
        message: 'You are not allowed to perform this action.',
        success: false,
      };
    }

    const deleteUser = await prisma.user.delete({
      where: { email: targetUser.email },
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

export type SafeProfile = Pick<
  User,
  | 'id'
  | 'email'
  | 'name'
  | 'role'
  | 'mfa'
  | 'terms'
  | 'encryptionEnabled'
  | 'encryptedDataLocked'
>;

export async function getProfile(userId: number): Promise<SafeProfile | null> {
  const { user } = await getCurrentSession();
  if (user === null) {
    return redirect('/login');
  }

  // Never expose sensitive fields (password hash, TOTP secret, MFA code,
  // encryption salt, lockout state) to the client (CWE-213).
  const record = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      mfa: true,
      terms: true,
      encryptionEnabled: true,
      encryptedDataLocked: true,
    },
  });

  // If the user is an admin, they can view any user's profile
  if (record && (user.role === 'admin' || record?.id === user.id)) {
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

export async function enableEncryption(
  state: EncryptionFormState,
  formData: FormData,
): Promise<EncryptionFormState> {
  const data = { password: formData.get('password') };
  const result = EncryptionFormSchema.safeParse(data);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors, success: false };
  }

  if (!process.env.ENCRYPTION_MASTER_KEY) {
    return { message: 'Encryption is not configured on this server.', success: false };
  }

  const { user } = await getCurrentSession();
  if (!user) return { message: 'Unauthorized', success: false };

  try {
    const record = await prisma.user.findUnique({ where: { id: user.id } });
    if (!record) return { message: 'User not found.', success: false };

    const isValid = await verifyPassword(result.data.password, record.password);
    if (!isValid) return { message: 'Current password is incorrect.', success: false };

    const salt = record.encryptionSalt ?? generateEncryptionSalt();
    const key = await deriveEncryptionKey(result.data.password, salt);

    const boards = await prisma.board.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, description: true },
    });
    const notes = await prisma.note.findMany({
      where: { boards: { userId: user.id } },
      select: { id: true, title: true, content: true },
    });
    const noteIds = notes.map((n) => n.id);
    const noteChanges = await prisma.noteChange.findMany({
      where: { noteId: { in: noteIds } },
      select: { id: true, diffPatch: true, previousContent: true },
    });
    const changeComments = await prisma.changeComment.findMany({
      where: { change: { noteId: { in: noteIds } } },
      select: { id: true, content: true },
    });

    // Skip values that are somehow already encrypted (idempotency safety)
    const encrypt = (value: string) => (isEncrypted(value) ? value : encryptField(value, key));

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { encryptionEnabled: true, encryptionSalt: salt },
      }),
      ...boards.map((b) => {
        const enc = encryptBoardFields(b, key);
        return prisma.board.update({
          where: { id: b.id },
          data: { title: enc.title, description: enc.description },
        });
      }),
      ...notes.map((n) => {
        const enc = encryptNoteFields(n, key);
        return prisma.note.update({
          where: { id: n.id },
          data: { title: enc.title, content: enc.content },
        });
      }),
      ...noteChanges.map((nc) =>
        prisma.noteChange.update({
          where: { id: nc.id },
          data: {
            diffPatch: encrypt(nc.diffPatch),
            previousContent:
              nc.previousContent != null ? encrypt(nc.previousContent) : nc.previousContent,
          },
        }),
      ),
      ...changeComments.map((cc) =>
        prisma.changeComment.update({
          where: { id: cc.id },
          data: { content: encrypt(cc.content) },
        }),
      ),
    ]);

    // Store key in current session and clear all other sessions' keys
    const cookieStore = await cookies();
    const token = cookieStore.get('session')?.value;
    if (token) {
      const sessionId = encodeHex(token);
      const wrapped = wrapKeyWithMaster(key);
      await prisma.session.update({ where: { id: sessionId }, data: { encryptedKey: wrapped } });
      await prisma.session.updateMany({
        where: { userId: user.id, id: { not: sessionId } },
        data: { encryptedKey: null },
      });
    }

    revalidatePath(`/profile/${user.id}`);
    return { success: true, message: 'Encryption enabled successfully.' };
  } catch (e) {
    console.error(e);
    return { message: 'An error occurred while enabling encryption.', success: false };
  }
}

export async function disableEncryption(
  state: EncryptionFormState,
  formData: FormData,
): Promise<EncryptionFormState> {
  const data = { password: formData.get('password') };
  const result = EncryptionFormSchema.safeParse(data);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors, success: false };
  }

  const { user } = await getCurrentSession();
  if (!user) return { message: 'Unauthorized', success: false };

  try {
    const record = await prisma.user.findUnique({ where: { id: user.id } });
    if (!record) return { message: 'User not found.', success: false };

    const isValid = await verifyPassword(result.data.password, record.password);
    if (!isValid) return { message: 'Current password is incorrect.', success: false };

    if (!record.encryptionSalt) return { message: 'No encryption key found.', success: false };

    const key = await deriveEncryptionKey(result.data.password, record.encryptionSalt);

    const boards = await prisma.board.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, description: true },
    });
    const notes = await prisma.note.findMany({
      where: { boards: { userId: user.id } },
      select: { id: true, title: true, content: true },
    });
    const noteIds = notes.map((n) => n.id);
    const noteChanges = await prisma.noteChange.findMany({
      where: { noteId: { in: noteIds } },
      select: { id: true, diffPatch: true, previousContent: true },
    });
    const changeComments = await prisma.changeComment.findMany({
      where: { change: { noteId: { in: noteIds } } },
      select: { id: true, content: true },
    });

    // Plaintext values (e.g. recipient edits) pass through; undecryptable
    // values are kept as-is rather than destroyed.
    const decrypt = (value: string) => {
      try {
        return decryptField(value, key);
      } catch {
        return value;
      }
    };

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { encryptionEnabled: false },
      }),
      prisma.session.updateMany({ where: { userId: user.id }, data: { encryptedKey: null } }),
      ...boards.map((b) => {
        const dec = decryptBoardFields(b, key);
        return prisma.board.update({
          where: { id: b.id },
          data: { title: dec.title, description: dec.description },
        });
      }),
      ...notes.map((n) => {
        const dec = decryptNoteFields(n, key);
        return prisma.note.update({
          where: { id: n.id },
          data: { title: dec.title, content: dec.content },
        });
      }),
      ...noteChanges.map((nc) =>
        prisma.noteChange.update({
          where: { id: nc.id },
          data: {
            diffPatch: decrypt(nc.diffPatch),
            previousContent:
              nc.previousContent != null ? decrypt(nc.previousContent) : nc.previousContent,
          },
        }),
      ),
      ...changeComments.map((cc) =>
        prisma.changeComment.update({
          where: { id: cc.id },
          data: { content: decrypt(cc.content) },
        }),
      ),
    ]);

    revalidatePath(`/profile/${user.id}`);
    return { success: true, message: 'Encryption disabled successfully.' };
  } catch (e) {
    console.error(e);
    return { message: 'An error occurred while disabling encryption.', success: false };
  }
}

export async function recoverEncryptedData(
  state: RecoverEncryptionFormState,
  formData: FormData,
): Promise<RecoverEncryptionFormState> {
  const data = { oldPassword: formData.get('oldPassword') };
  const result = RecoverEncryptionFormSchema.safeParse(data);
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors, success: false };
  }

  const { user } = await getCurrentSession();
  if (!user) return { message: 'Unauthorized', success: false };

  try {
    const record = await prisma.user.findUnique({ where: { id: user.id } });
    if (!record || !record.encryptionSalt) {
      return { message: 'No encryption key found.', success: false };
    }

    const oldKey = await deriveEncryptionKey(result.data.oldPassword, record.encryptionSalt);

    const boards = await prisma.board.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, description: true },
    });
    const notes = await prisma.note.findMany({
      where: { boards: { userId: user.id } },
      select: { id: true, title: true, content: true },
    });
    const noteIds = notes.map((n) => n.id);
    const noteChanges = await prisma.noteChange.findMany({
      where: { noteId: { in: noteIds } },
      select: { id: true, diffPatch: true, previousContent: true },
    });
    const changeComments = await prisma.changeComment.findMany({
      where: { change: { noteId: { in: noteIds } } },
      select: { id: true, content: true },
    });

    // Probe with old key using decryptField directly — it throws on AES-GCM auth failure.
    try {
      const probeField = boards[0]?.title ?? notes[0]?.title;
      if (probeField && isEncrypted(probeField)) {
        decryptField(probeField, oldKey);
      }
    } catch {
      return { message: 'Old password is incorrect or data cannot be decrypted.', success: false };
    }

    const safeDecrypt = (value: string) => {
      try {
        return decryptField(value, oldKey);
      } catch {
        return value;
      }
    };

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { encryptedDataLocked: false },
      }),
      prisma.session.updateMany({ where: { userId: user.id }, data: { encryptedKey: null } }),
      ...boards.map((b) =>
        prisma.board.update({
          where: { id: b.id },
          data: {
            title: safeDecrypt(b.title),
            description: b.description != null ? safeDecrypt(b.description) : b.description,
          },
        }),
      ),
      ...notes.map((n) =>
        prisma.note.update({
          where: { id: n.id },
          data: {
            title: safeDecrypt(n.title),
            content: n.content != null ? safeDecrypt(n.content) : n.content,
          },
        }),
      ),
      ...noteChanges.map((nc) =>
        prisma.noteChange.update({
          where: { id: nc.id },
          data: {
            diffPatch: safeDecrypt(nc.diffPatch),
            previousContent:
              nc.previousContent != null ? safeDecrypt(nc.previousContent) : nc.previousContent,
          },
        }),
      ),
      ...changeComments.map((cc) =>
        prisma.changeComment.update({
          where: { id: cc.id },
          data: { content: safeDecrypt(cc.content) },
        }),
      ),
    ]);

    revalidatePath(`/profile/${user.id}`);
    return { success: true, message: 'Data recovered successfully. You can now re-enable encryption.' };
  } catch (e) {
    console.error(e);
    return { message: 'An error occurred during recovery.', success: false };
  }
}

export async function wipeEncryptedData(
  _state: EncryptionFormState,
  _formData: FormData,
): Promise<EncryptionFormState> {
  const { user } = await getCurrentSession();
  if (!user) return { message: 'Unauthorized', success: false };

  try {
    const boards = await prisma.board.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, description: true },
    });
    const notes = await prisma.note.findMany({
      where: { boards: { userId: user.id } },
      select: { id: true, title: true, content: true },
    });
    const noteIds = notes.map((n) => n.id);
    const noteChanges = await prisma.noteChange.findMany({
      where: { noteId: { in: noteIds } },
      select: { id: true, diffPatch: true, previousContent: true },
    });
    const changeComments = await prisma.changeComment.findMany({
      where: { change: { noteId: { in: noteIds } } },
      select: { id: true, content: true },
    });

    // Encrypted history entries and comments are unrecoverable — delete them.
    // Deleting a change cascades to its comments.
    const wipedChangeIds = noteChanges
      .filter((nc) => isEncrypted(nc.diffPatch) || isEncrypted(nc.previousContent))
      .map((nc) => nc.id);
    const wipedCommentIds = changeComments
      .filter((cc) => isEncrypted(cc.content))
      .map((cc) => cc.id);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { encryptionEnabled: false, encryptedDataLocked: false },
      }),
      prisma.session.updateMany({ where: { userId: user.id }, data: { encryptedKey: null } }),
      prisma.changeComment.deleteMany({ where: { id: { in: wipedCommentIds } } }),
      prisma.noteChange.deleteMany({ where: { id: { in: wipedChangeIds } } }),
      ...boards.map((b) => prisma.board.update({
        where: { id: b.id },
        data: {
          title: isEncrypted(b.title) ? '[content removed]' : b.title,
          description: isEncrypted(b.description) ? null : b.description,
        },
      })),
      ...notes.map((n) => prisma.note.update({
        where: { id: n.id },
        data: {
          title: isEncrypted(n.title) ? '[content removed]' : n.title,
          content: isEncrypted(n.content) ? null : n.content,
        },
      })),
    ]);

    revalidatePath(`/profile/${user.id}`);
    return { success: true, message: 'Encrypted data wiped successfully.' };
  } catch (e) {
    console.error(e);
    return { message: 'An error occurred while wiping data.', success: false };
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
