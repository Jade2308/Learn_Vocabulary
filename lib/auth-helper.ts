import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

const DEMO_EMAIL = 'demo@vocabsrs.app';
const FALLBACK_DEMO_USER_ID = 'cd20743a-d3d0-437d-ad71-4bd6159a799a';

const globalForAuth = globalThis as unknown as { cachedUserId?: string };

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

  // Tối ưu hóa tốc độ: ưu tiên lấy trực tiếp ID demo đã cấu hình (0ms latency)
  const configuredUserId = process.env.DEFAULT_DEMO_USER_ID || FALLBACK_DEMO_USER_ID;
  if (configuredUserId) {
    return configuredUserId;
  }

  if (globalForAuth.cachedUserId) {
    return globalForAuth.cachedUserId;
  }

  // Tự động tìm hoặc tạo 1 demo user hợp lệ trong auth.users nếu chưa có
  try {
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
    const existing = usersData?.users?.find((u) => u.email === DEMO_EMAIL);
    if (existing) {
      globalForAuth.cachedUserId = existing.id;
      return existing.id;
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      email_confirm: true,
      user_metadata: { name: 'Demo User' },
    });

    if (!createError && newUser?.user) {
      globalForAuth.cachedUserId = newUser.user.id;
      return newUser.user.id;
    }
  } catch (e) {
    console.error('Error ensuring demo user in Supabase auth:', e);
  }

  return '00000000-0000-0000-0000-000000000001';
}
