const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://saqwxbbyemskruywtvbo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_avWQBJZhB0jjHYXmucDU8Q_atKiPcbV';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data: users } = await supabase.from('users').select('id, role, fcm_token');
  console.log('--- USERS ---');
  console.dir(users, { depth: null });

  const { data: tokens } = await supabase.from('fcm_tokens').select('*');
  console.log('--- FCM TOKENS ---');
  console.dir(tokens, { depth: null });

  const { data: requests } = await supabase.from('rental_requests').select('id, tenant_id, owner_id').order('created_at', { ascending: false }).limit(2);
  console.log('--- RENTAL REQUESTS ---');
  console.dir(requests, { depth: null });

  const { data: notifs } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(3);
  console.log('--- LATEST NOTIFS ---');
  console.dir(notifs, { depth: null });
}

run();
