import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@/auth";
import { z } from "zod";

const prisma = new PrismaClient();

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = updateProfileSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: result.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name } = result.data;

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: { name },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { message: "An error occurred while updating profile" },
      { status: 500 }
    );
  }
}
