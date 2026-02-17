'use server';

import prisma from '@/shared/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ... imports
import bcrypt from 'bcryptjs';

const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(Role).optional(),
  password: z.string().optional()
});

export type UpdateUserSchema = z.infer<typeof updateUserSchema>;

/**
 * Updates a user's information.
 * @param data The user data to update.
 * @returns The updated user or an error.
 */
export async function updateUser(data: UpdateUserSchema) {
  const result = updateUserSchema.safeParse(data);

  if (!result.success) {
    return { error: 'Invalid data' };
  }

  try {
    const updateData: {
      name?: string;
      email?: string;
      role?: Role;
      password?: string;
    } = {
      name: data.name,
      email: data.email,
      role: data.role
    };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const user = await prisma.user.update({
      where: { id: data.id },
      data: updateData
    });

    revalidatePath('/admin/users');
    return { success: true, user };
  } catch (error) {
    console.error('Failed to update user:', error);
    return { error: 'Failed to update user' };
  }
}

/**
 * Deletes a user by their ID.
 * @param userId The ID of the user to delete.
 * @returns Success status or an error.
 */
export async function deleteUser(userId: string) {
  try {
    await prisma.user.delete({
      where: { id: userId }
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Failed to delete user:', error);
    return { error: error instanceof Error ? error.message : 'Failed to delete user' };
  }
}
