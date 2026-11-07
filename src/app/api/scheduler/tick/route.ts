import { NextResponse } from 'next/server';
import { processScheduleTick } from '@/lib/scheduler';

export async function POST() {
  try {
    const res = await processScheduleTick();
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const res = await processScheduleTick();
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
