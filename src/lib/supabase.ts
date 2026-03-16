import { env } from 'cloudflare:workers';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
