// THIS FILE CAN BE DELETED — Sentry test completed successfully on 2026-03-31
// Sentry kurulumu doğrulandı. Bu dosyayı güvenle silebilirsin:
// rm apps/dashboard/src/app/api/sentry-test/route.ts
export async function GET() {
  return Response.json({ message: 'Sentry test completed. Delete this file.' });
}
