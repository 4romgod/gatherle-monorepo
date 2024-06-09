'use server';

import { signOut } from '@/auth';

export async function logoutUserAction() {
  await signOut();
}
