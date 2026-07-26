const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://saqwxbbyemskruywtvbo.supabase.co', 'sb_publishable_avWQBJZhB0jjHYXmucDU8Q_atKiPcbV');

async function run() {
  const { data: users } = await supabase.from('users').select('id, full_name, role, fcm_token');
  console.log('--- ALL USERS & THEIR FCM TOKENS ---');
  for (const u of (users || [])) {
    console.log(   () => token: );
  }

  const { data: tokens } = await supabase.from('fcm_tokens').select('*');
  console.log('\n--- FCM_TOKENS TABLE ---');
  console.log(tokens && tokens.length > 0 ? tokens : '(kosong)');
}
run();
