export interface StorySlide {
  id: string
  mediaId: string
  type: 'image' | 'video'
  caption: string
  durationSeconds: number
  linkLabel: string
  linkUrl: string
  enabled: boolean
}

export interface StoryGroup {
  id: string
  title: string
  coverMediaId: string
  enabled: boolean
  slides: StorySlide[]
}

export function visibleStories(stories: readonly StoryGroup[]): StoryGroup[] {
  return stories
    .filter((story) => story.enabled)
    .map((story) => ({
      ...story,
      slides: story.slides.filter((slide) => slide.enabled),
    }))
    .filter((story) => story.slides.length > 0)
}
