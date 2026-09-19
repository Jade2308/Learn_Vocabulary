import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const DEMO_EMAIL = 'demo@vocabsrs.app';
let cachedUserId: string | null = null;

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

  if (cachedUserId) {
    return cachedUserId;
  }

  // Tự động tìm hoặc tạo 1 demo user hợp lệ trong auth.users
  try {
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const existing = usersData?.users?.find((u) => u.email === DEMO_EMAIL);
    if (existing) {
      cachedUserId = existing.id;
      return existing.id;
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      email_confirm: true,
      user_metadata: { name: 'Demo User' },
    });

    if (!createError && newUser?.user) {
      cachedUserId = newUser.user.id;
      return newUser.user.id;
    }
  } catch (e) {
    console.error('Error ensuring demo user in Supabase auth:', e);
  }

  return '00000000-0000-0000-0000-000000000001';
}
