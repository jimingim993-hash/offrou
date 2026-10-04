import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chip } from '@/components/ui/Chip';
import { useAccount } from '@/features/account/AccountProvider';
import type { NotifyFrequency } from '@/services/account/types';
import {
  FREQUENCIES,
  TIME_PRESETS,
  disableNotifications,
  enableNotifications,
  formatTime,
  getNotifyCapability,
  getNotifyPermission,
  getNotifySettings,
  isValidTime,
  type NotifyPermission,
  type NotifySettings,
} from '@/pwa/notifications';
import styles from './AppSettings.module.css';

const FAILED: Record<'dismissed' | 'unsupported' | 'failed', string> = {
  dismissed: '알림 권한을 고르지 않았어. 원할 때 다시 눌러줘.',
  unsupported: '이 기기에서는 아직 알림을 사용할 수 없어.',
  failed: '지금은 알림을 켜지 못했어. 잠시 뒤에 다시 해줘.',
};

const describe = (s: NotifySettings) =>
  `${s.frequency === 'daily' ? '매일' : '가끔'} ${formatTime(s.time ?? '19:00')}쯤 새로운 시간을 제안해줄게.`;

/**
 * "새로운 시간 알림" 설정. 기본은 꺼져 있다.
 * 권한은 사용자가 시간을 고른 뒤 "이 시간으로 받기"를 누를 때만 요청한다.
 */
export function NotificationSettings() {
  const { status, pushStore } = useAccount();
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  const [capability] = useState(getNotifyCapability);
  const [permission, setPermission] = useState<NotifyPermission>(() =>
    capability === 'supported' ? getNotifyPermission() : 'default',
  );
  const [settings, setSettings] = useState(getNotifySettings);
  const [editing, setEditing] = useState(false);
  const [time, setTime] = useState<string | null>(settings.time);
  const [frequency, setFrequency] = useState<NotifyFrequency>(settings.frequency);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const customId = useId();

  const active = settings.enabled && permission === 'granted';
  const isPreset = TIME_PRESETS.some((p) => p.time === time);

  const body = () => {
    if (capability === 'unsupported') return <p className={styles.itemText}>이 기기에서는 아직 알림을 사용할 수 없어.</p>;
    if (capability === 'ios-needs-install')
      return (
        <p className={styles.itemText}>
          iPhone·iPad에서는 홈 화면에 추가한 OFFROU에서 알림을 받을 수 있어. (iOS 16.4 이상)
        </p>
      );
    if (permission === 'denied') return <p className={styles.itemText}>브라우저 설정에서 알림 권한을 변경할 수 있어.</p>;
    if (status === 'loading') return <p className={styles.itemText}>확인하고 있어…</p>;
    if (status !== 'signedIn' && status !== 'unavailable')
      return (
        <>
          <p className={styles.itemText}>알림은 로그인한 뒤에 받을 수 있어.</p>
          <Link to="/app/account?mode=login" className={styles.secondary}>
            로그인
          </Link>
        </>
      );
    if (!vapidKey || !pushStore) return <p className={styles.itemText}>알림 기능은 아직 준비 중이야.</p>;

    if (active && !editing)
      return (
        <>
          <p className={styles.itemText} role="status">
            {describe(settings)}
          </p>
          <div className={styles.buttons}>
            <button type="button" className={styles.secondary} onClick={() => setEditing(true)}>
              시간 바꾸기
            </button>
            <button
              type="button"
              className={styles.secondary}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await disableNotifications({ store: pushStore });
                setSettings(getNotifySettings());
                setMessage('알림을 껐어.');
                setBusy(false);
              }}
            >
              알림 끄기
            </button>
          </div>
        </>
      );

    if (!editing)
      return (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            setMessage(null);
            setEditing(true);
          }}
        >
          알림 받기
        </button>
      );

    return (
      <div className={styles.picker}>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>언제 새로운 시간을 받아볼까?</legend>
          <div className={styles.chips}>
            {TIME_PRESETS.map((p) => (
              <Chip key={p.time} small label={p.label} selected={time === p.time} onSelect={() => setTime(p.time)} />
            ))}
          </div>
          <label className={styles.custom} htmlFor={customId}>
            <span>직접 고르기</span>
            <input
              id={customId}
              type="time"
              step={300}
              className={styles.timeInput}
              value={time && !isPreset ? time : ''}
              onChange={(e) => setTime(isValidTime(e.target.value) ? e.target.value : null)}
            />
          </label>
        </fieldset>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>얼마나 자주?</legend>
          <div className={styles.chips}>
            {FREQUENCIES.map((f) => (
              <Chip
                key={f.id}
                small
                label={`${f.label} · ${f.hint}`}
                selected={frequency === f.id}
                onSelect={() => setFrequency(f.id)}
              />
            ))}
          </div>
        </fieldset>
        <div className={styles.buttons}>
          <button
            type="button"
            className={styles.action}
            disabled={!time || busy}
            onClick={async () => {
              if (!time) return;
              setBusy(true);
              setMessage(null);
              // 권한 요청은 이 클릭 안에서만 일어난다
              const result = await enableNotifications({ time, frequency, vapidPublicKey: vapidKey, store: pushStore });
              setPermission(getNotifyPermission());
              setBusy(false);
              if (result.ok) {
                setSettings(result.settings);
                setEditing(false);
                setMessage('알림을 켰어. 고른 시간에 가끔 찾아갈게.');
              } else if (result.reason !== 'denied') {
                setMessage(FAILED[result.reason]);
              }
            }}
          >
            {busy ? '켜는 중…' : '이 시간으로 받기'}
          </button>
          <button
            type="button"
            className={styles.quiet}
            onClick={() => {
              setEditing(false);
              setTime(settings.time);
              setFrequency(settings.frequency);
            }}
          >
            취소
          </button>
        </div>
        {!time && <p className={styles.hint}>시간을 고르기 전에는 아무 알림도 예약되지 않아.</p>}
      </div>
    );
  };

  return (
    <div className={styles.item} role="group" aria-label="새로운 시간 알림">
      <p className={styles.itemTitle}>새로운 시간 알림</p>
      <p className={styles.itemText}>가끔 평소와 다른 시간을 제안해줄게.</p>
      {body()}
      {message && (
        <p className={styles.message} role="status">
          {message}
        </p>
      )}
    </div>
  );
}
