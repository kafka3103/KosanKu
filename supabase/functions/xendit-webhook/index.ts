// supabase/functions/xendit-webhook/index.ts
// Webhook handler otomatis untuk konfirmasi pembayaran dari Xendit
// Dipanggil oleh server Xendit saat status tagihan berubah (PAID / SETTLED / EXPIRED)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const XENDIT_CALLBACK_TOKEN = Deno.env.get("XENDIT_CALLBACK_TOKEN") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Helper: Kirim push notification via Edge Function send-notification (fire-and-forget)
const triggerPushNotification = async (userId: string, title: string, body: string, data: Record<string, string> = {}) => {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ userId, title, body, data }),
    });
  } catch (err) {
    console.warn("⚠️ Gagal trigger push notification:", err);
  }
};

serve(async (req) => {
  // Hanya terima method POST dari server Xendit
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Verifikasi Keamanan Callback Token dari Header x-callback-token
    const callbackToken = req.headers.get("x-callback-token");
    if (XENDIT_CALLBACK_TOKEN && callbackToken !== XENDIT_CALLBACK_TOKEN) {
      console.error("❌ Verifikasi Webhook Xendit Gagal: Callback Token tidak cocok atau tidak sah");
      return new Response(JSON.stringify({ error: "Unauthorized callback token" }), { status: 401 });
    }

    const payload = await req.json();
    console.log("📥 Menerima Webhook Xendit:", JSON.stringify(payload));

    // Ekstrak data penting dari spesifikasi callback Xendit
    const {
      id: xendit_id,
      external_id,      // UUID invoice kita (invoices.id) yang dikirim saat pembuatan, atau dummy ID saat 'Tes dan simpan'
      status,           // 'PAID', 'SETTLED', atau 'EXPIRED'
      paid_amount,
      amount,
      payment_method,
      payment_channel,
      paid_at,
    } = payload;

    // 2. Jika status pembayaran sukses (PAID / SETTLED)
    if (status === "PAID" || status === "SETTLED") {
      const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Ambil invoice terkait dari database (sederhana tanpa join fkey untuk mencegah PGRST error)
      const { data: invoice, error: fetchErr } = await supabaseAdmin
        .from("invoices")
        .select("*")
        .eq("id", external_id)
        .single();

      // Jika invoice tidak ditemukan (misal saat Xendit menekan tombol "Tes dan simpan" dengan external_id="invoice_123124123")
      // Kita TETAP harus merespons HTTP 200 OK agar Xendit berhasil menyimpan URL webhook ini
      if (fetchErr || !invoice) {
        console.log(`ℹ️ Invoice ${external_id} tidak ditemukan di DB (Tes Webhook dari Xendit Dashboard berhasil diverifikasi).`);
        return new Response(
          JSON.stringify({ success: true, message: "Webhook test verified (invoice not found or test payload)" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      const newPaidAmount = parseFloat(paid_amount || amount || invoice.total_amount);
      const isFullPayment = newPaidAmount >= parseFloat(invoice.total_amount);
      const newStatus = isFullPayment ? "paid" : "partial";

      // 3. Update status dan nominal dibayar pada tabel invoices
      const { error: updateErr } = await supabaseAdmin
        .from("invoices")
        .update({
          status: newStatus,
          paid_amount: newPaidAmount,
          payment_gateway_order_id: xendit_id || external_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", external_id);

      if (updateErr) {
        console.error("❌ Gagal update database invoices:", updateErr);
        throw updateErr;
      }

      console.log(`✅ Invoice ${invoice.invoice_number || invoice.id} berhasil diubah menjadi: ${newStatus.toUpperCase()}`);

      // 4. Catat ke tabel payments (riwayat pembayaran immutable append-only)
      const { error: insertPayErr } = await supabaseAdmin
        .from("payments")
        .insert({
          invoice_id: invoice.id,
          tenant_id: invoice.tenant_id,
          owner_id: invoice.owner_id,
          amount: newPaidAmount,
          payment_method: "bank_transfer", // Sesuai enum schema payments kita
          status: "completed",
          gateway_transaction_id: xendit_id || external_id,
          gateway_payment_code: payment_channel || payment_method || "XENDIT",
          gateway_raw_response: payload,
          paid_at: paid_at ? new Date(paid_at).toISOString() : new Date().toISOString(),
        });

      if (insertPayErr) {
        console.error("⚠️ Peringatan: Gagal mencatat riwayat ke tabel payments:", insertPayErr);
      }

      // Ambil data kamar & properti terpisah untuk notifikasi yang rapi
      let roomNum = "";
      let propName = "KosanKu";
      if (invoice.room_id) {
        const { data: room } = await supabaseAdmin
          .from("rooms")
          .select("room_number, properties(name)")
          .eq("id", invoice.room_id)
          .single();
        if (room) {
          roomNum = room.room_number || "";
          if (room.properties) propName = (room.properties as any).name || "KosanKu";
        }
      }

      // 5. Kirim Notifikasi Real-Time & Buat Bukti Invoice ke Owner & Tenant
      const formattedAmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(newPaidAmount);

      const notifications = [
        // Notifikasi / Bukti Invoice untuk Tenant (Penghuni)
        {
          user_id: invoice.tenant_id,
          title: "Invoice Lunas & Bukti Pembayaran 🧾",
          body: `Tagihan ${invoice.invoice_number || 'Kos'} (Kamar ${roomNum} di ${propName}) sebesar ${formattedAmt} telah Lunas otomatis via Xendit (${payment_channel || 'Checkout'}). Klik untuk melihat bukti invoice.`,
          type: "invoice_paid",
          reference_id: invoice.id,
          reference_type: "invoice",
          is_read: false,
        },
        // Notifikasi / Bukti Invoice untuk Owner (Pemilik)
        {
          user_id: invoice.owner_id,
          title: "Dana Masuk & Invoice Lunas 💰",
          body: `Penghuni kamar ${roomNum} (${propName}) telah melunasi tagihan ${invoice.invoice_number || 'Kos'} sebesar ${formattedAmt} via Xendit. Invoice telah dicatat di laporan keuangan Anda.`,
          type: "invoice_paid",
          reference_id: invoice.id,
          reference_type: "invoice",
          is_read: false,
        },
      ];

      await supabaseAdmin.from("notifications").insert(notifications);
      console.log(`🔔 Notifikasi & invoice lunas telah dikirim ke Tenant (${invoice.tenant_id}) dan Owner (${invoice.owner_id})`);

      // 6. Kirim Push Notification (FCM) ke device Tenant & Owner
      await Promise.all([
        triggerPushNotification(
          invoice.tenant_id,
          notifications[0].title,
          notifications[0].body,
          { type: "invoice_paid", referenceId: invoice.id, referenceType: "invoice" }
        ),
        triggerPushNotification(
          invoice.owner_id,
          notifications[1].title,
          notifications[1].body,
          { type: "invoice_paid", referenceId: invoice.id, referenceType: "invoice" }
        ),
      ]);
      console.log(`📲 Push notification FCM terkirim ke Tenant & Owner`);
    }

    // Selalu balikan HTTP 200 OK agar server Xendit tahu webhook berhasil diterima
    return new Response(JSON.stringify({ success: true, message: "Webhook processed successfully" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("❌ Error internal xendit-webhook:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
