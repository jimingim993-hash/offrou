import { addRecord, getRecords } from '@/services/records';
import { getExperience } from '@/services/experiences';

describe('MY OFFROU 기록 저장소', () => {
  it('완료한 경험을 저장하고 최신순으로 돌려준다', () => {
    const a = getExperience('rest-window')!;
    const b = getExperience('exp-radio-dj')!;
    addRecord(a, { now: new Date('2026-10-02T10:00:00') });
    addRecord(b, { moodId: 'new', durationId: '30m', now: new Date('2026-10-03T22:00:00') });

    const records = getRecords();
    expect(records.map((r) => r.experienceId)).toEqual(['exp-radio-dj', 'rest-window']);
    expect(records[0]).toMatchObject({
      title: '심야 라디오 DJ',
      categoryId: 'experience',
      minutes: 15,
      moodId: 'new',
      durationId: '30m',
    });
  });

  it('localStorage에 남아 다시 읽어도 유지된다', () => {
    addRecord(getExperience('out-sky')!);
    const raw = JSON.parse(localStorage.getItem('offrou.records.v1')!);
    expect(raw).toHaveLength(1);
    expect(getRecords()[0].experienceId).toBe('out-sky');
  });

  it('저장값이 깨져 있어도 오류 없이 빈 목록', () => {
    localStorage.setItem('offrou.records.v1', '{not json');
    expect(getRecords()).toEqual([]);
    localStorage.setItem('offrou.records.v1', JSON.stringify([{ foo: 1 }]));
    expect(getRecords()).toEqual([]);
  });
});
