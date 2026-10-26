import { MediaLibrary } from './media-library'
import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from 'lucide-react'
import {
  isProblemCode,
  type StoryGroupDto,
  type StorySlideDto,
} from '@/shared/api'
import { Button, TextField, TextareaField } from '@/shared/ui'
import { contentError } from '../model/errors'
import {
  reorderStoryItem,
  storyImageTypes,
  storyMediaTypes,
  uploadStoryFile,
  StoryUploadError,
} from '../model/story-upload'

const mediaUrl = (id: string) => `/v1/story-media/${encodeURIComponent(id)}`

export function StoriesEditor({
  value,
  disabled,
  onChange,
  onUploadingChange,
}: {
  value: StoryGroupDto[]
  disabled: boolean
  onChange: (stories: StoryGroupDto[]) => void
  onUploadingChange: (busy: boolean) => void
}) {
  const [selected, setSelected] = useState(value[0]?.id ?? '')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const coverInput = useRef<HTMLInputElement>(null)
  const slideInput = useRef<HTMLInputElement>(null)
  const group = value.find((item) => item.id === selected) ?? value[0]
  function changeGroup(next: StoryGroupDto) {
    onChange(value.map((item) => (item.id === next.id ? next : item)))
  }
  function changeSlide(next: StorySlideDto) {
    if (group)
      changeGroup({
        ...group,
        slides: group.slides.map((item) => (item.id === next.id ? next : item)),
      })
  }
  async function upload(files: FileList | null, cover: boolean) {
    if (!group || !files?.length) return
    if (!cover && group.slides.length + files.length > 30) {
      setError('В подборке может быть до 30 слайдов.')
      return
    }
    setError('')
    setUploading(true)
    onUploadingChange(true)
    onChange(value)
    let next = group
    try {
      for (const file of Array.from(files)) {
        setProgress(0)
        const media = await uploadStoryFile(
          file,
          setProgress,
          'story',
          `${window.location.pathname}:story:${group.id}:${cover ? 'cover' : 'slides'}`,
        )
        if (cover) next = { ...next, coverMediaId: media.id }
        else {
          next = {
            ...next,
            coverMediaId:
              next.coverMediaId || (media.type === 'image' ? media.id : ''),
            slides: [
              ...next.slides,
              {
                id: crypto.randomUUID(),
                mediaId: media.id,
                type: media.type,
                caption: '',
                durationSeconds: 5,
                linkLabel: '',
                linkUrl: '',
                enabled: true,
              },
            ],
          }
        }
        changeGroup(next)
      }
    } catch (failure) {
      setError(
        failure instanceof StoryUploadError
          ? failure.message
          : isProblemCode(failure, 'VALIDATION_FAILED')
            ? 'Не удалось принять файл. Проверьте формат и размер: фото до 8 МБ, видео до 30 МБ.'
            : contentError(failure),
      )
    } finally {
      setUploading(false)
      onUploadingChange(false)
      if (coverInput.current) coverInput.current.value = ''
      if (slideInput.current) slideInput.current.value = ''
    }
  }
  return (
    <fieldset disabled={disabled || uploading} className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Сторис</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Подборки на главной. Фото — до 8 МБ, MP4 H.264/AAC — до 30 МБ и 60
            секунд, Full HD, до 60 кадров/с, с быстрым стартом.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={value.length >= 20}
          onClick={() => {
            const id = crypto.randomUUID()
            onChange([
              ...value,
              {
                id,
                title: 'Новая подборка',
                coverMediaId: '',
                enabled: true,
                slides: [],
              },
            ])
            setSelected(id)
            setError('')
          }}
        >
          <Plus aria-hidden="true" />
          Добавить подборку
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {uploading && (
        <p role="status" className="text-sm">
          {progress < 100
            ? `Загрузка файла: ${progress}%`
            : 'Файл сохранён. Ожидаем обработки — страницу можно закрыть.'}
        </p>
      )}
      {!value.length ? (
        <p className="py-8 text-sm text-muted-foreground">
          Добавьте первую подборку, загрузите обложку и слайды.
        </p>
      ) : (
        <div className="grid min-w-0 gap-8 lg:grid-cols-[230px_minmax(0,1fr)]">
          <div className="space-y-2" aria-label="Порядок подборок">
            {value.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-1 border-b pb-2"
              >
                <Button
                  variant={group?.id === item.id ? 'secondary' : 'ghost'}
                  className="h-auto min-h-14 min-w-0 flex-1 justify-start text-left whitespace-normal"
                  onClick={() => {
                    setSelected(item.id)
                    setError('')
                  }}
                >
                  {item.coverMediaId && (
                    <img
                      src={mediaUrl(item.coverMediaId)}
                      alt=""
                      className="size-9 shrink-0 rounded-full object-cover"
                    />
                  )}
                  <span className="min-w-0 break-words">
                    {item.title}
                    <span className="block text-xs font-normal text-muted-foreground">
                      Слайдов: {item.slides.length}
                      {!item.enabled && ' · скрыта'}
                    </span>
                  </span>
                </Button>
                <div className="grid">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Поднять подборку «${item.title}»`}
                    disabled={index === 0}
                    onClick={() => onChange(reorderStoryItem(value, index, -1))}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Опустить подборку «${item.title}»`}
                    disabled={index === value.length - 1}
                    onClick={() => onChange(reorderStoryItem(value, index, 1))}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {group && (
            <div className="min-w-0 space-y-7">
              <div className="flex flex-wrap items-start gap-5">
                <div className="space-y-2">
                  {group.coverMediaId ? (
                    <img
                      src={mediaUrl(group.coverMediaId)}
                      alt={`Обложка: ${group.title}`}
                      className="size-24 rounded-full border object-cover"
                    />
                  ) : (
                    <div className="flex size-24 items-center justify-center rounded-full border bg-muted">
                      <ImagePlus aria-hidden="true" />
                    </div>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => coverInput.current?.click()}
                  >
                    {group.coverMediaId
                      ? 'Заменить обложку'
                      : 'Загрузить обложку'}
                  </Button>
                  <input
                    ref={coverInput}
                    className="sr-only"
                    tabIndex={-1}
                    type="file"
                    accept={storyImageTypes.join(',')}
                    aria-label="Файл обложки"
                    onChange={(event) => void upload(event.target.files, true)}
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-4">
                  <TextField
                    label="Название подборки"
                    maxLength={80}
                    value={group.title}
                    onChange={(event) =>
                      changeGroup({ ...group, title: event.target.value })
                    }
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={group.enabled}
                      onChange={(event) =>
                        changeGroup({ ...group, enabled: event.target.checked })
                      }
                    />
                    Показывать подборку
                  </label>
                  {!group.coverMediaId && (
                    <p className="text-sm text-muted-foreground">
                      Добавьте обложку перед сохранением. Первое загруженное
                      фото станет обложкой автоматически.
                    </p>
                  )}
                </div>
              </div>
              <MediaLibrary
                purpose="story"
                disabled={disabled || uploading}
                onSelect={(media) => {
                  if (group.slides.length >= 30) return
                  const type = media.mimeType.startsWith('image/')
                    ? ('image' as const)
                    : ('video' as const)
                  changeGroup({
                    ...group,
                    coverMediaId:
                      group.coverMediaId || (type === 'image' ? media.id : ''),
                    slides: [
                      ...group.slides,
                      {
                        id: crypto.randomUUID(),
                        mediaId: media.id,
                        type,
                        caption: '',
                        durationSeconds: 5,
                        linkLabel: '',
                        linkUrl: '',
                        enabled: true,
                      },
                    ],
                  })
                }}
              />
              <div className="space-y-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">
                    Слайды · {group.slides.length}/30
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={group.slides.length >= 30}
                    onClick={() => slideInput.current?.click()}
                  >
                    <Plus aria-hidden="true" />
                    Фото или видео
                  </Button>
                  <input
                    ref={slideInput}
                    type="file"
                    className="sr-only"
                    tabIndex={-1}
                    multiple
                    accept={storyMediaTypes.join(',')}
                    aria-label="Файлы слайдов"
                    onChange={(event) => void upload(event.target.files, false)}
                  />
                </div>
                {!group.slides.length && (
                  <p className="text-sm text-muted-foreground">
                    Загрузите фото или видео. Можно выбрать несколько файлов.
                  </p>
                )}
                {group.slides.map((slide, index) => (
                  <section
                    key={slide.id}
                    aria-label={`Слайд ${index + 1}`}
                    className="space-y-4 border-t pt-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-medium">
                        {index + 1}. {slide.type === 'image' ? 'Фото' : 'Видео'}
                        {!slide.enabled && ' · скрыт'}
                      </h4>
                      <div className="flex gap-1">
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Поднять слайд ${index + 1}`}
                          disabled={index === 0}
                          onClick={() =>
                            changeGroup({
                              ...group,
                              slides: reorderStoryItem(group.slides, index, -1),
                            })
                          }
                        >
                          <ArrowUp aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Опустить слайд ${index + 1}`}
                          disabled={index === group.slides.length - 1}
                          onClick={() =>
                            changeGroup({
                              ...group,
                              slides: reorderStoryItem(group.slides, index, 1),
                            })
                          }
                        >
                          <ArrowDown aria-hidden="true" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`Удалить слайд ${index + 1}`}
                          onClick={() => {
                            if (window.confirm('Удалить слайд из подборки?'))
                              changeGroup({
                                ...group,
                                slides: group.slides.filter(
                                  (item) => item.id !== slide.id,
                                ),
                              })
                          }}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-[130px_minmax(0,1fr)]">
                      {slide.type === 'image' ? (
                        <img
                          src={mediaUrl(slide.mediaId)}
                          alt={slide.caption || `Слайд ${index + 1}`}
                          loading="lazy"
                          className="aspect-[9/16] w-32 rounded bg-muted object-contain"
                        />
                      ) : (
                        <video
                          src={mediaUrl(slide.mediaId)}
                          controls
                          playsInline
                          preload="metadata"
                          className="aspect-[9/16] w-32 rounded bg-black"
                        />
                      )}
                      <div className="min-w-0 space-y-3">
                        <TextareaField
                          label={`Подпись слайда ${index + 1}`}
                          maxLength={1000}
                          value={slide.caption}
                          onChange={(event) =>
                            changeSlide({
                              ...slide,
                              caption: event.target.value,
                            })
                          }
                        />
                        {slide.type === 'image' && (
                          <TextField
                            label={`Длительность слайда ${index + 1}, сек.`}
                            type="number"
                            min={2}
                            max={30}
                            value={slide.durationSeconds}
                            onChange={(event) =>
                              changeSlide({
                                ...slide,
                                durationSeconds: Number(event.target.value),
                              })
                            }
                          />
                        )}
                        {slide.type === 'video' && (
                          <p className="text-xs text-muted-foreground">
                            Видео проигрывается до конца. Звук посетитель
                            включает сам.
                          </p>
                        )}
                        <TextField
                          label={`Текст кнопки слайда ${index + 1}`}
                          maxLength={80}
                          value={slide.linkLabel}
                          onChange={(event) =>
                            changeSlide({
                              ...slide,
                              linkLabel: event.target.value,
                            })
                          }
                        />
                        <TextField
                          label={`Ссылка слайда ${index + 1}`}
                          placeholder="https://… или /coaching/"
                          maxLength={2000}
                          value={slide.linkUrl}
                          onChange={(event) =>
                            changeSlide({
                              ...slide,
                              linkUrl: event.target.value,
                            })
                          }
                        />
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            role="switch"
                            checked={slide.enabled}
                            onChange={(event) =>
                              changeSlide({
                                ...slide,
                                enabled: event.target.checked,
                              })
                            }
                          />
                          Показывать слайд {index + 1}
                        </label>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  if (
                    window.confirm(
                      `Удалить подборку «${group.title}» со всеми слайдами?`,
                    )
                  )
                    onChange(value.filter((item) => item.id !== group.id))
                }}
              >
                <Trash2 aria-hidden="true" />
                Удалить подборку
              </Button>
            </div>
          )}
        </div>
      )}
    </fieldset>
  )
}
