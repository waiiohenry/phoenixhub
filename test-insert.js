import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const { data, error } = await supabase
    .from('role_permissions')
    .insert([{ 
        viewer_role: 'rmt', 
        target_department: 'finance',
        can_see_phone: false,
        can_see_bio: false
    }]);
  
  if (error) {
    console.log("REST API insert error:", JSON.stringify(error, null, 2));
  } else {
    console.log("Insert successful:", data);
  }
}

testInsert();
