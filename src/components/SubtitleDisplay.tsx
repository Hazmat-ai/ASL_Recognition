import React, { useState, useRef, useEffect } from 'react';
import type { SentenceWord, SignPrediction } from '../types/sign';

interface SubtitleDisplayProps {
  words: SentenceWord[];
  currentPrediction: SignPrediction;
  holdProgress: number;
  showConfidence: boolean;
  onManualEdit: (text: string) => void;
}

export const SubtitleDisplay: React.FC<SubtitleDisplayProps> = ({
  words,
  currentPrediction,
  holdProgress,
  showConfidence,
  onManualEdit,
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const displayText = words.map((w) => w.display).join(' ');

  const handleEditStart = () => {
    setEditValue(displayText);
    setEditing(true);
  };

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  const handleEditDone = () => {
    onManualEdit(editValue);
    setEditing(false);
  };

  const isEmpty = words.length === 0;
  const hasPrediction = currentPrediction.sign !== 'NONE';

  return (
    <div className="subtitle-panel flex flex-col gap-3">
      {/* Current detection */}
      <div className="flex items-center justify-between min-h-[32px]">
        <div className="flex items-center gap-3">
          {hasPrediction ? (
            <>
              <div className="detection-badge flex items-center gap-2">
                <span className="text-violet-300 font-semibold tracking-wide text-sm">
                  {currentPrediction.displayLabel.toUpperCase()}
                </span>
                {showConfidence && (
                  <span className="text-xs text-gray-400">
                    {Math.round(currentPrediction.confidence * 100)}%
                  </span>
                )}
              </div>
              {/* Hold progress bar */}
              {holdProgress > 0 && holdProgress < 1 && (
                <div className="flex items-center gap-1.5">
                  <div className="hold-progress-track w-20 h-1.5 rounded-full bg-white/10">
                    <div
                      className="hold-progress-fill h-full rounded-full bg-violet-500 transition-all duration-100"
                      style={{ width: `${holdProgress * 100}%` }}
                    />
                  </div>
                </div>
              )}
              {holdProgress >= 1 && (
                <span className="text-xs text-emerald-400 font-medium">✓ Accepted</span>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-600 italic">
              {words.length === 0 ? 'Show your hands to the camera to begin…' : 'Waiting for gesture…'}
            </span>
          )}
        </div>
      </div>

      {/* Subtitle box */}
      <div
        className="subtitle-box relative rounded-xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden min-h-[80px]"
        role="region"
        aria-label="Translated sentence"
        aria-live="polite"
      >
        {editing ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditDone}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleEditDone();
              }
              if (e.key === 'Escape') {
                setEditing(false);
              }
            }}
            className="w-full h-full min-h-[80px] bg-transparent text-white text-2xl md:text-3xl font-semibold leading-tight tracking-wide resize-none outline-none p-4 placeholder-gray-600"
            placeholder="Type or sign a sentence…"
            aria-label="Edit translated sentence"
          />
        ) : (
          <button
            className="w-full text-left p-4 group cursor-text"
            onClick={handleEditStart}
            title="Click to edit"
            aria-label="Click to manually edit the sentence"
          >
            {isEmpty ? (
              <span className="text-gray-600 text-lg italic select-none">
                Your translation will appear here…
              </span>
            ) : (
              <span className="text-white text-2xl md:text-3xl font-semibold leading-tight tracking-wide">
                {displayText}
              </span>
            )}
            <span className="absolute top-2 right-3 text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity select-none">
              ✎ edit
            </span>
          </button>
        )}
      </div>

      <p className="text-xs text-gray-600 text-right select-none" aria-hidden>
        Click subtitle to edit manually · Press Enter to confirm
      </p>
    </div>
  );
};
