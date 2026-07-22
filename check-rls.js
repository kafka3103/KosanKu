const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://saqwxbbyemskruywtvbo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_avWQBJZhB0jjHYXmucDU8Q_atKiPcbV';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/get_policies', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    }
  });
  console.log(await res.text());
}
run();
