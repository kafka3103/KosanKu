// supabase/functions/create-xendit-invoice/index.ts
// Edge Function untuk membuat invoice pembayaran Xendit (Server-to-Server)
// Mencegah eksposur XENDIT_SECRET_KEY ke client (React Native)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const XENDIT_SECRET_KEY = Deno.env.get("XENDIT_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight dari React Native / WebView
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Parse Request
    const reqBody = await req.json();
    const { invoice_id, user_id: callerUserId, payment_methods, amount: requestedAmount } = reqBody;

    if (!invoice_id) {
      return new Response(JSON.stringify({ success: false, error: "invoice_id wajib disertakan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ekstrak token & user email untuk fallback (opsional)
    const authHeader = req.headers.get("Authorization") || "";
    let callerEmail = "tenant@kosanku.com";
    if (authHeader && authHeader !== `Bearer ${SUPABASE_ANON_KEY}` && authHeader !== SUPABASE_ANON_KEY) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const payloadStr = atob(token.split(".")[1]);
        const payload = JSON.parse(payloadStr);
        if (payload.email) callerEmail = payload.email;
      } catch (e) {
        // Abaikan jika token expired, gunakan callerUserId dari body
      }
    }

    // 2. Ambil data Invoice dari Database menggunakan Service Role
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: invoice, error: fetchErr } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("id", invoice_id)
      .single();

    if (fetchErr || !invoice) {
      console.error("❌ Database fetch error:", fetchErr);
      return new Response(JSON.stringify({ success: false, error: `Invoice tidak ditemukan di database: ${fetchErr?.message || invoice_id}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pastikan yang meminta adalah Tenant pemilik tagihan atau Owner kos
    if (callerUserId && invoice.tenant_id !== callerUserId && invoice.owner_id !== callerUserId) {
      return new Response(JSON.stringify({ success: false, error: "Anda tidak berhak atas tagihan ini" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invoice.status === "paid") {
      return new Response(JSON.stringify({ success: false, error: "Tagihan ini sudah lunas" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hitung sisa tagihan yang harus dibayar
    const totalAmount = parseFloat(invoice.total_amount);
    const currentPaid = parseFloat(invoice.paid_amount || 0);
    const remainingDebt = Math.round(totalAmount - currentPaid);
    const defaultAmountToPay = remainingDebt;
    const amountToPay = requestedAmount ? Math.round(parseFloat(requestedAmount)) : defaultAmountToPay;

    // Validasi: nominal tidak boleh <= 0 (tagihan sudah lunas atau input invalid)
    if (amountToPay <= 0) {
      return new Response(JSON.stringify({ success: false, error: "Tagihan ini sudah lunas" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validasi: nominal cicilan tidak boleh melebihi sisa hutang
    if (amountToPay > remainingDebt) {
      return new Response(JSON.stringify({
        success: false,
        error: `Nominal melebihi sisa tagihan. Sisa hutang: Rp ${remainingDebt.toLocaleString("id-ID")}`,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validasi: pembayaran pertama wajib minimal 50% dari total tagihan (DP)
    const isFirstPayment = currentPaid === 0;
    const minimumDP = Math.ceil(totalAmount * 0.5);
    if (isFirstPayment && amountToPay < minimumDP) {
      return new Response(JSON.stringify({
        success: false,
        error: `Pembayaran pertama minimal 50% dari total tagihan (Rp ${minimumDP.toLocaleString("id-ID")})`,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ambil data penyewa (tenant) terpisah
    const { data: tenant } = await supabaseAdmin
      .from("users")
      .select("full_name, email, phone_number")
      .eq("id", invoice.tenant_id)
      .single();

    // Ambil data kamar & properti terpisah
    let roomNumber = "";
    let propName = "KosanKu";
    if (invoice.room_id) {
      const { data: room } = await supabaseAdmin
        .from("rooms")
        .select("room_number, properties(name)")
        .eq("id", invoice.room_id)
        .single();
      if (room) {
        roomNumber = room.room_number || "";
        if (room.properties) propName = (room.properties as any).name || "KosanKu";
      }
    }

    // Format nomor HP ke format internasional +62 (karena Xendit wajib format +62 jika diisi)
    let formattedPhone = tenant?.phone_number || "";
    if (formattedPhone) {
      formattedPhone = formattedPhone.replace(/\D/g, ""); // ambil angka saja
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "+62" + formattedPhone.substring(1);
      } else if (formattedPhone.startsWith("62")) {
        formattedPhone = "+" + formattedPhone;
      } else if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+62" + formattedPhone;
      }
    }

    // 3. Panggil API Xendit untuk Create Invoice (POST https://api.xendit.co/v2/invoices)
    const basicAuth = btoa(`${XENDIT_SECRET_KEY}:`);
    const xenditPayload = {
      external_id: invoice.id,
      amount: amountToPay,
      description: `Tagihan ${invoice.invoice_number || invoice.id} - Kamar ${roomNumber} (${propName})`,
      invoice_duration: 86400, // 24 jam masa kedaluwarsa
      currency: "IDR",
      customer: {
        given_names: tenant?.full_name || "Penghuni KosanKu",
        email: tenant?.email || callerEmail || "tenant@kosanku.com",
        mobile_number: formattedPhone || undefined,
      },
      success_redirect_url: `kosanku://payment/success?invoice_id=${invoice.id}`,
      failure_redirect_url: `kosanku://payment/failed?invoice_id=${invoice.id}`,
      ...(payment_methods && Array.isArray(payment_methods) ? { payment_methods } : {}),
    };

    console.log(`🚀 Membuat Xendit Invoice untuk ID: ${invoice.id}, Amount: ${amountToPay}`);

    const xenditResponse = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(xenditPayload),
    });

    const xenditData = await xenditResponse.json();
    if (!xenditResponse.ok) {
      console.error("❌ Xendit API Error:", JSON.stringify(xenditData));
      const errMsg = xenditData.message || xenditData.error_code || "Gagal membuat invoice di server Xendit";
      return new Response(
        JSON.stringify({ success: false, error: `Xendit Error: ${errMsg}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Simpan Order ID & URL Gateway di Database Invoice
    const { error: updateErr } = await supabaseAdmin
      .from("invoices")
      .update({
        payment_gateway_order_id: xenditData.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    if (updateErr) {
      console.error("⚠️ Peringatan: Gagal update payment_gateway_order_id ke DB:", updateErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        invoice_url: xenditData.invoice_url,
        xendit_invoice_id: xenditData.id,
        expiry_date: xenditData.expiry_date,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Error internal create-xendit-invoice:", error);
    return new Response(JSON.stringify({ success: false, error: error.message || "Internal server error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
