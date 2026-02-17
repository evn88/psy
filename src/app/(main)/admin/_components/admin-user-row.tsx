'use client';

import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Role } from '@prisma/client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EditUserDialog } from './edit-user-dialog';
import { DeleteUserDialog } from './delete-user-dialog';

interface AdminUserRowProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: Role;
    createdAt: Date;
    sessions: { expires: Date }[];
    isOnline: boolean;
    fmtCreatedAt: string;
  };
}

export function AdminUserRow({ user }: AdminUserRowProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <TableRow>
        <TableCell>{user.name || 'No Name'}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>
          <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>{user.role}</Badge>
        </TableCell>
        <TableCell>
          {user.isOnline ? (
            <Badge variant="outline" className="text-green-600 border-green-600">
              Online
            </Badge>
          ) : (
            <Badge variant="outline" className="text-gray-500">
              Offline
            </Badge>
          )}
        </TableCell>
        <TableCell>{user.fmtCreatedAt}</TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                Copy User ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowEditDialog(true)}>Edit User</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600">
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <EditUserDialog user={user} open={showEditDialog} onOpenChange={setShowEditDialog} />
      <DeleteUserDialog
        userId={user.id}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </>
  );
}
