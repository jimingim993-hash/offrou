import { Link, useSearchParams } from 'react-router-dom';
import { useStoreVersion } from '@/hooks/useStoreVersion';
import { getRecords } from '@/services/records';
import { getSaved } from '@/services/saved';
import { getCourseRunsRaw, getSavedCourses } from '@/services/courses';
import { SavedCourseList } from './SavedCourseList';
import { PageHeader } from '@/components/ui/PageHeader';
import { MyOverview } from './MyOverview';
import { RecordList } from './RecordList';
import { SavedList } from './SavedList';
import { ResetData } from './ResetData';
import { AppSettings } from './AppSettings';
import { RecentViewed } from './RecentViewed';
import { AccountCard } from '@/features/account/AccountCard';
import styles from './MyPage.module.css';

const TABS = [
  { id: 'records', label: '지나온 시간' },
  { id: 'saved', label: '저장한 시간' },
  { id: 'courses', label: '저장한 코스' },
  { id: 'recent', label: '최근 본 시간' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function MyPage() {
  useStoreVersion(); // 저장·초기화가 일어나면 다시 그린다
  const [params, setParams] = useSearchParams();
  const tab: TabId = TABS.find((t) => t.id === params.get('tab'))?.id ?? 'records';
  const records = getRecords();
  const saved = getSaved();
  const savedCourses = getSavedCourses();

  return (
    <>
      <PageHeader eyebrow="MY OFFROU" title="내가 보낸 시간들" />

      <AccountCard />

      {records.length > 0 && <MyOverview records={records} />}

      <div className={styles.tabs} role="tablist" aria-label="MY OFFROU">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={`${styles.tab} ${tab === t.id ? styles.tabOn : ''}`}
            onClick={() => setParams(t.id === 'records' ? {} : { tab: t.id }, { replace: true })}
          >
            {t.label}
            {t.id === 'saved' && saved.length > 0 && <span className={styles.tabCount}>{saved.length}</span>}
            {t.id === 'courses' && savedCourses.length > 0 && <span className={styles.tabCount}>{savedCourses.length}</span>}
          </button>
        ))}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className={styles.panel}>
        {tab === 'records' && <RecordList records={records} runs={getCourseRunsRaw()} />}
        {tab === 'saved' && <SavedList saved={saved} />}
        {tab === 'courses' && <SavedCourseList courses={savedCourses} />}
        {tab === 'recent' && <RecentViewed />}
      </div>

      <AppSettings />

      <ResetData />

      <nav className={styles.support} aria-label="도움말">
        <Link to="/app/support">문의 및 문제 신고</Link>
        <Link to="/app/support/mine">내 문의</Link>
      </nav>

      {/* 공식 홈페이지로 가는 작은 진입점 (서비스 사용 중에는 눈에 띄지 않게) */}
      <p className={styles.about}>
        <Link to="/">OFFROU 소개</Link>
      </p>
    </>
  );
}
