import { createClient } from 'npm:@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    const { data: expiredBoards, error: fetchError } = await supabase
      .from('activity_boards')
      .select('id, name, active_until')
      .eq('is_active', true)
      .not('active_until', 'is', null)
      .lte('active_until', now);

    if (fetchError) {
      throw new Error(`Failed to fetch expired boards: ${fetchError.message}`);
    }

    const results = [];

    for (const board of expiredBoards || []) {
      const { data: sessions, error: sessionsError } = await supabase
        .from('activity_sessions')
        .update({ end_time: board.active_until })
        .eq('board_id', board.id)
        .is('end_time', null)
        .select();

      if (sessionsError) {
        console.error(`Error ending sessions for board ${board.id}:`, sessionsError);
        continue;
      }

      const { error: deactivateError } = await supabase
        .from('activity_boards')
        .update({
          is_active: false,
          updated_at: now
        })
        .eq('id', board.id);

      if (deactivateError) {
        console.error(`Error deactivating board ${board.id}:`, deactivateError);
        continue;
      }

      results.push({
        board_id: board.id,
        board_name: board.name,
        sessions_ended: sessions?.length || 0,
        deactivated_at: now
      });

      console.log(`Deactivated board: ${board.name} (${board.id}), ended ${sessions?.length || 0} sessions`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        deactivated_count: results.length,
        results: results,
        timestamp: now
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
