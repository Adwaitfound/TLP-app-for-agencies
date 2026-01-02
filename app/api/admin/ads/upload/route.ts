import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v', 'video/mov'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const BUCKET = 'project-files'; // Reuse existing bucket

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 });
    }

    const mime = file.type;
    const isImage = ALLOWED_IMAGE_TYPES.includes(mime);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(mime);

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `ads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${cleanName}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: mime,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({
      url: data.publicUrl,
      path,
      kind: isVideo ? 'video' : 'image',
      bucket: BUCKET,
    });
  } catch (err: any) {
    const msg = err?.message || 'Upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
