// app/api/debug-paid/route.ts
import { getAuth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  const { userId } = getAuth(request);

  if (!userId) {
    return Response.json({ error: 'Not signed in' }, { status: 401 });
  }

  return Response.json({
    userId: userId,
    message: "Signed in successfully. Now check your Private Metadata in Clerk dashboard."
  });
}