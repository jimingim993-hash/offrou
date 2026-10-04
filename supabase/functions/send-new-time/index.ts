// OFFROU "새로운 시간" 알림 발송 (Supabase Edge Function, Deno)
//
// 배포:   supabase functions deploy send-new-time --no-verify-jwt
// Secret: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:... CRON_SECRET=...
//         (SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY는 Supabase가 함수에 자동으로 넣어준다)
// 호출:   pg_cron이 15분마다 x-cron-secret 헤더와 함께 POST (migrations/20261005000000_offrou_push.sql 끝 참고)
//
// ⚠️ VAPID private key와 service role key는 이 서버 함수의 환경변수로만 쓴다. 프런트엔드에 넣지 않는다.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { buildPayload, isDue, isGoneStatus, localParts, type ScheduleRow } from './schedule.ts';

interface SubscriptionRow extends ScheduleRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`missing env ${name}`);
  return value;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  // 스케줄러만 부를 수 있게 공유 비밀값을 확인한다
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return new Response('unauthorized', { status: 401 });

  webpush.setVapidDetails(env('VAPID_SUBJECT'), env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));
  const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin
    .from('offrou_push_subscriptions')
    .select('endpoint, p256dh, auth, notify_time, frequency, timezone, last_sent_on');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const now = new Date();
  const due = (data as SubscriptionRow[]).filter((row) => isDue(row, now));
  let sent = 0;
  let removed = 0;
  let failed = 0;

  for (const row of due) {
    const { date } = localParts(now, row.timezone);
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        JSON.stringify(buildPayload(date)),
        { TTL: 60 * 60, urgency: 'low' },
      );
      await admin.from('offrou_push_subscriptions').update({ last_sent_on: date }).eq('endpoint', row.endpoint);
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (isGoneStatus(status)) {
        // 만료되었거나 사용자가 브라우저에서 끊은 구독은 정리한다
        await admin.from('offrou_push_subscriptions').delete().eq('endpoint', row.endpoint);
        removed++;
      } else {
        failed++;
      }
    }
  }

  return new Response(JSON.stringify({ checked: data.length, due: due.length, sent, removed, failed }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
