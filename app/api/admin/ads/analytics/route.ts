import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const adId = searchParams.get('ad_id');
    const eventType = searchParams.get('event_type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build query
    let query = supabase
      .from('ad_analytics')
      .select('id, ad_id, client_id, event_type, created_at, clients(company_name)');

    if (adId) query = query.eq('ad_id', adId);
    if (eventType) query = query.eq('event_type', eventType);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      data,
      total: data?.length || 0,
      summary: {
        views: data?.filter((e: any) => e.event_type === 'view').length || 0,
        clicks: data?.filter((e: any) => e.event_type === 'click').length || 0,
        unique_clients: new Set(data?.map((e: any) => e.client_id)).size || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching ad analytics:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
