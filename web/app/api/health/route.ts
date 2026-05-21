import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  let db = 'disconnected';
  try {
    await clientPromise;
    db = 'connected';
  } catch {
    db = 'disconnected';
  }
  return NextResponse.json({
    ok: true,
    service: 'elevaite-web',
    db,
    uptimeSec: Math.round(process.uptime()),
  });
}
