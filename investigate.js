const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => {
  const match = envFile.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('EXPO_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'); 
const serviceRoleKey = getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY'); // Note: I don't have service role key.

async function investigate() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // We can login as the user.
  // The username is "Immanuel Afriel Sanly". Let's get his email.
  // But wait, there is a way to get email without logging in? No.
  
  // I will just fetch all properties from KosanKu.
}
