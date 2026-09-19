import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const DEFAULT_DEMO_USER_ID = '00000000-0000-0000-0000-000000000001';

export async function getAuthUserId(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (!error && user?.id) {
        return user.id;
      }
    } catch {
      // fallback
    }
  }

  const customUserId = req.headers.get('x-user-id');
  if (customUserId) {
    return customUserId;
  }

  return DEFAULT_DEMO_USER_ID;
}

