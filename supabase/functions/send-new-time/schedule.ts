/**
 * "새로운 시간" 알림 발송 규칙 (순수 함수 — 앱 테스트에서도 그대로 검사한다).
 * - 사용자가 고른 시간(사용자 시간대 기준)이 지났고, 아직 1시간이 안 지났고, 오늘 보낸 적이 없을 때만 보낸다.
 * - "가끔"은 일주일에 두 번(화·금)만.
 * - 문구는 부드러운 제안만. 재촉·비교·죄책감을 주는 말은 쓰지 않는다.
 */
export type Frequency = 'daily' | 'sometimes';

export interface ScheduleRow {
  notify_time: string;
  frequency: Frequency;
  timezone: string;
  last_sent_on: string | null;
}

export const SEND_WINDOW_MINUTES = 60;
/** 가끔 = 화(2)·금(5) */
export const SOMETIMES_DAYS = [2, 5];

export const GENTLE_MESSAGES = [
  '잠깐 다른 시간으로 가볼래?',
  '오늘 이런 시간은 어때?',
  '10분 정도 다른 걸 해볼까?',
  '오늘 하루에 작은 틈 하나 만들어볼래?',
] as const;

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** 주어진 시각을 사용자 시간대의 날짜·요일·분으로 */
export function localParts(now: Date, timezone: string): { date: string; weekday: number; minutes: number } {
  let tz = timezone;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
  } catch {
    tz = 'Asia/Seoul';
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: WEEKDAYS[parts.weekday] ?? 0,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function isDue(row: ScheduleRow, now: Date): boolean {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(row.notify_time);
  if (!match) return false;
  const target = Number(match[1]) * 60 + Number(match[2]);
  const local = localParts(now, row.timezone);
  if (row.last_sent_on === local.date) return false;
  if (row.frequency === 'sometimes' && !SOMETIMES_DAYS.includes(local.weekday)) return false;
  return local.minutes >= target && local.minutes < target + SEND_WINDOW_MINUTES;
}

/** 날짜마다 문구를 바꿔가며 고른다 (같은 날에는 같은 문구) */
export function pickMessage(dateKey: string): string {
  let h = 0;
  for (const ch of dateKey) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GENTLE_MESSAGES[h % GENTLE_MESSAGES.length];
}

/** 알림 내용. 누르면 OFFROU 홈(/app)이 열린다 — 오늘의 OFFROU가 그 화면에 있다 */
export function buildPayload(dateKey: string) {
  return { title: 'OFFROU', body: pickMessage(dateKey), url: '/app' };
}

/** 더 이상 유효하지 않은 구독 (브라우저에서 구독을 끊었거나 만료) → 지운다 */
export const isGoneStatus = (status: number | undefined) => status === 404 || status === 410;
