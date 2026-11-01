import { createClient } from '@supabase/supabase-js';
import { auth } from './firebase';

const SUPABASE_URL = 'https://zyqggimwntlsjxevukfy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fBAcNV2agKrSbDpTET822A_sR-D03n-';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    accessToken: async () => {
      const user = auth.currentUser;

      if (!user) {
        return null;
      }

      return await user.getIdToken();
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);