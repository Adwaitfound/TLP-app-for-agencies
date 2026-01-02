import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const required = ['title']
    for (const k of required) {
      if (!body?.[k] || String(body[k]).trim() === '') {
        return NextResponse.json({ error: `Missing field: ${k}` }, { status: 400 })
      }
    }

    const supabase = createServiceClient()

    const payload = {
      title: String(body.title).trim(),
      description: body.description ?? null,
      image_url: body.image_url ?? null,
      cta_text: body.cta_text ?? 'Learn More',
      cta_url: body.cta_url ?? null,
      target_role: body.target_role ?? 'client',
      position: body.position ?? 'top',
      display_frequency: body.display_frequency ?? 'always',
      start_date: body.start_date ?? null,
      end_date: body.end_date ?? null,
      created_by: body.created_by ?? null,
      is_active: body.is_active ?? true,
    }

    const { data, error } = await supabase
      .from('advertisements')
      .insert([payload])
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Optional per-client targeting
    if (Array.isArray(body?.targets) && body.targets.length > 0) {
      const rows = body.targets
        .filter((cid: any) => typeof cid === 'string' && cid.length > 0)
        .map((cid: string) => ({ ad_id: data.id, client_id: cid }));
      if (rows.length) {
        const { error: tgtErr } = await supabase.from('ad_targets').insert(rows);
        if (tgtErr) {
          // Not fatal for ad creation, but report it
          console.warn('Failed to create ad targets:', tgtErr.message);
        }
      }
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err: any) {
    const msg = err?.message || 'Failed to create advertisement'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const id = body?.id

    if (!id) {
      return NextResponse.json({ error: 'Missing field: id' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const payload = {
      title: body.title?.trim?.() ?? body.title ?? undefined,
      description: body.description ?? undefined,
      image_url: body.image_url ?? undefined,
      cta_text: body.cta_text ?? undefined,
      cta_url: body.cta_url ?? undefined,
      target_role: body.target_role ?? undefined,
      position: body.position ?? undefined,
      display_frequency: body.display_frequency ?? undefined,
      start_date: body.start_date ?? undefined,
      end_date: body.end_date ?? undefined,
      created_by: body.created_by ?? undefined,
      is_active: body.is_active ?? undefined,
    }

    const cleaned = Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== undefined)
    )

    const { data, error } = await supabase
      .from('advertisements')
      .update(cleaned)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Advertisement not found' }, { status: 404 })
    }

    // Replace targets if provided
    if (Array.isArray(body?.targets)) {
      const { error: delErr } = await supabase.from('ad_targets').delete().eq('ad_id', id)
      if (delErr) {
        console.warn('Failed to remove existing targets:', delErr.message)
      }
      const rows = body.targets
        .filter((cid: any) => typeof cid === 'string' && cid.length > 0)
        .map((cid: string) => ({ ad_id: id, client_id: cid }))
      if (rows.length) {
        const { error: insErr } = await supabase.from('ad_targets').insert(rows)
        if (insErr) {
          console.warn('Failed to insert new targets:', insErr.message)
        }
      }
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (err: any) {
    const msg = err?.message || 'Failed to update advertisement'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
