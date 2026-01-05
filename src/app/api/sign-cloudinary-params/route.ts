
import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { paramsToSign } = body;

  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!apiSecret) {
    console.error('CLOUDINARY_API_SECRET is not set');
    return NextResponse.json({ error: 'Cloudinary API secret is not configured.' }, { status: 500 });
  }

  try {
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
    return NextResponse.json({ signature });
  } catch (error) {
    console.error('Error signing Cloudinary request:', error);
    return NextResponse.json({ error: 'Failed to sign request' }, { status: 500 });
  }
}
