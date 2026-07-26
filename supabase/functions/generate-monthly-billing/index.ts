/**
 * supabase/functions/generate-monthly-billing/index.ts
 * Supabase Edge Function — Auto-generate tagihan bulanan
 *
 * Dipanggil oleh:
 * - pg_cron setiap pukul 00:10 UTC
 * - Atau manual trigger dari Owner (opsional)
 *
 * Logika:
 * 1. Ambil semua properti aktif
 * 2. Untuk setiap properti, cek apakah hari ini = billing_generate_day
 * 3. Jika ya, panggil function generate_monthly_billing_for_property
 * 4. Kirim notifikasi ke tenant terkait
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: Kirim push notification via Edge Function send-notification (fire-and-forget)
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Gunakan service role key agar bisa bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const today = new Date();
    const currentDay = today.getDate();

    console.log(`[generate-monthly-billing] Tanggal hari ini: ${today.toISOString()}, Hari ke-${currentDay}`);

    // Ambil semua properti aktif yang billing_generate_day = hari ini
    const { data: propertiesToBill, error: propertiesError } = await supabaseAdmin
      .from('properties')
      .select('id, name, billing_generate_day')
      .eq('is_active', true)
      .eq('is_deleted', false)
      .eq('billing_generate_day', currentDay);

    if (propertiesError) {
      throw new Error(`Error mengambil daftar properti: ${propertiesError.message}`);
    }

    if (!propertiesToBill || propertiesToBill.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Tidak ada properti yang perlu di-billing pada hari ke-${currentDay}`,
          propertiesBilled: 0,
          totalInvoicesCreated: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-monthly-billing] Ditemukan ${propertiesToBill.length} properti untuk di-billing`);

    let totalInvoicesCreated = 0;
    const billingResults = [];

    // Generate billing untuk setiap properti
    for (const property of propertiesToBill) {
      const { data: invoiceCount, error: billingError } = await supabaseAdmin
        .rpc('generate_monthly_billing_for_property', {
          target_property_id: property.id,
        });

      if (billingError) {
        console.error(`Error billing properti ${property.name}: ${billingError.message}`);
        billingResults.push({
          propertyId: property.id,
          propertyName: property.name,
          success: false,
          error: billingError.message,
          invoicesCreated: 0,
        });
        continue;
      }

      const invoicesCreated = invoiceCount ?? 0;
      totalInvoicesCreated += invoicesCreated;

      billingResults.push({
        propertyId: property.id,
        propertyName: property.name,
        success: true,
        invoicesCreated,
      });

      console.log(`[generate-monthly-billing] Properti "${property.name}": ${invoicesCreated} invoice dibuat`);

      // Kirim notifikasi ke tenant jika ada invoice baru
      if (invoicesCreated > 0) {
        const billingPeriod = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

        // Ambil invoice baru melalui rooms.property_id
        const { data: newInvoices } = await supabaseAdmin
          .from('invoices')
          .select(`
            id,
            tenant_id,
            total_amount,
            due_date,
            rooms!inner(property_id)
          `)
          .eq('rooms.property_id', property.id)
          .eq('billing_period', billingPeriod)
          .eq('status', 'unpaid');

        if (newInvoices) {
          for (const invoice of newInvoices) {
            const notifTitle = 'Tagihan Baru Tersedia';
            const notifBody = `Tagihan bulan ini sebesar Rp ${Number(invoice.total_amount).toLocaleString('id-ID')} telah tersedia. Jatuh tempo: ${new Date(invoice.due_date).toLocaleDateString('id-ID')}`;

            await supabaseAdmin.from('notifications').insert({
              user_id: invoice.tenant_id,
<<<<<<< HEAD
<<<<<<< HEAD
              title: notifTitle,
              body: notifBody,
=======
              title: 'invoice_generated_title',
              body: JSON.stringify({ key: 'invoice_generated_body', params: { amount: `Rp ${Number(invoice.total_amount).toLocaleString('id-ID')}`, dueDate: new Date(invoice.due_date).toLocaleDateString('id-ID') } }),
>>>>>>> rijal
=======
              title: 'invoice_generated_title',
              body: JSON.stringify({ key: 'invoice_generated_body', params: { amount: `Rp ${Number(invoice.total_amount).toLocaleString('id-ID')}`, dueDate: new Date(invoice.due_date).toLocaleDateString('id-ID') } }),
>>>>>>> 76b31cab6566d65008a3fd94717b52035b93ca9e
              type: 'invoice_generated',
              reference_id: invoice.id,
              reference_type: 'invoice',
            });

            // Kirim push notification ke device tenant
            await triggerPushNotification(
              invoice.tenant_id,
              notifTitle,
              notifBody,
              { type: 'invoice_generated', referenceId: invoice.id, referenceType: 'invoice' }
            );
          }
          console.log(`📲 Push notification FCM terkirim ke ${newInvoices.length} tenant`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Billing generation selesai`,
        propertiesBilled: propertiesToBill.length,
        totalInvoicesCreated,
        results: billingResults,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generate-monthly-billing] Fatal error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
