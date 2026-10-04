import type { ComponentType } from 'react';
import type { Experience, InteractionType } from '@/types/offrou';
import { GuideRunner } from './GuideRunner';
import { RestRunner } from './RestRunner';
import { PromptRunner } from './PromptRunner';
import { FocusRunner } from './FocusRunner';
import { StoryRunner } from '../story/StoryRunner';
import { PlayRunner } from '@/features/play/PlayRunner';
import type { RunnerProps } from './types';

/** 실행 방식별 실행기. 새 방식을 추가하면 여기에 등록한다. */
const RUNNERS: Record<InteractionType, ComponentType<RunnerProps>> = {
  guide: GuideRunner,
  rest: RestRunner,
  prompts: PromptRunner,
  focus: FocusRunner,
  story: StoryRunner,
  play: PlayRunner,
};

export function getRunner(experience: Experience): ComponentType<RunnerProps> {
  const interaction = experience.interaction;
  // 데이터가 비어 있으면 안전하게 기본 실행기로
  if (interaction?.type === 'prompts' && interaction.prompts.length === 0) return GuideRunner;
  return RUNNERS[interaction?.type ?? 'guide'] ?? GuideRunner;
}

export type { RunnerProps, RunResult } from './types';
