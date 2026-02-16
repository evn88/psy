"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function CreateUserDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("GUEST")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
        const res = await fetch('/api/admin/users', {
            method: 'POST',
            body: JSON.stringify({ name, email, password, role }),
            headers: { 'Content-Type': 'application/json' }
        })

        if (!res.ok) {
            throw new Error('Failed to create user')
        }

        setOpen(false)
        router.refresh()
        // Reset form
        setName("")
        setEmail("")
        setPassword("")
        setRole("GUEST")
    } catch (error) {
        console.error(error)
        alert("Failed to create user")
    } finally {
        setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create User</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
            <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
                Add a new user to the system.
            </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                Name
                </Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                Email
                </Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="col-span-3" required />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                Password
                </Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="col-span-3" required minLength={6} />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">
                Role
                </Label>
                <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="GUEST">Guest</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            </div>
            <DialogFooter>
            <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
