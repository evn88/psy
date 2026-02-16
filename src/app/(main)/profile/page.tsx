import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ProfileForm } from "./_components/profile-form"

export default async function ProfilePage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth")
  }

  return (
    <div className="dark min-h-screen bg-background text-foreground py-10">
        <div className="container mx-auto">
            <Card className="max-w-2xl mx-auto bg-card text-card-foreground border-border">
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Manage your account settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ProfileForm user={session.user} />
                    
                     <div className="grid gap-2">
                        <Label>Role</Label>
                        <Input defaultValue={session.user.role ?? "GUEST"} disabled className="bg-muted" />
                    </div>
                    
                    <div className="pt-4 border-t border-border mt-6">
                         <form
                            action={async () => {
                              "use server"
                              await signOut({ redirectTo: "/auth" })
                            }}
                          >
                            <Button variant="destructive" type="submit">Sign Out</Button>
                          </form>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}
