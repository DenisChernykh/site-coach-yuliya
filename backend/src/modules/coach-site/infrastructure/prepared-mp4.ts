import { createFile, MP4BoxBuffer, type Movie } from 'mp4box'
import { InvalidStoryMediaError } from '../application/site-errors'

export function inspectPreparedMp4(data: Uint8Array): {
  width: number
  height: number
} {
  try {
    const file = createFile(false)
    let info: Movie | undefined
    let invalid = false
    file.onReady = (value) => {
      info = value
    }
    file.onError = () => {
      invalid = true
    }
    file.appendBuffer(
      MP4BoxBuffer.fromArrayBuffer(Uint8Array.from(data).buffer, 0),
    )
    file.flush()
    if (
      invalid ||
      !info ||
      info.isFragmented ||
      !info.isProgressive ||
      info.videoTracks.length !== 1 ||
      info.audioTracks.length > 1 ||
      info.tracks.length !== info.videoTracks.length + info.audioTracks.length
    )
      throw new Error('Unsupported MP4')
    const video = info.videoTracks[0]!
    const duration = info.duration / info.timescale
    const width = video.video!.width
    const height = video.video!.height
    if (
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 60 ||
      !video.codec.startsWith('avc1.') ||
      Math.max(width, height) > 1920 ||
      Math.min(width, height) > 1080 ||
      Math.min(width, height) <= 0 ||
      video.nb_samples / duration > 60.5 ||
      info.audioTracks.some((t) => t.codec !== 'mp4a.40.2')
    )
      throw new Error('Unsupported video profile')
    for (const track of info.tracks) {
      const samples = file.getTrackSamplesInfo(track.id)
      if (
        !samples.length ||
        samples.some(
          (s) =>
            s.size <= 0 || s.offset < 0 || s.offset + s.size > data.byteLength,
        )
      )
        throw new Error('Incomplete MP4')
    }
    return { width, height }
  } catch {
    throw new InvalidStoryMediaError()
  }
}
