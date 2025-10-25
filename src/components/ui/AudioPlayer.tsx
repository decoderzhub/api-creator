import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface AudioPlayerProps {
  src: string;
  title?: string;
  description?: string;
  duration?: number;
  className?: string;
}

export function AudioPlayer({ src, title, description, duration, className = '' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = newVolume;
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const audioDuration = duration || audioRef.current?.duration || 0;

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {(title || description) && (
        <div className="mb-3">
          {title && (
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h4>
          )}
          {description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
              {description}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <input
            type="range"
            min="0"
            max={audioDuration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            style={{
              background: `linear-gradient(to right, #2563eb 0%, #2563eb ${(currentTime / audioDuration) * 100}%, rgb(229, 231, 235) ${(currentTime / audioDuration) * 100}%, rgb(229, 231, 235) 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(audioDuration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={toggleMute}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      </div>
    </div>
  );
}
