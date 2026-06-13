import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://qgofshosxvunqbbycwyq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnb2ZzaG9zeHZ1bnFiYnljd3lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MzEzODMsImV4cCI6MjA4NzQwNzM4M30.Wc7SolVC4DH806UIB7C8AjsxcA195MQsoUwbK_l0KAY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
