import { Link, Navigate, useParams } from 'react-router-dom';
import { CATEGORIES } from '@/data/categories';
import { formatMinutes } from '@/data/durations';
import { PLACE_LABELS } from '@/data/places';
import { getExperiencesByCategory } from '@/services/experiences';
import { experiencePath } from '@/features/experience/paths';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SaveButton } from '@/components/experience/SaveButton';
import styles from './CategoryPage.module.css';

/** 카테고리별 경험 둘러보기. HOME 추천과 달리 여기선 직접 고를 수 있다. */
export function CategoryPage() {
  const { categoryId } = useParams();
  const category = CATEGORIES.find((c) => c.id === categoryId);

  if (!category) return <Navigate to="/discover" replace />;

  const experiences = getExperiencesByCategory(category.id);

  return (
    <>
      <PageHeader eyebrow={category.code} title={category.name} description={category.tagline} />
      {experiences.length === 0 ? (
        <EmptyState symbol={category.symbol} title="곧 이곳이 채워질 거야." description="조금만 기다려줘." />
      ) : (
        <ul className={styles.list}>
          {experiences.map((e) => (
            <li key={e.id} className={styles.row}>
              <Link to={experiencePath(e.id)} className={styles.item}>
                <span className={styles.title}>{e.title}</span>
                <span className={styles.meta}>
                  {formatMinutes(e.minutes)} · {PLACE_LABELS[e.place]}
                </span>
              </Link>
              <span className={styles.save}>
                <SaveButton experienceId={e.id} title={e.title} compact />
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
