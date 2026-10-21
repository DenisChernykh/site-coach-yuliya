import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { StoryGroupDto } from '@/shared/api';
import { storyMediaUrl } from '@/shared/lib/story-media';
import { withBase } from '@/shared/routes';
import { storyEntries } from '../model/stories';
import { storyGesture } from '../model/navigation';
import styles from './stories.module.css';

export function Stories({
  stories,
  mediaBaseUrl,
  preview = false,
}: {
  stories: StoryGroupDto[];
  mediaBaseUrl?: string;
  preview?: boolean;
}) {
  const entries = storyEntries(stories);
  const groups = stories.filter((group) =>
    entries.some((entry) => entry.group.id === group.id),
  );
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const current = entries[index];
  const groupIndex = groups.findIndex(
    (group) => group.id === current?.group.id,
  );
  const previousGroup = groups[groupIndex - 1];
  const nextGroup = groups[groupIndex + 1];
  if (!groups.length)
    return preview ? (
      <p className={styles.empty}>
        Добавьте обложку и слайды, чтобы увидеть сторис.
      </p>
    ) : null;
  const next = () => {
    if (index + 1 < entries.length) setIndex(index + 1);
    else setOpen(false);
  };
  const openGroup = (group: StoryGroupDto | undefined) => {
    if (group)
      setIndex(entries.findIndex((entry) => entry.group.id === group.id));
  };
  return (
    <Dialog.Root open={open && Boolean(current)} onOpenChange={setOpen}>
      <div className={styles.rail} aria-label="Подборки сторис">
        {groups.map((group) => (
          <Dialog.Trigger
            key={group.id}
            className={styles.trigger}
            onClick={() =>
              setIndex(
                entries.findIndex((entry) => entry.group.id === group.id),
              )
            }
          >
            <span className={styles.cover}>
              <img
                src={storyMediaUrl(group.coverMediaId, mediaBaseUrl)}
                alt=""
                loading="lazy"
                width={160}
                height={160}
              />
            </span>
            <span className={styles.label}>{group.title}</span>
            <span className="sr-only"> — открыть сторис</span>
          </Dialog.Trigger>
        ))}
      </div>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup
          className={styles.popup}
          aria-describedby={undefined}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') {
              event.preventDefault();
              next();
            } else if (event.key === 'ArrowLeft') {
              event.preventDefault();
              setIndex(Math.max(0, index - 1));
            } else if (event.key === 'PageDown') {
              event.preventDefault();
              openGroup(nextGroup);
            } else if (event.key === 'PageUp') {
              event.preventDefault();
              openGroup(previousGroup);
            }
          }}
        >
          {current && open && (
            <>
              <StoryPlayer
                key={current.group.id + ':' + current.slide.id}
                entry={current}
                mediaBaseUrl={mediaBaseUrl}
                onNext={next}
                onPrevious={() => setIndex(Math.max(0, index - 1))}
                hasPrevious={index > 0}
                onPreviousGroup={() => openGroup(previousGroup)}
                onNextGroup={() => openGroup(nextGroup)}
              />
              <nav
                className={styles.groupNavigation}
                aria-label="Подборки сторис"
              >
                {previousGroup && (
                  <button
                    type="button"
                    className={styles.previousGroup}
                    aria-label={`Предыдущая подборка: ${previousGroup.title}`}
                    aria-keyshortcuts="PageUp"
                    onClick={() => openGroup(previousGroup)}
                  >
                    <ChevronLeft size={24} />
                  </button>
                )}
                {nextGroup && (
                  <button
                    type="button"
                    className={styles.nextGroup}
                    aria-label={`Следующая подборка: ${nextGroup.title}`}
                    aria-keyshortcuts="PageDown"
                    onClick={() => openGroup(nextGroup)}
                  >
                    <ChevronRight size={24} />
                  </button>
                )}
              </nav>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function StoryPlayer({
  entry,
  mediaBaseUrl,
  onNext,
  onPrevious,
  hasPrevious,
  onPreviousGroup,
  onNextGroup,
}: {
  entry: ReturnType<typeof storyEntries>[number];
  mediaBaseUrl?: string;
  onNext: () => void;
  onPrevious: () => void;
  hasPrevious: boolean;
  onPreviousGroup: () => void;
  onNextGroup: () => void;
}) {
  const { group, slide, slides, position } = entry;
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState(0);
  const elapsed = useRef(0);
  const advance = useRef(onNext);
  useEffect(() => {
    advance.current = onNext;
  }, [onNext]);
  const stopped = paused || holding || hidden || !ready || error;
  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, []);
  useEffect(() => {
    if (slide.type !== 'video') return;
    if (stopped) video.current?.pause();
    else void video.current?.play().catch(() => setPaused(true));
  }, [slide.type, stopped]);
  useEffect(() => {
    if (stopped || slide.type !== 'image') return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      elapsed.current += now - previous;
      previous = now;
      const value = Math.min(
        1,
        elapsed.current / (slide.durationSeconds * 1000),
      );
      setProgress(value);
      if (value >= 1) {
        window.clearInterval(timer);
        advance.current();
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [stopped, slide.type, slide.durationSeconds]);
  const touch = useRef<{
    x: number;
    y: number;
    time: number;
    pointerId: number;
  } | null>(null);
  return (
    <div className={styles.player}>
      <div
        className={styles.progress}
        aria-label={`Слайд ${position + 1} из ${slides.length}`}
      >
        {slides.map((item, i) => (
          <span key={item.id}>
            <i
              style={{
                transform: `scaleX(${i < position ? 1 : i === position ? progress : 0})`,
              }}
            />
          </span>
        ))}
      </div>
      <header className={styles.header}>
        <img
          className={styles.avatar}
          src={storyMediaUrl(group.coverMediaId, mediaBaseUrl)}
          alt=""
          width={32}
          height={32}
        />
        <Dialog.Title className={styles.title}>{group.title}</Dialog.Title>
        {slide.type === 'video' && (
          <button
            type="button"
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
            onClick={() => setMuted(!muted)}
          >
            {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>
        )}
        <button
          type="button"
          aria-label={paused ? 'Продолжить сторис' : 'Приостановить сторис'}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play size={19} /> : <Pause size={19} />}
        </button>
        <Dialog.Close aria-label="Закрыть сторис">
          <X size={22} />
        </Dialog.Close>
      </header>
      <div
        className={styles.media}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          touch.current = {
            x: event.clientX,
            y: event.clientY,
            time: performance.now(),
            pointerId: event.pointerId,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          setHolding(true);
        }}
        onPointerUp={(event) => {
          const start = touch.current;
          if (!start || start.pointerId !== event.pointerId) return;
          setHolding(false);
          touch.current = null;
          const gesture = storyGesture(
            start,
            { x: event.clientX, y: event.clientY, time: performance.now() },
            event.currentTarget.getBoundingClientRect(),
          );
          if (gesture?.target === 'group') {
            if (gesture.direction === 'next') onNextGroup();
            else onPreviousGroup();
          } else if (gesture?.target === 'slide') {
            if (gesture.direction === 'next') onNext();
            else onPrevious();
          }
        }}
        onLostPointerCapture={() => {
          setHolding(false);
          touch.current = null;
        }}
      >
        {slide.type === 'image' ? (
          <img
            src={storyMediaUrl(slide.mediaId, mediaBaseUrl)}
            alt={slide.caption || group.title}
            onLoad={() => setReady(true)}
            onError={() => setError(true)}
            draggable={false}
          />
        ) : (
          <video
            ref={video}
            src={storyMediaUrl(slide.mediaId, mediaBaseUrl)}
            muted={muted}
            playsInline
            preload="auto"
            onCanPlay={() => setReady(true)}
            onWaiting={() => setReady(false)}
            onError={() => setError(true)}
            onEnded={onNext}
            onTimeUpdate={() => {
              const element = video.current;
              if (element?.duration)
                setProgress(element.currentTime / element.duration);
            }}
          />
        )}
        {!ready && !error && (
          <p className={styles.status} role="status">
            Загружаем…
          </p>
        )}
        {error && (
          <p className={styles.status} role="alert">
            Не удалось открыть файл. Перейдите к следующему слайду.
          </p>
        )}
        <button
          type="button"
          className={styles.previousSlide}
          aria-label="Предыдущий слайд"
          aria-disabled={!hasPrevious}
          onClick={(event) => {
            if (event.detail === 0) onPrevious();
          }}
        />
        <button
          type="button"
          className={styles.nextSlide}
          aria-label="Следующий слайд"
          onClick={(event) => {
            if (event.detail === 0) onNext();
          }}
        />
      </div>
      <div className={styles.caption}>
        {slide.caption && <p>{slide.caption}</p>}
        {slide.linkUrl && slide.linkLabel && (
          <a href={withBase(slide.linkUrl)} onFocus={() => setPaused(true)}>
            {slide.linkLabel} <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
    </div>
  );
}
