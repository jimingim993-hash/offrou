/// <reference types="node" />
import { cleanup, render, screen, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { routes } from '@/app/router';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { STORAGE_KEYS } from '@/services/storage';

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const pngSize = (p: string) => {
  const b = readFileSync(join(root, p));
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};
const renderAt = (path: string) => {
  cleanup();
  render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);
};

describe('OFFROU 공식 로고', () => {
  it('브랜드 자산 파일이 있다 (전체 로고 밝은/어두운 · 워드마크 · 심볼 · 앱 아이콘)', () => {
    for (const f of ['offrou-logo-dark.png', 'offrou-logo-light.png', 'offrou-wordmark-dark.png', 'offrou-wordmark-light.png', 'offrou-symbol.png', 'offrou-app-icon.png'])
      expect(existsSync(join(root, 'public/brand', f)), f).toBe(true);
    expect(pngSize('public/brand/offrou-app-icon.png')).toEqual([1024, 1024]);
    expect(pngSize('public/brand/offrou-symbol.png')).toEqual([512, 512]);
  });

  it('BrandLogo: 전체 로고는 alt="OFFROU", 테마별 변형 · 장식이면 읽지 않는다 · CSS 필터로 반전하지 않는다', () => {
    const { container } = render(<BrandLogo />);
    const imgs = container.querySelectorAll('img');
    expect([...imgs].map((i) => i.getAttribute('src'))).toEqual(['/brand/offrou-logo-light.png', '/brand/offrou-logo-dark.png']);
    expect([...imgs].every((i) => i.getAttribute('alt') === 'OFFROU')).toBe(true);
    cleanup();
    const { container: c2 } = render(<BrandLogo variant="symbol" decorative height={16} />);
    const sym = c2.querySelector('img')!;
    expect(sym).toHaveAttribute('src', '/brand/offrou-symbol.png');
    expect(sym).toHaveAttribute('alt', '');
    expect(sym).toHaveAttribute('aria-hidden', 'true');
    expect(read('src/components/brand/BrandLogo.module.css')).not.toMatch(/filter|invert/);
  });

  it('홈페이지 헤더·히어로에 공식 로고, 대표 문구는 그대로', async () => {
    renderAt('/');
    const h1 = await screen.findByRole('heading', { level: 1, name: '같은 하루에, 다른 시간을.' }, { timeout: 8000 });
    expect(h1).toBeInTheDocument();
    const top = screen.getByRole('link', { name: 'OFFROU 맨 위로' });
    expect(top.querySelector('img[src="/brand/offrou-logo-light.png"]')).not.toBeNull();
    expect(within(top).queryAllByRole('img')).toHaveLength(0); // 링크 이름과 중복해서 읽지 않는다
    const hero = screen.getByRole('region', { name: /같은 하루에/ });
    expect(within(hero).getAllByRole('img', { name: 'OFFROU' }).length).toBeGreaterThan(0);
    expect(within(hero).getByText('오프루')).toBeInTheDocument();
  });

  it('/app HOME: 작은 로고 + 6개 카드 그대로', () => {
    localStorage.setItem(STORAGE_KEYS.onboarding, JSON.stringify({ seenAt: 'x' }));
    renderAt('/app');
    expect(screen.getAllByRole('img', { name: 'OFFROU' })[0]).toHaveAttribute('height', '20');
    expect(within(screen.getByRole('group', { name: '지금 어떤 시간이 필요해?' })).getAllByRole('button')).toHaveLength(6);
  });

  it('favicon·apple-touch-icon·manifest 아이콘은 심볼 기반 PNG, start_url은 /app', () => {
    const html = read('index.html');
    expect(html).not.toContain('icon.svg');
    expect(html).toContain('href="/icons/favicon-32.png"');
    expect(html).toContain('href="/icons/apple-touch-icon.png"');
    const manifest = JSON.parse(read('public/manifest.webmanifest'));
    expect(manifest).toMatchObject({ name: 'OFFROU', short_name: 'OFFROU', start_url: '/app', scope: '/' });
    expect(manifest.icons.map((i: { src: string }) => i.src)).toEqual(['/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png']);
    expect(pngSize('public/icons/favicon-32.png')).toEqual([32, 32]);
    expect(pngSize('public/icons/icon-maskable-512.png')).toEqual([512, 512]);
    expect(read('public/sw.js')).toContain("'/brand/offrou-logo-dark.png'");
    expect(read('public/sw.js')).not.toContain('icon.svg');
  });

  it('로고 교체는 사용자 데이터를 건드리지 않는다', () => {
    const files = ['src/components/brand/BrandLogo.tsx', 'src/features/site/SiteHeader.tsx', 'src/features/site/HeroSection.tsx', 'src/features/home/HomePage.tsx'];
    for (const f of files) expect(read(f), f).not.toMatch(/localStorage|resetAllData|removeItem/);
  });
});
