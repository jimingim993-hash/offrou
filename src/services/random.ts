/**
 * 놀이용 랜덤 선택 공통 도구 (단어·질문·색·주제·이모지 등).
 * - 한 번에 고른 것끼리는 겹치지 않는다.
 * - "다른 것"을 누르면 방금 보여준 것과 가능한 한 겹치지 않게 고른다.
 * 테스트에서 결과를 고정할 수 있도록 random을 주입할 수 있다.
 */
export type Random = () => number;

/** 서로 다른 n개 (pool이 n보다 작으면 pool 전체를 섞어서) */
export function pickDistinct<T>(pool: readonly T[], n: number, random: Random = Math.random, avoid: readonly T[] = []): T[] {
  const preferred = pool.filter((x) => !avoid.includes(x));
  // 피할 것을 빼고도 충분하면 그 안에서, 아니면 전체에서
  const source = preferred.length >= n ? preferred : [...pool];
  const copy = [...source];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

/** 하나 고르기. 방금 것(avoid)과 다른 것으로 */
export function pickOne<T>(pool: readonly T[], random: Random = Math.random, avoid?: T): T {
  return pickDistinct(pool, 1, random, avoid === undefined ? [] : [avoid])[0];
}

/** 섞기 (원본은 그대로) */
export const shuffle = <T>(items: readonly T[], random: Random = Math.random): T[] => pickDistinct(items, items.length, random);
