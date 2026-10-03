import type { InteractiveStory } from '@/types/story';

/** 실제 음악은 제공하지 않고, 음악의 분위기만 고른다. */
export const RADIO_STORY: InteractiveStory = {
  experienceId: 'exp-radio-dj',
  title: '심야 라디오 DJ',
  subtitle: '새벽 1시, 잠 못 드는 사람들의 방송',
  introduction: '사연을 읽고, 음악의 분위기를 고르고, 짧은 멘트를 건네면 돼.',
  estimatedMinutes: 15,
  start: 'onair',
  completionMessage: '오늘 밤 누군가에게 네 목소리가 닿았어.',
  scenes: [
    {
      id: 'onair',
      title: '방송 시작',
      description: '새벽 1시. 빨간 ON AIR 불이 켜지고, 헤드폰 너머로 도시가 조용해.',
      lines: [{ text: '오늘 밤 너는 이 방송의 DJ야. 첫 인사를 건네볼까?' }],
      choices: [
        { label: '"오늘 하루도 수고했어요."', next: 'letter1', flag: 'open-warm' },
        { label: '"잠 못 드는 분들, 같이 깨어 있어요."', next: 'letter1', flag: 'open-awake' },
      ],
    },
    {
      id: 'letter1',
      title: '첫 번째 사연',
      description: '첫 사연이 도착했어.',
      lines: [
        { text: '"야근 끝나고 이제 버스를 탔어요. 창밖이 너무 깜깜해서, 노래 한 곡만 부탁해요."' },
        { text: '어떤 분위기의 음악을 틀어줄까?' },
      ],
      choices: [
        { label: '잔잔한 피아노 연주', next: 'letter2', flag: 'calm' },
        { label: '옛날 감성의 밝은 노래', next: 'letter2', flag: 'bright' },
        { label: '빗소리가 섞인 느린 음악', next: 'letter2', flag: 'rain' },
      ],
    },
    {
      id: 'letter2',
      title: '두 번째 사연',
      description: '음악이 흐르는 동안 문자창이 깜빡여.',
      lines: [
        { if: 'calm', text: '"피아노 덕분에 버스 안이 조금 따뜻해졌어요." 첫 사연의 주인공이야.' },
        { if: 'bright', text: '"이 노래 오랜만이에요! 버스에서 혼자 웃었어요." 첫 사연의 주인공이야.' },
        { if: 'rain', text: '"빗소리 들으니까 졸려요. 좋은 쪽으로요." 첫 사연의 주인공이야.' },
        { text: '그리고 새 사연. "내일 중요한 발표가 있는데 잠이 안 와요."' },
      ],
      choices: [
        { label: '"잘하려는 마음이면 이미 충분해요."', next: 'closing', flag: 'ment-enough' },
        { label: '"같이 숨 한 번 크게 쉬어볼까요?"', next: 'closing', flag: 'ment-breath' },
        { label: '"오늘 밤 걱정은 저한테 맡겨요."', next: 'closing', flag: 'ment-keep' },
      ],
    },
    {
      id: 'closing',
      title: '마지막 곡',
      description: '어느새 마지막 곡이 끝나가. 클로징 멘트를 할 시간이야.',
      lines: [
        { if: 'ment-enough', text: '"고마워요. 이제 잘 수 있을 것 같아요." 문자 한 줄이 도착했어.' },
        { if: 'ment-breath', text: '부스 안에서 너도 같이 숨을 쉬었어. 넷에 들이쉬고, 여섯에 내쉬고.' },
        { if: 'ment-keep', text: '"맡길게요. 잘 자요, DJ님." 짧은 답장이 왔어.' },
      ],
      choices: [
        { label: '"내일 밤에 또 만나요."', next: 'off', flag: 'see-you' },
        { label: '"좋은 꿈 꿔요."', next: 'off', flag: 'sweet-dreams' },
      ],
    },
    {
      id: 'off',
      title: 'ON AIR 끄기',
      description: '빨간 불이 꺼지고, 스튜디오가 조용해져.',
      lines: [
        { if: 'see-you', text: '내일 밤에도 누군가는 이 주파수를 찾아올 거야.' },
        { if: 'sweet-dreams', text: '도시 곳곳에서 라디오가 하나둘 꺼지고, 불도 하나둘 꺼져.' },
      ],
      isEnding: true,
    },
  ],
  endings: [
    { id: 'calm', when: ['calm'], title: '조용한 밤의 방송', message: '오늘 밤 누군가에게 네 목소리가 닿았어.' },
    { id: 'bright', when: ['bright'], title: '작은 파티 같은 새벽', message: '새벽 1시에 누군가를 웃게 했어.' },
    { id: 'rain', when: ['rain'], title: '빗소리가 흐른 밤', message: '오늘 밤 누군가 네 방송을 들으며 잠들었을 거야.' },
    { id: 'default', title: '심야 라디오', message: '오늘 밤 누군가에게 네 목소리가 닿았어.' },
  ],
};
