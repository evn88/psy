"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSession } from "next-auth/react"

interface ProfileFormProps {
    user: {
        name?: string | null
        email?: string | null
    }
}

export function ProfileForm({ user }: ProfileFormProps) {
    const router = useRouter()
    const { update } = useSession()
    const [name, setName] = useState(user.name ?? "")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch('/api/profile/update', {
                method: 'PUT',
                body: JSON.stringify({ name }),
                headers: { 'Content-Type': 'application/json' }
            })

            if (!res.ok) {
                throw new Error('Failed to update profile')
            }

            // Update session
            await update({ name })
            
            router.refresh()
        } catch (error) {
            console.error(error)
            alert("Failed to update profile")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <div className="flex gap-2">
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                    <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
                </div>
            </div>
            <div className="grid gap-2">
                <Label>Email</Label>
                <Input defaultValue={user.email ?? ""} disabled className="bg-muted" />
            </div>

            <div className="grid gap-2 pt-4 border-t border-border">
                <Label>Security</Label>
                <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-card">
                    <div className="space-y-0.5">
                        <div className="font-medium">Passkeys</div>
                        <div className="text-sm text-muted-foreground">
                            Secure your account with a passkey.
                        </div>
                    </div>
                    <Button variant="outline" type="button">
                        Create Passkey
                    </Button>
                </div>
            </div>
        </form>
    )
}
