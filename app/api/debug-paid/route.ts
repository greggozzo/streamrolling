// app/api/debug-paid/route.ts
import { getAuth } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = getAuth();

  if (!userId) {
    return Response.json({ error: 'Not signed in', userId: null });
  }

  return Response.json({
    userId,
    message: "You are signed in. Now check Private Metadata in Clerk dashboard."
  });
}