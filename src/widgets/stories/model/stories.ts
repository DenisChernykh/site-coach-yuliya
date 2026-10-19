import type { StoryGroupDto } from '@/shared/api';

export function storyEntries(stories: readonly StoryGroupDto[]) {
  return stories
    .filter((group) => group.enabled)
    .flatMap((group) => {
      const slides = group.slides.filter((slide) => slide.enabled);
      return slides.map((slide, position) => ({
        group,
        slide,
        position,
        slides,
      }));
    });
}
