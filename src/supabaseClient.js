import { createClient } from '@supabase/supabase-js';

// Fallback to real credentials so Vercel builds work seamlessly without requiring UI settings setup
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://efqjgtdpkiqgyameyavn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcWpndGRwa2lxZ3lhbWV5YXZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3ODI1OTIsImV4cCI6MjEwMDM1ODU5Mn0._onRhB1Pd7ZNR6KlQg00jCnPbZmH_LEcJYHNBYbBmnY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
