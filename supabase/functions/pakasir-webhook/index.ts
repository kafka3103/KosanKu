// supabase/functions/pakasir-webhook/index.ts
// Webhook handler otomatis untuk pembayaran PakKasir

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const PAKKASIR_SECRET_KEY = Deno.env.get("PAKKASIR_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  // Hanya terima method POST dari server PakKasir
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const payload = await req.json();
    console.log("📥 Menerima Webhook PakKasir:", payload);

    // 1. Ekstrak data penting dari payload PakKasir
    const {
      order_id,      // UUID invoice kita (invoices.id)
      status,        // 'completed', 'success', atau 'paid'
      amount,        // Nominal yang dibayar
      transaction_id,
      signature,
    } = payload;

    // 2. Verifikasi keamanan header/signature
    const authHeader = req.headers.get("x-callback-token") || req.headers.get("authorization");
    if (PAKKASIR_SECRET_KEY && authHeader !== PAKKASIR_SECRET_KEY && !signature) {
      console.error("❌ Verifikasi Webhook Gagal: Secret key tidak cocok");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // 3. Cek apakah status pembayaran sukses
    if (status === "completed" || status === "success" || status === "paid") {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Ambil invoice terkait untuk pengecekan nominal
      const { data: invoice, error: fetchErr } = await supabase
        .from("invoices")
        .select("id, total_amount, paid_amount, tenant_id, owner_id, invoice_number, contracts(rooms(room_number, properties(name)))")
        .eq("id", order_id)
        .single();

      if (fetchErr || !invoice) {
        console.error("❌ Invoice tidak ditemukan:", order_id);
        return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404 });
      }

      const newPaidAmount = parseFloat(amount || invoice.total_amount);
      const isFullPayment = newPaidAmount >= parseFloat(invoice.total_amount);
      const newStatus = isFullPayment ? "paid" : "partial";

      // 4. Update status Invoice di Database secara otomatis
      const { error: updateErr } = await supabase
        .from("invoices")
        .update({
          status: newStatus,
          paid_amount: newPaidAmount,
          payment_gateway_order_id: transaction_id || order_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order_id);

      if (updateErr) {
        console.error("❌ Gagal update database invoice:", updateErr);
        throw updateErr;
      }

      console.log(`✅ Invoice ${invoice.invoice_number} berhasil diubah menjadi: ${newStatus.toUpperCase()}`);

      // 5. Kirim Notifikasi Real-Time ke Owner & Tenant
      const propName = invoice.contracts?.rooms?.properties?.name || "Kosan";
      const roomNum = invoice.contracts?.rooms?.room_number || "";
      const formattedAmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(newPaidAmount);

      const notifications = [
        // Notifikasi untuk Tenant (Penghuni)
        {
          user_id: invoice.tenant_id,
          title: "Pembayaran Berhasil! 🎉",
          body: `Pembayaran tagihan ${invoice.invoice_number} (Kamar ${roomNum} di ${propName}) sebesar ${formattedAmt} telah dikonfirmasi otomatis. Terima kasih!`,
          type: "invoice_paid",
          reference_id: invoice.id,
          reference_type: "invoice",
          is_read: false,
        },
        // Notifikasi untuk Owner (Pemilik)
        {
          user_id: invoice.owner_id,
          title: "Dana Pembayaran Masuk 💰",
          body: `Penghuni kamar ${roomNum} (${propName}) telah membayar tagihan ${invoice.invoice_number} sebesar ${formattedAmt} via PakKasir.`,
          type: "invoice_paid",
          reference_id: invoice.id,
          reference_type: "invoice",
          is_read: false,
        },
      ];

      await supabase.from("notifications").insert(notifications);
    }

    return new Response(JSON.stringify({ success: true, message: "Webhook processed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Error internal webhook:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
