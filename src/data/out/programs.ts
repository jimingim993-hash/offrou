/**
 * 실행형 OUT 프로그램 (14단계).
 * 하나의 OutEngine(src/features/out)이 이 데이터만 보고 그린다:
 * 활동 확인(시간·장소·비용·준비물·안전) → [밖으로 나가볼래] → 단계마다 "화면을 내려놓고 다녀와" → [했어] → 완료.
 * - GPS·지도·위치 권한·사진 업로드·걸음 수를 쓰지 않는다. 수행 여부를 검증하지 않는다.
 * - 특정 업체 대신 일반적인 장소 유형만 쓴다.
 * - 밖에 나가기 어려우면 실내 대체 활동(indoorFallback)을 고를 수 있다.
 */
export type OutRandom = 'color' | 'letter' | 'season';

export interface OutProgram {
  id: string;
  /** 어디서 하는지 (일반적인 장소 유형) */
  placeType: string;
  /** 이런 곳이 근처에 있을 때만 (없으면 대체 활동) */
  onlyIf?: string;
  /** 밖에서 할 단계. 한 번에 하나씩 보여주고, 걷는 동안엔 화면을 보지 않게 한다 */
  steps: string[];
  /** 이 활동만의 안전 안내 (공통 안내에 더해) */
  safety?: string[];
  /** 랜덤으로 건네는 것 */
  random?: OutRandom;
  /** 랜덤 산책: 안전한 곳에 서 있을 때만 방향 선택지를 보여준다 */
  directions?: boolean;
  /** 원할 때만 켜는 타이머(분) */
  timerMinutes?: number;
  /** 밖에 나가기 어려운 날의 실내 대체 활동 */
  indoorFallback: { title: string; steps: string[] };
  completionMessage: string;
}

/** 모든 OUT 공통 안전 안내 */
export const OUT_SAFETY = [
  '걷는 동안엔 휴대폰을 보지 않아도 돼. 단계는 미리 읽고 화면은 내려놓아.',
  '익숙한 동네 안에서, 밝고 사람이 다니는 보행로로만.',
  '길을 건널 땐 신호를 지키고, 도로·선로·공사장·사유지에는 들어가지 않기.',
];

export const NIGHT_NOTE = '늦은 시간이야. 밝고 익숙한 집 앞 정도만, 아니면 실내 대체 활동도 좋아.';
export const WEATHER_NOTE = '밖에 나가기 어려운 날이면 실내 대체 활동을 선택해도 돼.';

/** 지금이 밤인지 (현재 기기 시각만 사용, 위치 정보 없음) */
export const isNight = (now = new Date()) => now.getHours() >= 21 || now.getHours() < 6;

export const OUT_COLORS = ['빨간색', '노란색', '파란색', '초록색', '하얀색', '주황색'] as const;
export const OUT_LETTERS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅎ'] as const;
export const OUT_SEASON_HINTS = ['빛', '나무', '공기', '옷차림', '풍경'] as const;

const window5 = { title: '창가에서 바깥 보기', steps: ['창문이 보이는 자리로 가.', '바깥에서 움직이는 것 하나를 찾아봐.', '창문을 잠깐 열 수 있다면 바깥 공기를 한 번 마셔.'] };

