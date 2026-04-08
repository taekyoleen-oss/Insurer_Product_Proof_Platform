import { createClient } from '@supabase/supabase-js'

// service_role 키 사용 — RLS 우회. API Route Handler 전용.
// 클라이언트 컴포넌트에서 절대 import 금지.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
