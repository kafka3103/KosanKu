/**
 * supabase/functions/expire-rental-requests/index.ts
 * Supabase Edge Function — Auto-expire pengajuan sewa
 *
 * Dipanggil oleh pg_cron setiap jam (0 * * * *)
 * Mengexpire request yang sudah melewati expires_at
 * dan mengirim notifikasi ke Tenant
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const triggerPushNotification = async (userId: string, title: string, body: string, data: Record<string, string> = {}) => {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ userId, title, body, data }),
    });
  } catch (err) {
    console.warn('⚠️ Gagal trigger push notification:', err);
  }
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Ambil request yang akan di-expire (untuk kirim notifikasi dulu)
    const { data: requestsToExpire, error: fetchError } = await supabaseAdmin
      .from('rental_requests')
      .select('id, tenant_id, owner_id, room_id')
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      throw new Error(`Error mengambil request kadaluarsa: ${fetchError.message}`);
    }

    if (!requestsToExpire || requestsToExpire.length === 0) {
      return new Response(
        JSON.stringify({ success: true, expiredCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Jalankan expire function
    const { data: expiredCount, error: expireError } = await supabaseAdmin
      .rpc('expire_overdue_rental_requests');

    if (expireError) {
      throw new Error(`Error expire requests: ${expireError.message}`);
    }

    // Kirim notifikasi ke setiap tenant yang requestnya expired
    const notifications = requestsToExpire.map((request) => ({
      user_id: request.tenant_id,
      title: 'rental_expired_title',
      body: JSON.stringify({ key: 'rental_expired_body', params: {} }),
      type: 'rental_request_expired',
      reference_id: request.id,
      reference_type: 'rental_request',
    }));

    if (notifications.length > 0) {
      await supabaseAdmin.from('notifications').insert(notifications);
      for (const request of requestsToExpire) {
        await triggerPushNotification(
          request.tenant_id,
          'rental_expired_title',
          JSON.stringify({ key: 'rental_expired_body', params: {} }),
          { type: 'rental_request_expired', referenceId: request.id, referenceType: 'rental_request' }
        );
      }
    }

    console.log(`[expire-rental-requests] ${expiredCount} pengajuan di-expire`);

    return new Response(
      JSON.stringify({
        success: true,
        expiredCount: expiredCount ?? 0,
        notificationsSent: notifications.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[expire-rental-requests] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
