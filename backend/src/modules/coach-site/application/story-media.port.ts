export interface StoryMedia {
  id: string
  mimeType: string
  size: number
  path?: string | null
  variants?: unknown
}

export interface StoryMediaPort {
  create(input: {
    name: string
    mimeType: string
    data: Uint8Array
  }): Promise<StoryMedia>
  find(id: string): Promise<StoryMedia | undefined>
  read(id: string, start: number, length: number): Promise<Uint8Array>
}
