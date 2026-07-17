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
          priority: "max",
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

    // Ambil FCM token user dari tabel public.users
    const { data: userRecord, error: userError } = await supabaseAdmin
      .from("users")
      .select("fcm_token")
      .eq("id", userId)
      .single();

    if (userError || !userRecord) {
      console.warn(`⚠️ User ${userId} tidak ditemukan atau error:`, userError?.message);
      return new Response(
        JSON.stringify({ success: false, message: "User tidak ditemukan." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fcmToken = userRecord.fcm_token;
    if (!fcmToken) {
      console.warn(`⚠️ User ${userId} tidak memiliki FCM token. Notifikasi in-app tetap tersimpan.`);
      return new Response(
        JSON.stringify({ success: false, message: "FCM token tidak tersedia untuk user ini." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate Firebase Access Token & kirim push notification
    const accessToken = await getFirebaseAccessToken(serviceAccount);
    const result = await sendFcmMessage(accessToken, projectId, fcmToken, title, body, data);

    return new Response(
      JSON.stringify({ success: result.success, fcmResponse: result.response }),
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
