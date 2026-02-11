import { NextResponse } from 'next/server';
import { seedInitialData } from '@/lib/initial-data';

export async function GET() {
  try {
    await seedInitialData();
    return NextResponse.json({ message: 'Data seeded successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 });
  }
}