export const OUT_PROGRAMS: OutProgram[] = [
  // ─── 기존 OUT (id 유지) ───
  {
    id: 'out-sky',
    placeType: '현관 앞 · 건물 앞',
    steps: ['신발만 신고 현관이나 건물 앞까지 나가.', '하늘을 올려다봐. 구름 모양 하나만.', '주변에서 한 곳을 골라 잠깐 바라봐.', '바깥 공기를 한 번 크게 마시고 돌아와.'],
    indoorFallback: window5,
    completionMessage: '문 하나만 열었는데 공기가 달랐을 거야.',
  },
  {
    id: 'out-new-route',
    placeType: '동네 골목 · 집 주변',
    steps: [
      '평소 다니는 익숙한 길에서 출발해.',
      '안전한 갈림길 하나에서 평소와 다른 방향을 골라.',
      '그 길에서 처음 보는 것 하나를 찾아봐.',
      '아는 길로 돌아와. 10분이면 충분해.',
    ],
    safety: ['길을 잃을 만큼 멀리 가지 않기. 아는 길이 보이는 범위에서.'],
    timerMinutes: 10,
    indoorFallback: { title: '집 안 다른 길', steps: ['평소 안 쓰는 방향으로 방을 한 바퀴 돌아봐.', '오랫동안 안 열어본 서랍 하나를 열어봐.'] },
    completionMessage: '익숙한 동네에 모르는 길이 하나 줄었어.',
  },
  {
    id: 'out-scenery',
    placeType: '동네 · 자주 지나는 길',
    steps: ['평소 지나치던 장소로 나가.', '마음에 드는 장면 하나를 찾아봐.', '찍고 싶으면 한 장만 찍어도 되고, 눈으로만 봐도 돼.', '돌아와.'],
    safety: ['사람 얼굴·차량 번호·남의 집 안은 찍지 않기.'],
    indoorFallback: { title: '창밖 한 장', steps: ['창밖 풍경에서 마음에 드는 부분을 하나 골라.', '눈으로 사진 찍듯 잠깐 바라봐.'] },
    completionMessage: '평범한 동네에서 마음에 드는 장면 하나를 찾았어.',
  },
  {
    id: 'out-new-menu',
    placeType: '동네 가게',
    steps: ['자주 가는 가게나 근처 가게로 가.', '평소 안 고르던 메뉴 하나를 골라봐.', '천천히 맛보고 돌아와.'],
    safety: ['사지 않아도 괜찮아. 메뉴판만 구경하고 와도 돼.'],
    indoorFallback: { title: '집에 있는 것으로 새 조합', steps: ['집에 있는 간식이나 음료로 평소와 다른 조합을 만들어봐.', '천천히 맛봐.'] },
    completionMessage: '익숙한 가게에서 처음 먹어보는 맛을 만났어.',
  },
  {
    id: 'out-get-off-early',
    placeType: '집에 오는 길',
    steps: ['버스나 지하철을 탈 일이 있을 때, 한 정거장 일찍 내려.', '남은 한 정거장을 걸어서 가.', '걷는 동안 처음 보는 것 하나를 찾아봐.'],
    safety: ['탈 일이 없는 날이면 대체 활동으로 충분해. 일부러 타지 않아도 돼.'],
    indoorFallback: { title: '창밖 여행', steps: ['창밖에서 가장 먼 곳을 골라.', '거기까지 가는 길을 상상해봐.'] },
    completionMessage: '한 정거장만큼 다른 길로 왔어.',
  },
  {
    id: 'out-new-place',
    placeType: '동네 · 가까운 거리',
    steps: ['평소 안 가본 방향으로 조금만 가.', '처음 보는 장소 하나를 찾아. 공원, 골목, 가게 앞 무엇이든.', '잠깐 머물러 둘러보고 돌아와.'],
    safety: ['사유지나 출입금지 구역에는 들어가지 않기.'],
    indoorFallback: { title: '집 안 낯선 자리', steps: ['평소 안 앉던 자리에 앉아봐.', '그 자리에서 보이는 것 세 가지를 찾아봐.'] },
    completionMessage: '동네 지도에 장소가 하나 늘었어.',
  },
  {
    id: 'out-aimless-walk',
    placeType: '익숙한 동네',
    steps: ['목적지를 정하지 않고 걷기 시작해.', '마음 가는 쪽으로, 익숙한 범위 안에서만.', '시간이 되면 돌아와.'],
    timerMinutes: 30,
    indoorFallback: { title: '집 안 천천히 걷기', steps: ['집 안을 아주 천천히 한 바퀴 걸어봐.', '발바닥이 닿는 느낌에만 집중해.'] },
    completionMessage: '목적지 없이도 꽤 많은 걸 봤을 거야.',
  },
  {
    id: 'out-park-hour',
    placeType: '가까운 공원',
    onlyIf: '근처에 공원이나 안전한 야외 공간이 있을 때',
    steps: ['가까운 공원으로 가.', '천천히 한 바퀴 걸어.', '벤치나 그늘에 앉아 잠깐 쉬어.', '돌아와.'],
    timerMinutes: 60,
    indoorFallback: window5,
    completionMessage: '공원에서 한 시간을 천천히 보냈어.',
  },
  {
    id: 'out-door-sounds',
    placeType: '현관 앞 · 집 앞',
    steps: ['문 밖으로 한 걸음 나가.', '들리는 소리 세 가지를 찾아봐.', '가장 먼 소리를 마지막으로 듣고 돌아와.'],
    indoorFallback: { title: '창문 너머 소리', steps: ['창문을 조금 열어.', '바깥 소리 세 가지를 들어봐.'] },
    completionMessage: '문 밖에는 생각보다 많은 소리가 있었어.',
  },
  {
    id: 'out-library',
    placeType: '도서관 · 서점 · 책 공간',
    onlyIf: '근처에 도서관이나 서점 같은 책 공간이 있을 때',
    steps: ['가까운 책 공간으로 가.', '구매하지 않아도 돼. 서가 사이를 천천히 걸어.', '책 제목 하나를 천천히 읽어봐.', '마음에 든 제목 하나를 기억하고 나와.'],
    indoorFallback: { title: '집 책장 둘러보기', steps: ['집에 있는 책 아무거나 하나를 꺼내.', '제목과 첫 문장만 읽어봐.'] },
    completionMessage: '책 제목 하나가 오늘 마음에 남았어.',
  },
  {
    id: 'out-sunset',
    placeType: '집 앞 · 동네 · 탁 트인 곳',
    steps: ['지금이 밝고 안전한 시간인지 먼저 확인해.', '하늘이 넓게 보이는 가까운 곳으로 가.', '하늘 색이 바뀌는 걸 잠깐 바라봐.', '어두워지기 전에 돌아와.'],
    safety: ['어두워지면 바로 돌아오기. 이미 밤이라면 대체 활동을 골라.'],
    indoorFallback: { title: '창가에서 저녁 하늘', steps: ['창가로 가서 하늘을 봐.', '오늘 하늘 색에 이름을 하나 붙여봐.'] },
    completionMessage: '오늘 하늘이 바뀌는 순간에 잠깐 있었어.',
  },
  // ─── 새 OUT ───
  {
    id: 'out-color-walk',
    placeType: '동네 골목 · 집 주변',
    random: 'color',
    steps: ['오늘의 색을 기억하고 밖으로 나가.', '천천히 걸으며 그 색 물건을 세 개쯤 찾아봐.', '사진은 찍지 않아도 돼. 다 찾았으면 돌아와.'],
    indoorFallback: { title: '집 안에서 색 찾기', steps: ['집 안에서 오늘의 색 물건을 세 개 찾아봐.'] },
    completionMessage: '한 가지 색으로 동네를 다시 봤어.',
  },
  {
    id: 'out-new-shop',
    placeType: '자주 지나는 길',
    steps: ['평소 지나다니는 길로 나가.', '처음 보는 가게 하나를 찾아봐. 들어가지 않아도 돼.', '간판이나 진열창을 잠깐 보고 돌아와.'],
    safety: ['구매할 필요 없어.'],
    indoorFallback: { title: '창밖 간판 찾기', steps: ['창밖에서 보이는 글자나 간판 하나를 찾아봐.'] },
    completionMessage: '늘 지나던 길에 몰랐던 가게가 있었어.',
  },
  {
    id: 'out-bench',
    placeType: '가까운 공원 · 놀이터 · 쉼터',
    steps: ['가까운 안전한 곳에서 벤치나 앉을 곳을 찾아.', '2~5분 정도 앉아 있어. 아무것도 안 해도 돼.', '일어나서 돌아와.'],
    timerMinutes: 5,
    indoorFallback: { title: '창가에 앉기', steps: ['창가에 의자를 두고 앉아.', '5분 동안 바깥을 봐.'] },
    completionMessage: '밖에서 잠깐 앉아 쉬었어.',
  },
  {
    id: 'out-quiet-spot',
    placeType: '집 근처',
    steps: ['멀리 가지 않고 집 근처로 나가.', '상대적으로 조용하게 느껴지는 곳 하나를 찾아봐.', '거기서 잠깐 서 있다 돌아와.'],
    safety: ['사유지나 인적 드문 외진 곳에는 들어가지 않기.'],
    indoorFallback: { title: '집에서 가장 조용한 곳', steps: ['집에서 가장 조용한 자리를 찾아.', '잠깐 그 자리에 있어봐.'] },
    completionMessage: '동네에서 조용한 자리 하나를 알게 됐어.',
  },
  {
    id: 'out-drink-walk',
    placeType: '동네 보행로',
    steps: ['물이나 마실 것 하나를 챙겨. 집에 있는 물이면 충분해.', '천천히 걸어.', '멈춰 섰을 때만 한 모금씩 마셔.', '돌아와.'],
    safety: ['걸으면서 마시지 말고, 멈춘 자리에서만.'],
    indoorFallback: { title: '창가에서 한 잔', steps: ['마실 것 하나를 들고 창가로 가.', '천천히 마셔.'] },
    completionMessage: '한 잔을 들고 동네를 한 바퀴 했어.',
  },
  {
    id: 'out-season',
    placeType: '동네 · 집 앞',
    random: 'season',
    steps: ['밖으로 나가.', '지금 계절을 느낄 수 있는 것 하나를 찾아봐. 오늘의 힌트부터.', '찾았으면 잠깐 바라보고 돌아와.'],
    indoorFallback: { title: '창밖 계절', steps: ['창밖에서 지금 계절을 보여주는 것 하나를 찾아봐.'] },
    completionMessage: '오늘의 계절을 하나 찾았어.',
  },
  {
    id: 'out-block-loop',
    placeType: '집 주변 골목',
    steps: ['집 앞에서 출발해.', '목적지 없이 주변을 아주 짧게 한 바퀴 걸어.', '출발한 곳으로 돌아와.'],
    timerMinutes: 10,
    indoorFallback: { title: '집 안 한 바퀴', steps: ['집 안을 천천히 한 바퀴 걸어.'] },
    completionMessage: '익숙한 골목을 한 바퀴 돌고 왔어.',
  },
  {
    id: 'out-park-10',
    placeType: '가까운 공원',
    onlyIf: '근처에 공원이나 안전한 야외 공간이 있을 때',
    steps: ['가까운 공원으로 가.', '조금 걸어.', '잠깐 멈춰서 주변을 봐.', '돌아와.'],
    timerMinutes: 10,
    indoorFallback: window5,
    completionMessage: '공원에서 10분을 보냈어.',
  },
  {
    id: 'out-three-new',
    placeType: '동네',
    steps: ['밖으로 나가.', '오늘 처음 보는 것 세 개를 찾아봐. 사물이나 풍경으로.', '세 개를 찾았으면 돌아와.'],
    safety: ['사람을 관찰하거나 따라가지 않기.'],
    indoorFallback: { title: '집 안에서 처음 보는 것', steps: ['집 안에서 오늘 처음 눈에 들어온 것 세 개를 찾아봐.'] },
    completionMessage: '오늘 처음 보는 것 세 개를 만났어.',
  },
  {
    id: 'out-sign-letter',
    placeType: '상가 거리 · 동네',
    random: 'letter',
    steps: ['오늘의 글자를 기억하고 나가.', '걷다가 멈춘 자리에서 그 글자가 들어간 간판이나 문구를 찾아봐.', '찾았으면 돌아와.'],
    safety: ['길을 건너는 중에는 간판을 찾지 않기.'],
    indoorFallback: { title: '집 안 글자 찾기', steps: ['책 표지나 포장지에서 오늘의 글자를 찾아봐.'] },
    completionMessage: '동네 간판에서 글자 하나를 찾아냈어.',
  },
  {
    id: 'out-aimless-5',
    placeType: '익숙한 동네',
    steps: ['목적지를 정하지 않고 나가.', '익숙한 범위 안에서 5분만 걸어.', '5분이 되면 돌아와.'],
    timerMinutes: 5,
    indoorFallback: { title: '5분 천천히 걷기', steps: ['집 안을 5분 동안 천천히 걸어.'] },
    completionMessage: '5분, 목적 없이 걸었어.',
  },
  {
    id: 'out-look-up',
    placeType: '집 주변 · 자주 가는 길',
    steps: ['자주 가는 익숙한 장소로 나가.', '멈춰 서서, 평소에는 안 보던 위쪽을 한번 봐.', '이번엔 발밑을 한번 봐.', '돌아와.'],
    safety: ['걷는 중에는 위를 보지 않기. 멈춘 자리에서만.'],
    indoorFallback: { title: '천장 보기', steps: ['방 천장과 위쪽 모서리를 천천히 둘러봐.'] },
    completionMessage: '익숙한 장소의 위쪽을 처음 봤을지도 몰라.',
  },
  {
    id: 'out-small-errand',
    placeType: '집 앞 · 가까운 곳',
    onlyIf: '실제로 필요한 작은 일이 있을 때',
    steps: ['필요한 작은 일 하나를 골라. 우편함 확인, 재활용품 내놓기처럼.', '그 일을 하러 잠깐 나가.', '돌아오는 길에 하늘을 한 번 보고 와.'],
    safety: ['일부러 사지 않아도 돼. 필요한 일만.'],
    indoorFallback: { title: '집 안 작은 정리', steps: ['서랍 하나나 책상 한 구석을 정리해봐.'] },
    completionMessage: '작은 일 하나를 하고, 바깥도 잠깐 봤어.',
  },
  {
    id: 'out-tiny-trip',
    placeType: '동네',
    steps: ['여행 온 사람처럼 집을 나서.', '익숙한 장소 하나를 처음 와본 곳처럼 둘러봐.', '여행지에서처럼 마음에 드는 것 하나를 골라.', '돌아와.'],
    safety: ['대중교통을 탈 필요는 없어. 걸어서 갈 수 있는 곳이면 충분해.'],
    indoorFallback: { title: '우리 집 여행', steps: ['집을 처음 온 숙소라고 생각하고 둘러봐.', '마음에 드는 곳 하나를 골라.'] },
    completionMessage: '아주 가까운 곳으로 여행을 다녀왔어.',
  },
  {
    id: 'out-random-walk',
    placeType: '익숙한 동네',
    directions: true,
    steps: ['익숙한 동네로 나가.', '안전한 곳에 서서 다음 방향을 골라.', '그 방향으로 조금 걷고 돌아와.'],
    safety: ['방향은 제안일 뿐이야. 안전하지 않다고 느끼면 언제든 다른 선택.'],
    indoorFallback: { title: '집 안 랜덤 산책', steps: ['방에서 왼쪽이나 오른쪽 중 하나를 골라 그쪽 물건 하나를 봐.'] },
    completionMessage: '오늘은 OFFROU가 건넨 방향으로 조금 걸었어.',
  },
];

export const getOutProgram = (id: string | undefined) => OUT_PROGRAMS.find((p) => p.id === id);

/** 랜덤 산책 방향 (사용자가 안전을 판단한다) */
export const DIRECTIONS = ['왼쪽', '오른쪽', '직진하지 않고 주변 보기'] as const;
