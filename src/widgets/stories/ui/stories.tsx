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
import { storyEntries } from '../model/stories';
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
        <Dialog.Popup className={styles.popup} aria-describedby={undefined}>
          {current && open && (
            <StoryPlayer
              key={current.group.id + ':' + current.slide.id}
              entry={current}
              mediaBaseUrl={mediaBaseUrl}
              onNext={next}
              onPrevious={() => setIndex(Math.max(0, index - 1))}
              hasPrevious={index > 0}
            />
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
}: {
  entry: ReturnType<typeof storyEntries>[number];
  mediaBaseUrl?: string;
  onNext: () => void;
  onPrevious: () => void;
  hasPrevious: boolean;
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
  const touch = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className={styles.player}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          onNext();
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          onPrevious();
        }
        if (event.key === ' ' && event.target === event.currentTarget) {
          event.preventDefault();
          setPaused(!paused);
        }
      }}
    >
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
          touch.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
          setHolding(true);
        }}
        onPointerUp={(event) => {
          setHolding(false);
          const start = touch.current;
          touch.current = null;
          if (
            start &&
            Math.abs(event.clientX - start.x) > 50 &&
            Math.abs(event.clientX - start.x) >
              Math.abs(event.clientY - start.y)
          ) {
            if (event.clientX < start.x) onNext();
            else onPrevious();
          }
        }}
        onPointerCancel={() => {
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
      </div>
      <div className={styles.caption}>
        {slide.caption && <p>{slide.caption}</p>}
        {slide.linkUrl && slide.linkLabel && (
          <a href={slide.linkUrl} onFocus={() => setPaused(true)}>
            {slide.linkLabel} <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
      <nav className={styles.navigation} aria-label="Переключение сторис">
        <button
          type="button"
          aria-label="Предыдущий слайд"
          disabled={!hasPrevious}
          onClick={onPrevious}
        >
          <ChevronLeft size={22} />
        </button>
        <span>
          {position + 1} / {slides.length}
        </span>
        <button type="button" aria-label="Следующий слайд" onClick={onNext}>
          <ChevronRight size={22} />
        </button>
      </nav>
    </div>
  );
}
