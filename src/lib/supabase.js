import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cyqwqokuprdotqmizyuf.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5cXdxb2t1cHJkb3RxbWl6eXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NjAzNDksImV4cCI6MjA5MjQzNjM0OX0.CCLXQeM2-TYNRY3_UjTrLS-h_sEj5BipQ5knGHhf3Y0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
