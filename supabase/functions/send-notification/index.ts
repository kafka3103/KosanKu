// supabase/functions/send-notification/index.ts
// Edge Function: Mengirim Push Notification ke device via Firebase Cloud Messaging (HTTP v1 API)
// Dipanggil oleh: notificationService.js (frontend), xendit-webhook, generate-monthly-billing

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const FIREBASE_SERVICE_ACCOUNT_JSON = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Helper: Konversi PEM private key ke ArrayBuffer (DER format) ──
function pemToDer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ── Helper: Base64URL encode ──
function base64urlEncode(data: string | ArrayBuffer): string {
  let base64: string;
  if (typeof data === "string") {
    base64 = btoa(data);
  } else {
    base64 = btoa(String.fromCharCode(...new Uint8Array(data)));
  }
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// ── Step 1: Generate short-lived OAuth2 Access Token via JWT (RS256) ──
async function getFirebaseAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const privateKeyDer = pemToDer(serviceAccount.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureB64 = base64urlEncode(signatureBuffer);
  const jwt = `${signingInput}.${signatureB64}`;

  // Tukar JWT dengan Access Token dari Google OAuth2
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error(`Gagal mendapatkan access token Firebase: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

// ── Step 2: Kirim Push Notification via Firebase HTTP v1 API ──
async function sendFcmMessage(
  accessToken: string,
  projectId: string,
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: boolean; response: unknown }> {
  const message = {
    message: {
      token: fcmToken,
      notification: { title, body },
      // Konfigurasi Android: priority HIGH agar muncul sebagai Heads-Up Notification
      android: {
        priority: "high",
        notification: {
          channel_id: "default",
          notification_priority: "PRIORITY_MAX",
          default_vibrate_timings: true,
          sound: "default",
        },
      },
      // Konfigurasi iOS: priority 10 (immediate delivery)
      apns: {
        headers: { "apns-priority": "10" },
        payload: {
          aps: {
            alert: { title, body },
            sound: "default",
            badge: 1,
          },
        },
      },
      // Data tambahan untuk deep-link di dalam aplikasi
      data: data || {},
    },
  };

  const fcmRes = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    }
  );

  const fcmData = await fcmRes.json();
  const success = fcmRes.ok;

  if (!success) {
    console.error("❌ FCM Error:", JSON.stringify(fcmData));
  } else {
    console.log("✅ FCM Push terkirim:", fcmData.name);
  }

  return { success, response: fcmData };
}

// ── Main Handler ──
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validasi: FIREBASE_SERVICE_ACCOUNT_JSON harus tersedia di Supabase Secrets
    if (!FIREBASE_SERVICE_ACCOUNT_JSON) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON secret belum dikonfigurasi di Supabase.");
    }

    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);
    const projectId = serviceAccount.project_id;

    // Parse payload dari request
    const { userId, title, body, data } = await req.json();

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: "userId, title, dan body wajib diisi." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inisialisasi Supabase Admin client (bypass RLS)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Ambil FCM token dan preferred_language user dari tabel users / fcm_tokens
    const { data: userRecord } = await supabaseAdmin
      .from("users")
      .select("fcm_token, preferred_language")
      .eq("id", userId)
      .maybeSingle();

    const isEn = userRecord?.preferred_language === "en";

    // ── Translasi i18n key → teks manusia bilingual (ID / EN) sesuai preferensi bahasa user ──
    const titleDictId: Record<string, string> = {
      "invoice_paid_tenant_title": "Pembayaran Tagihan Berhasil 🧾",
      "invoice_paid_owner_title": "Dana Masuk Pembayaran Tagihan 💰",
      "rental_expired_title": "Pengajuan Kedaluwarsa ⏳",
      "invoice_generated_title": "Tagihan Baru Tersedia 📋",
      "rental_approved_title": "Sewa Disetujui! 🎉",
      "rental_rejected_title": "Sewa Ditolak ❌",
      "rental_new_title": "Pengajuan Sewa Baru 📋",
      "facility_invoice_title": "Tagihan Fasilitas ❄️",
    };

    const titleDictEn: Record<string, string> = {
      "invoice_paid_tenant_title": "Invoice Payment Successful 🧾",
      "invoice_paid_owner_title": "Payment Received 💰",
      "rental_expired_title": "Request Expired ⏳",
      "invoice_generated_title": "New Invoice Available 📋",
      "rental_approved_title": "Rental Approved! 🎉",
      "rental_rejected_title": "Rental Rejected ❌",
      "rental_new_title": "New Rental Request 📋",
      "facility_invoice_title": "Facility Invoice ❄️",
    };

    const bodyDictId: Record<string, string> = {
      "invoice_paid_tenant_body": "Pembayaran tagihan {{invoiceNumber}} (Kamar {{room}}, {{property}}) sebesar {{amount}} berhasil via {{channel}}.",
      "invoice_paid_owner_body": "Penghuni kamar {{room}} ({{property}}) membayar tagihan {{invoiceNumber}} sebesar {{amount}}.",
      "rental_expired_body": "Pengajuan sewa Anda kedaluwarsa karena tidak ada respons dalam 3 hari kerja.",
      "invoice_generated_body": "Tagihan sebesar {{amount}} telah tersedia. Jatuh tempo: {{dueDate}}.",
      "rental_approved_body": "Pengajuan kamar {{room}} di {{property}} disetujui! Silakan bayar tagihan pertama.",
      "rental_rejected_body": "Pengajuan kamar {{room}} di {{property}} ditolak. {{reason}}",
      "rental_rejected_body_no_reason": "Pengajuan kamar {{room}} di {{property}} belum dapat disetujui.",
      "rental_new_body": "Penghuni baru mengajukan sewa {{months}} bulan. Segera tinjau di menu Pengajuan Sewa.",
      "facility_invoice_body": "Tagihan {{amount}} untuk {{facilityName}} telah tersedia.",
    };

    const bodyDictEn: Record<string, string> = {
      "invoice_paid_tenant_body": "Payment for invoice {{invoiceNumber}} (Room {{room}}, {{property}}) of {{amount}} was successful via {{channel}}.",
      "invoice_paid_owner_body": "Tenant in Room {{room}} ({{property}}) paid invoice {{invoiceNumber}} of {{amount}}.",
      "rental_expired_body": "Your rental request expired due to no response within 3 business days.",
      "invoice_generated_body": "Your monthly invoice of {{amount}} is now available. Due date: {{dueDate}}.",
      "rental_approved_body": "Your rental request for Room {{room}} at {{property}} has been approved! Please pay your first invoice.",
      "rental_rejected_body": "Your rental request for Room {{room}} at {{property}} was rejected. {{reason}}",
      "rental_rejected_body_no_reason": "Your rental request for Room {{room}} at {{property}} could not be approved.",
      "rental_new_body": "A new tenant applied for {{months}} month(s). Review in Rental Requests menu.",
      "facility_invoice_body": "Invoice of {{amount}} for {{facilityName}} is now available.",
    };

    const titleDict = isEn ? titleDictEn : titleDictId;
    const bodyDict = isEn ? bodyDictEn : bodyDictId;

    // Fungsi helper: ganti placeholder {{key}} dengan value dari params
    const interpolate = (template: string, params: Record<string, string>): string => {
      let result = template;
      for (const [key, value] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
      }
      return result;
    };

    // Translate title: jika title adalah i18n key, ganti dengan teks sesuai preferensi bahasa
    let pushTitle = titleDict[title] || title;
    // Fallback: jika masih berformat underscore-separated key, rapikan
    if (pushTitle === title && typeof title === "string" && /^[a-z_]+$/.test(title)) {
      pushTitle = title.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
    }

    // Translate body: jika body adalah JSON string berisi { key, params }, decode dan interpolasi
    let pushBody = body;
    try {
      const parsed = JSON.parse(body);
      if (parsed && parsed.key) {
        const template = bodyDict[parsed.key];
        if (template) {
          pushBody = interpolate(template, parsed.params || {});
        } else {
          // Fallback: susun dari params agar tidak mengirim JSON mentah
          const paramValues = Object.values(parsed.params || {}).join(" - ");
          pushBody = paramValues || (isEn ? "You have a new notification" : "Anda memiliki pemberitahuan baru");
        }
      }
    } catch (_) {
      // body bukan JSON — gunakan as-is (sudah string normal)
    }

    // Ambil FCM token user dari tabel fcm_tokens
    const { data: tokenRecords } = await supabaseAdmin
      .from("fcm_tokens")
      .select("token")
      .eq("user_id", userId);

    let tokensToUse: { token: string }[] = [];
    if (tokenRecords && tokenRecords.length > 0) {
      tokensToUse = tokenRecords;
    }

    if (tokensToUse.length === 0) {
      if (!userRecord || !userRecord.fcm_token) {
        console.warn(`⚠️ User ${userId} tidak memiliki FCM token. Notifikasi in-app tetap tersimpan.`);
        return new Response(
          JSON.stringify({ success: false, message: "FCM token tidak tersedia untuk user ini." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      tokensToUse.push({ token: userRecord.fcm_token });
    }

    // Generate Firebase Access Token
    const accessToken = await getFirebaseAccessToken(serviceAccount);
    
    // Kirim push notification ke semua token
    const results = await Promise.all(
      tokensToUse.map(async (record) => {
        return await sendFcmMessage(accessToken, projectId, record.token, pushTitle, pushBody, data);
      })
    );

    // Filter results untuk mengetahui berapa yang sukses
    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({ 
        success: successCount > 0, 
        message: `Dikirim ke ${successCount}/${tokensToUse.length} perangkat`,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ Error internal send-notification:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
