import { useCallback, useEffect, useId, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isBackendConfigured, loadBackend } from '@/services/account/backend';
import { AccountError, messageFor } from '@/services/account/errors';
import type { AccountBackend, AuthUser } from '@/services/account/types';
import {
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  SUPPORT_TYPES,
  priorityLabel,
  statusLabel,
  typeLabel,
  type AdminFilter,
  type AdminSupportRequest,
  type SupportHistory,
  type SupportNote,
  type SupportPriority,
  type SupportStatus,
} from '@/services/support/types';
import styles from './admin.module.css';
import { BrandLogo } from '@/components/brand/BrandLogo';

type Gate = 'loading' | 'unavailable' | 'login' | 'checking' | 'forbidden' | 'ready';

/**
 * OFFROU 운영자 관리센터 (/admin).
 * - 화면 진입 조건: 로그인 + 서버 함수 is_offrou_admin() = true. 이 화면의 숨김은 편의일 뿐이고,
 *   실제 데이터 접근은 Supabase RLS가 막는다 (운영자가 아니면 목록이 비어 오고 수정이 거부된다).
 * - 세션이 끝나거나 권한이 사라지면 데이터를 지우고 로그인 화면으로 돌아간다.
 * - 일반 사용자 화면 어디에도 이 주소로 가는 링크를 두지 않는다.
 */
