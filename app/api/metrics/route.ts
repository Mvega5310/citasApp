import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const metric = await request.json();
    console.log(JSON.stringify({ type: 'web_vital', metric }));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

