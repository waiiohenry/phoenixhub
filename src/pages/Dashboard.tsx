import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export function Dashboard({ user }: { user: User | null }) {
    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <div style={{ padding: '2rem' }}>
            <h1>Staff Dashboard</h1>
            <p>Welcome, {user?.email}</p>
            <button onClick={handleLogout}>Log out</button>
        </div>
    );
}
