'use client';

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminUserRow } from './admin-user-row';
import { Role } from '@prisma/client';

interface AdminUserListProps {
  users: {
    id: string;
    name: string | null;
    email: string;
    role: Role;
    createdAt: Date;
    sessions: { expires: Date }[];
    isOnline: boolean;
    fmtCreatedAt: string;
  }[];
}

export function AdminUserList({ users }: AdminUserListProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => (
            <AdminUserRow key={user.id} user={user} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
