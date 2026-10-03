import { useSearchParams } from 'react-router-dom';
import { useStoreVersion } from '@/hooks/useStoreVersion';
import { getRecords } from '@/services/records';
import { getSaved } from '@/services/saved';
import { PageHeader } from '@/components/ui/PageHeader';
import { MyOverview } from './MyOverview';
import { RecordList } from './RecordList';
import { SavedList } from './SavedList';
import { ResetData } from './ResetData';
import styles from './MyPage.module.css';

const TABS = [
  { id: 'records', label: '지나온 시간' },
  { id: 'saved', label: '저장한 시간' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function MyPage() {
  useStoreVersion(); // 저장·초기화가 일어나면 다시 그린다
  const [params, setParams] = useSearchParams();
  const tab: TabId = params.get('tab') === 'saved' ? 'saved' : 'records';
  const records = getRecords();
  const saved = getSaved();

  return (
    <>
      <PageHeader eyebrow="MY OFFROU" title="내가 보낸 시간들" />

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
            onClick={() => setParams(t.id === 'saved' ? { tab: 'saved' } : {}, { replace: true })}
          >
            {t.label}
            {t.id === 'saved' && saved.length > 0 && <span className={styles.tabCount}>{saved.length}</span>}
          </button>
        ))}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className={styles.panel}>
        {tab === 'records' ? <RecordList records={records} /> : <SavedList saved={saved} />}
      </div>

      <ResetData />
    </>
  );
}
