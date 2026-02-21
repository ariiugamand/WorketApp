import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Create manager user
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'manager@corp.ru',
      password: 'manager123',
      email_confirm: true,
      user_metadata: { login: 'manager', full_name: 'Александров Руслан Викторович' }
    });

    if (createError && !createError.message.includes('already registered')) {
      return new Response(JSON.stringify({ error: createError.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    if (user?.user) {
      // Assign manager role
      await supabaseAdmin.from('user_roles').upsert({ user_id: user.user.id, role: 'manager' }, { onConflict: 'user_id,role' });
      // Update profile
      await supabaseAdmin.from('profiles').upsert({ id: user.user.id, login: 'manager', full_name: 'Александров Руслан Викторович', email: 'manager@corp.ru' }, { onConflict: 'id' });
    }

    return new Response(JSON.stringify({ success: true, message: 'Manager account ready' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});