export function AdminApp() {
  const [backend, setBackend] = useState<AccountBackend | null>(null);
  const [gate, setGate] = useState<Gate>(() => (isBackendConfigured() ? 'loading' : 'unavailable'));
  const [user, setUser] = useState<AuthUser | null>(null);

  // 검색 엔진에 노출하지 않는다
  useEffect(() => {
    document.title = 'OFFROU 운영자';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  const check = useCallback(async (b: AccountBackend, u: AuthUser | null) => {
    setUser(u);
    if (!u) return setGate('login');
    if (!b.admin) return setGate('unavailable');
    setGate('checking');
    try {
      setGate((await b.admin.isAdmin()) ? 'ready' : 'forbidden');
    } catch {
      setGate('login');
    }
  }, []);

  useEffect(() => {
    if (!isBackendConfigured()) return;
    let alive = true;
    let unsubscribe = () => {};
    void loadBackend().then(async (b) => {
      if (!alive) return;
      if (!b) return setGate('unavailable');
      setBackend(b);
      await check(b, await b.getUser().catch(() => null));
      unsubscribe = b.onAuthChange((u) => alive && void check(b, u));
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [check]);

  const signOut = async () => {
    setGate('login');
    setUser(null);
    await backend?.signOut().catch(() => undefined);
  };

  /** 데이터 요청 중 세션이 끝났으면 화면을 비우고 다시 로그인 */
  const onExpired = () => {
    setGate('login');
    setUser(null);
  };

  return (
    <div className={styles.admin}>
      <header className={styles.top}>
        <p className={styles.brand}>
          <BrandLogo height={20} alt="OFFROU" />
          <strong>운영자</strong>
        </p>
        {gate === 'ready' && (
          <div className={styles.topRight}>
            <span className={styles.who}>{user?.email}</span>
            <button type="button" className={styles.ghost} onClick={() => void signOut()}>
              로그아웃
            </button>
          </div>
        )}
      </header>
      <main className={styles.main}>
        {gate === 'loading' || gate === 'checking' ? (
          <p className={styles.muted}>확인하고 있어…</p>
        ) : gate === 'unavailable' ? (
          <p className={styles.muted}>서버 연결 설정(VITE_SUPABASE_URL · VITE_SUPABASE_ANON_KEY)과 문의 테이블 마이그레이션이 필요해.</p>
        ) : gate === 'login' ? (
          backend && <AdminLogin backend={backend} />
        ) : gate === 'forbidden' ? (
          <div className={styles.panel} role="alert">
            <p>이 계정에는 운영자 권한이 없어.</p>
            <button type="button" className={styles.ghost} onClick={() => void signOut()}>
              로그아웃
            </button>
          </div>
        ) : (
          backend?.admin && <AdminConsole backend={backend} onExpired={onExpired} />
        )}
      </main>
    </div>
  );
}

function AdminLogin({ backend }: { backend: AccountBackend }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ids = { email: useId(), password: useId() };
  return (
    <form
      className={styles.login}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await backend.signIn(email, password);
        } catch (err) {
          setError(messageFor(err));
        }
        setBusy(false);
      }}
    >
      <h1 className={styles.h1}>운영자 로그인</h1>
      <label htmlFor={ids.email} className={styles.label}>
        이메일
      </label>
      <input id={ids.email} className={styles.input} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label htmlFor={ids.password} className={styles.label}>
        비밀번호
      </label>
      <input
        id={ids.password}
        className={styles.input}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className={styles.primary} disabled={busy || !email || !password}>
        {busy ? '확인 중…' : '로그인'}
      </button>
    </form>
  );
}

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function AdminConsole({ backend, onExpired }: { backend: AccountBackend; onExpired: () => void }) {
  const admin = backend.admin!;
  const [params, setParams] = useSearchParams();
  const selected = params.get('r');
  const [filter, setFilter] = useState<AdminFilter>({});
  const [all, setAll] = useState<AdminSupportRequest[]>([]);
  const [list, setList] = useState<AdminSupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const guard = useCallback(
    async <T,>(task: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await task();
      } catch (e) {
        if (e instanceof AccountError && e.code === 'session_expired') onExpired();
        else setError('불러오지 못했어. 새로고침해줘.');
        return undefined;
      }
    },
    [onExpired],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    // 권한이 사라졌으면 데이터를 보여주지 않는다
    const still = await guard(() => admin.isAdmin());
    if (still === false) return onExpired();
    const [everything, filtered] = await Promise.all([guard(() => admin.list()), guard(() => admin.list(filter))]);
    if (everything) setAll(everything);
    if (filtered) setList(filtered);
    setLoading(false);
  }, [admin, filter, guard, onExpired]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const count = (s?: SupportStatus) => all.filter((r) => !s || r.status === s).length;

  if (selected)
    return (
      <AdminDetail
        id={selected}
        backend={backend}
        guard={guard}
        onBack={() => {
          setParams({});
          void reload();
        }}
      />
    );

  return (
    <>
      <section className={styles.counts} aria-label="요청 현황">
        {[
          ['전체', count()],
          ['신규', count('new')],
          ['확인 중', count('checking')],
          ['처리 중', count('in_progress')],
          ['처리 완료', count('resolved')],
        ].map(([label, n]) => (
          <div key={label} className={styles.count}>
            <span className={styles.countN}>{n}</span>
            <span className={styles.countL}>{label}</span>
          </div>
        ))}
      </section>

      <section className={styles.filters} aria-label="검색·필터">
        <input
          className={styles.input}
          type="search"
          aria-label="접수번호 또는 제목 검색"
          placeholder="접수번호 · 제목"
          value={filter.q ?? ''}
          onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value || undefined }))}
        />
        <select aria-label="상태" className={styles.select} value={filter.status ?? ''} onChange={(e) => setFilter((f) => ({ ...f, status: (e.target.value || undefined) as SupportStatus | undefined }))}>
          <option value="">모든 상태</option>
          {SUPPORT_STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select aria-label="유형" className={styles.select} value={filter.type ?? ''} onChange={(e) => setFilter((f) => ({ ...f, type: (e.target.value || undefined) as AdminFilter['type'] }))}>
          <option value="">모든 유형</option>
          {SUPPORT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select aria-label="우선순위" className={styles.select} value={filter.priority ?? ''} onChange={(e) => setFilter((f) => ({ ...f, priority: (e.target.value || undefined) as SupportPriority | undefined }))}>
          <option value="">모든 우선순위</option>
          {SUPPORT_PRIORITIES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <button type="button" className={styles.ghost} onClick={() => void reload()}>
          새로고침
        </button>
      </section>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className={styles.muted}>불러오는 중…</p>
      ) : list.length === 0 ? (
        <p className={styles.muted}>해당하는 요청이 없어.</p>
      ) : (
        <ul className={styles.list} aria-label="요청 목록">
          {list.map((r) => (
            <li key={r.id}>
              <button type="button" className={styles.row} onClick={() => setParams({ r: r.id })}>
                <span className={styles.rowTop}>
                  <span className={`${styles.status} ${styles[`s-${r.status}`]}`}>{statusLabel(r.status)}</span>
                  <span className={styles.prio}>{priorityLabel(r.priority)}</span>
                  <span className={styles.num}>{r.request_number}</span>
                </span>
                <span className={styles.rowTitle}>{r.title}</span>
                <span className={styles.muted}>{`${typeLabel(r.type)} · ${fmt(r.created_at)}${r.is_guest ? ' · 비회원' : ''}`}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function AdminDetail({
  id,
  backend,
  guard,
  onBack,
}: {
  id: string;
  backend: AccountBackend;
  guard: <T>(task: () => Promise<T>) => Promise<T | undefined>;
  onBack: () => void;
}) {
  const admin = backend.admin!;
  const [req, setReq] = useState<AdminSupportRequest | null | undefined>(undefined);
  const [notes, setNotes] = useState<SupportNote[]>([]);
  const [history, setHistory] = useState<SupportHistory[]>([]);
  const [note, setNote] = useState('');
  const [reply, setReply] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const noteId = useId();
  const replyId = useId();

  const load = useCallback(async () => {
    const [r, n, h] = await Promise.all([guard(() => admin.get(id)), guard(() => admin.notes(id)), guard(() => admin.history(id))]);
    setReq(r ?? null);
    setReply(r?.reply ?? '');
    setNotes(n ?? []);
    setHistory(h ?? []);
  }, [admin, guard, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = async (patch: Partial<Pick<AdminSupportRequest, 'status' | 'priority' | 'reply'>>, msg: string) => {
    setSaving(true);
    setSaved(null);
    await guard(() => admin.update(id, patch));
    await load();
    setSaving(false);
    setSaved(msg);
  };

  if (req === undefined) return <p className={styles.muted}>불러오는 중…</p>;
  if (req === null)
    return (
      <div className={styles.panel}>
        <p>요청을 찾을 수 없어.</p>
        <button type="button" className={styles.ghost} onClick={onBack}>
          목록으로
        </button>
      </div>
    );

  const info: [string, string | null][] = [
    ['접수 시각', new Date(req.created_at).toLocaleString('ko-KR')],
    ['사용자', req.is_guest ? '비회원' : `로그인 사용자 (${req.user_id?.slice(0, 8)}…)`],
    ['답변 이메일', req.email],
    ['콘텐츠', req.content_id ? `${req.content_id} (v${req.content_version ?? 1}, ${req.category ?? '-'})` : null],
    ['신고 사유', req.report_reason],
    ['오류 코드', req.error_code],
    ['앱 버전', req.app_version],
    ['화면', req.route],
    ['브라우저 · OS', [req.browser, req.os].filter(Boolean).join(' · ') || null],
    ['설치형 앱', req.is_pwa === null ? null : req.is_pwa ? '예' : '아니오'],
    ['화면 크기', req.screen],
  ];

  return (
    <article className={styles.detail}>
      <button type="button" className={styles.ghost} onClick={onBack}>
        ← 목록으로
      </button>
      <p className={styles.num}>{req.request_number}</p>
      <h1 className={styles.h1}>{req.title}</h1>
      <p className={styles.muted}>{typeLabel(req.type)}</p>
      <p className={styles.message}>{req.message}</p>

      <dl className={styles.info}>
        {info
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className={styles.infoRow}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
      </dl>

      <section className={styles.panel} aria-label="처리">
        <label className={styles.label}>
          상태
          <select className={styles.select} value={req.status} disabled={saving} onChange={(e) => void update({ status: e.target.value as SupportStatus }, '상태를 바꿨어.')}>
            {SUPPORT_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.label}>
          우선순위
          <select className={styles.select} value={req.priority} disabled={saving} onChange={(e) => void update({ priority: e.target.value as SupportPriority }, '우선순위를 바꿨어.')}>
            {SUPPORT_PRIORITIES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={replyId} className={styles.label}>
          사용자에게 보이는 답변 (로그인 사용자는 '내 문의'에서 봐. 이메일은 보내지 않아)
        </label>
        <textarea id={replyId} className={styles.textarea} rows={3} maxLength={2000} value={reply} onChange={(e) => setReply(e.target.value)} />
        <button type="button" className={styles.primary} disabled={saving || reply === (req.reply ?? '')} onClick={() => void update({ reply: reply.trim() || null }, '답변을 저장했어.')}>
          답변 저장
        </button>
        {saved && (
          <p className={styles.ok} role="status">
            {saved}
          </p>
        )}
      </section>

      <section className={styles.panel} aria-labelledby="notes-h">
        <h2 id="notes-h" className={styles.h2}>
          내부 메모 (사용자에게 보이지 않아)
        </h2>
        <ul className={styles.notes}>
          {notes.map((n) => (
            <li key={n.id}>
              <span className={styles.muted}>{fmt(n.created_at)}</span> {n.note}
            </li>
          ))}
        </ul>
        <label htmlFor={noteId} className={styles.label}>
          메모 추가
        </label>
        <textarea id={noteId} className={styles.textarea} rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
        <button
          type="button"
          className={styles.primary}
          disabled={saving || !note.trim()}
          onClick={async () => {
            setSaving(true);
            await guard(() => admin.addNote(id, note.trim()));
            setNote('');
            await load();
            setSaving(false);
          }}
        >
          메모 저장
        </button>
      </section>

      <section className={styles.panel} aria-labelledby="hist-h">
        <h2 id="hist-h" className={styles.h2}>
          처리 이력
        </h2>
        <ol className={styles.notes}>
          <li>
            <span className={styles.muted}>{fmt(req.created_at)}</span> 접수
          </li>
          {history.map((h) => (
            <li key={h.id}>
              <span className={styles.muted}>{fmt(h.created_at)}</span> {statusLabel(h.new_status)}
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
