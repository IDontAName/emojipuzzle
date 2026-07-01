import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://fbyrbwtysygobtsmbtgx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yxhF2t_vFJpq8pUQQnde9g_mq2hXbTP';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
