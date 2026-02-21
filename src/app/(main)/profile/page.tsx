import { auth, signOut } from '@/auth';
import { redirect } from 'next/navigation';
import prisma from '@/shared/lib/prisma';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProfileForm } from './_components/profile-form';
import { ProfileNavButtons } from './_components/profile-nav-buttons';

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/auth');
  }

  const authenticatorCount = await prisma.authenticator.count({
    where: { userId: session.user.id }
  });
  const hasPasskeys = authenticatorCount > 0;

  return (
    <div className="dark min-h-screen bg-background text-foreground py-10">
      <div className="container mx-auto">
        <Card className="max-w-2xl mx-auto bg-card text-card-foreground border-border">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Manage your account settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProfileForm user={session.user} hasPasskeys={hasPasskeys} />

            <div className="grid gap-2">
              <Label>Role</Label>
              <Input defaultValue={session.user.role ?? 'GUEST'} disabled className="bg-muted" />
            </div>
          </CardContent>
          <CardFooter className="px-6 pb-6 pt-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
            <ProfileNavButtons />
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/auth' });
              }}
              className="w-full sm:w-auto"
            >
              <Button variant="destructive" type="submit" className="w-full sm:w-auto">
                Sign Out
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
