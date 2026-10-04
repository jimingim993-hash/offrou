import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '@/app/navigation';
import styles from './BottomNav.module.css';

export function BottomNav({ typing = false }: { typing?: boolean }) {
  return (
    <nav className={`${styles.nav} ${typing ? styles.typing : ''}`} aria-label="주요 메뉴" data-typing={typing || undefined}>
      <ul className={styles.list}>
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
