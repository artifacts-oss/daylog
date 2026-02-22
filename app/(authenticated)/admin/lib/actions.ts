'use server';

import { getCurrentSession } from '@/app/login/lib/actions';
import { prisma } from '@/prisma/client';
import { User } from '@/prisma/generated/client';
import { SettingsFormState } from './definitions';


export async function getUsers(): Promise<User[] | null> {
  const users = await prisma.user.findMany();
  return users;
}

export async function setAdmin(
  userId: number,
  role: string
): Promise<User | null> {
  const { user } = await getCurrentSession();

  if (!user) {
    throw new Error('Unauthorized');
  }

  if (user.role !== 'admin') {
    throw new Error('Forbidden');
  }

  // Prevent users from modifying their own role to avoid privilege escalation
  if (userId === user.id) {
    throw new Error('Cannot modify your own role');
  }

  // Only allow valid roles
  if (!['user', 'admin'].includes(role)) {
    throw new Error('Invalid role');
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true }
  });

  if (!targetUser) {
    throw new Error('User not found');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: role },
  });

  return updatedUser;
}

export type SettingsType = {
  mfa: boolean;
  allowReg: boolean;
  allowUnsplash: boolean;
  enableS3: boolean;
};

export async function getSettings() {
  const settings = await prisma.setting.findMany();
  if (settings && settings.length > 0) {
    const mappedSettings: SettingsType = {
      mfa: false,
      allowReg: false,
      allowUnsplash: false,
      enableS3: false,
    };
    settings.forEach((s) => {
      if (s.key === 'mfa') {
        mappedSettings.mfa = s.value === 'true';
      }
      if (s.key === 'allowReg') {
        mappedSettings.allowReg = s.value === 'true';
      }
      if (s.key === 'allowUnsplash') {
        mappedSettings.allowUnsplash = s.value === 'true';
      }
      if (s.key === 'enableS3') {
        mappedSettings.enableS3 = s.value === 'true';
      }
    });
    return mappedSettings;
  } else {
    return null;
  }
}

export async function saveSettings(
  state: SettingsFormState,
  formData: FormData
) {
  const { user } = await getCurrentSession();

  if (!user || user.role !== 'admin') {
    return {
      success: false,
      data: null,
      message: 'Access denied',
    };
  }

  const formSettings = formData.getAll('settings') as string[];

  const mfa = formSettings.includes('mfa');
  const allowReg = formSettings.includes('allowReg');
  const allowUnsplash = formSettings.includes('allowUnsplash');
  const enableS3 = formSettings.includes('enableS3');

  const data = [
    { key: 'mfa', value: mfa.toString() },
    { key: 'allowReg', value: allowReg.toString() },
    { key: 'allowUnsplash', value: allowUnsplash.toString() },
    { key: 'enableS3', value: enableS3.toString() },
  ];

  for (const setting of data) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: { key: setting.key, value: setting.value },
    });
  }

  const settings = await getSettings();

  return {
    success: true,
    data: settings,
    message: 'Settings saved correctly.',
  };
}

export async function deleteUser(userId: number) {
  const { user } = await getCurrentSession();

  if (!user) {
    throw new Error('Unauthorized');
  }

  if (user.role !== 'admin') {
    throw new Error('Forbidden');
  }

  // Prevent self-deletion
  if (userId === user.id) {
    throw new Error('Cannot delete your own account');
  }

  const targetUser = await prisma.user.findUnique({ 
    where: { id: userId },
    select: { id: true, role: true }
  });
  
  if (!targetUser) {
    throw new Error('User not found');
  }

  // Prevent deletion of other admins unless there are multiple admins
  if (targetUser.role === 'admin') {
    const adminCount = await prisma.user.count({
      where: { role: 'admin' }
    });
    
    if (adminCount <= 1) {
      throw new Error('Cannot delete the last admin user');
    }
  }

  await prisma.user.delete({ where: { id: userId } });
  return targetUser;
}
