/** 경험 화면 경로. 추천에서 넘어온 경우 search(?mood=…&time=…)를 그대로 이어 붙여 기록에 남긴다. */
export const experiencePath = (id: string) => `/experience/${id}`;
export const playPath = (id: string, search = '') => `/experience/${id}/play${search}`;
export const donePath = (id: string) => `/experience/${id}/done`;
