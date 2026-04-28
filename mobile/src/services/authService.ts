import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export async function signUp(email: string, password: string) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Sign up error:', error);
        throw error;
    }
}

export async function signIn(email: string, password: string) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Sign in error:', error);
        throw error;
    }
}

export async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
        console.error('Sign out error:', error);
        throw error;
    }
}

export async function getCurrentUser() {
    try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        return data.user;
    } catch (error) {
        console.error('Get current user error:', error);
        return null;
    }
}

export async function deleteAccount() {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw userError ?? new Error('No user session');

        const { error } = await supabase.rpc('delete_user_account');
        if (error) throw error;

        await supabase.auth.signOut();
    } catch (error) {
        console.error('Delete account error:', error);
        throw error;
    }
}
