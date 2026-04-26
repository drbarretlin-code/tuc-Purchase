import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkStatus() {
  const { data, error } = await supabase
    .from('tuc_uploaded_files')
    .select('id, original_name, parse_status, updated_at, error_message, extracted_text')
    .eq('parse_status', 'processing')
    .or('parse_status.ilike.processing%');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('--- Current Processing Files ---');
  data.forEach(f => {
    console.log(`ID: ${f.id}`);
    console.log(`Name: ${f.original_name}`);
    console.log(`Status: ${f.parse_status}`);
    console.log(`Updated At: ${f.updated_at}`);
    console.log(`Error: ${f.error_message || 'None'}`);
    console.log(`Text Extracted: ${f.extracted_text ? 'Yes' : 'No'}`);
    console.log('-------------------------------');
  });
}

checkStatus();
