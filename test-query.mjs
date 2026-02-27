import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('role_permissions').select('*').limit(1);
  console.log("role_permissions Data:", data, "Error:", error);

  const { data: sData, error: sError } = await supabase.from('staff_profiles').select('clinic_location, role').limit(1);
  console.log("staff_profiles Data:", sData, "Error:", sError);
}
check();
