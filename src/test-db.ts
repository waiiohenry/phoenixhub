import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ijemdeyeaongbrgcxqll.supabase.co';
const supabaseKey = 'sb_publishable_7xT_3uOYBxV9z-LXBRyOwA_o9Qbkq-a';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('staff_profiles').select('*').limit(1);
    if (error) {
        console.error("Error fetching staff:", error);
    } else {
        console.log("Columns:", Object.keys(data[0] || {}));
    }
}

check();
