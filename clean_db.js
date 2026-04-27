import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://cakxwchrofktuxkqlsrv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNha3h3Y2hyb2ZrdHV4a3Fsc3J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1MDUxNjksImV4cCI6MjA5MjA4MTE2OX0.TglWlcBsUNRWrrcBN7T7mX77_G9BRljh9a37MoNkolI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function cleanName(name) {
  if (!name) return name;
  let clean = name;
  const extMatch = clean.match(/^(.+?\.(?:pdf|docx?|xlsx?|pptx?|jpe?g|png|txt|csv|rtf|dwg|dwf|zip|rar|7z))(?:\.[a-zA-Z0-9]+)*$/i);
  if (extMatch) {
    clean = extMatch[1];
  }
  return clean;
}

async function run() {
  const { data, error } = await supabase.from('tuc_uploaded_files').select('id, original_name, display_name');
  if (error) {
    console.error(error);
    return;
  }
  
  let updatedCount = 0;
  for (const row of data) {
    const newOriginal = cleanName(row.original_name);
    // Display name might have " (equipment name)" appended. 
    // We should clean display_name too, but carefully.
    let newDisplay = row.display_name;
    if (newDisplay) {
        // usually it's "original_name (equipment_name)"
        // if original_name changed, we replace it.
        if (newOriginal !== row.original_name) {
            newDisplay = newDisplay.replace(row.original_name, newOriginal);
        }
    }

    if (newOriginal !== row.original_name) {
      console.log(`Updating: ${row.original_name} -> ${newOriginal}`);
      await supabase.from('tuc_uploaded_files').update({
        original_name: newOriginal,
        display_name: newDisplay
      }).eq('id', row.id);
      updatedCount++;
    }
  }
  console.log(`Finished. Updated ${updatedCount} rows.`);
}

run();
