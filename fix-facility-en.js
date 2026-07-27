const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf8');
const getEnv = (key) => {
  const match = envFile.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('EXPO_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl, supabaseKey);

const myMemoryEmail = getEnv('EXPO_PUBLIC_MYMEMORY_EMAIL') || 'support@kosanku.id';

const translateText = async (text) => {
  if (!text) return text;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=id|en&de=${encodeURIComponent(myMemoryEmail)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data && data.responseData) {
      return data.responseData.translatedText;
    }
  } catch (error) {
    console.error('Translation error for:', text, error.message);
  }
  return text;
};

async function fixFacilities() {
  console.log('Fetching facilities with empty name_en...');
  const { data: facilities, error } = await supabase
    .from('facility_master')
    .select('*')
    .is('name_en', null);
    
  if (error) {
    console.error('Error fetching:', error);
    return;
  }
  
  if (!facilities || facilities.length === 0) {
    console.log('No facilities need updating!');
    return;
  }
  
  console.log(`Found ${facilities.length} facilities to update.`);
  
  for (const fac of facilities) {
    const enName = await translateText(fac.name);
    console.log(`Translating: ${fac.name} -> ${enName}`);
    
    const { error: updateError } = await supabase
      .from('facility_master')
      .update({ name_en: enName })
      .eq('id', fac.id);
      
    if (updateError) {
      console.error(`Failed to update ${fac.id}:`, updateError);
    } else {
      console.log(`Updated ${fac.name} successfully.`);
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('Done!');
}

fixFacilities();
