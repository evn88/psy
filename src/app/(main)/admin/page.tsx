import { Prisma } from "@prisma/client"
import prisma from "@/shared/lib/prisma"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

type UserWithSessions = Prisma.UserGetPayload<{
  include: { sessions: true }
}>

export default async function AdminPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
        sessions: {
            orderBy: { expires: 'desc' },
            take: 1
        }
    }
  })

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
             {/* Note: In a real app, extract this to a client component <CreateUserDialog /> */}
            <CreateUserDialog /> 
        </div>
        <Card>
            <CardHeader>
                <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user: UserWithSessions) => {
                            const lastSession = user.sessions[0]
                            const isOnline = lastSession && new Date(lastSession.expires) > new Date()
                            
                            return (
                                <TableRow key={user.id}>
                                    <TableCell>{user.name || 'No Name'}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {isOnline ? (
                                            <Badge variant="outline" className="text-green-600 border-green-600">Online</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-gray-500">Offline</Badge>
                                        )}
                                    </TableCell>
                                     <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  )
}

// Simple Client Component for Create User (Mocked for single file for now, ideally separate)
import { CreateUserDialog } from "./_components/create-user-dialog"
