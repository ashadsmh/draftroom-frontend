import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { TOUR_STEPS, TourStep } from '../hooks/useTour';

interface TourOverlayProps {
  isActive: boolean;
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onEnd: () => void;
}

interface PopoverPos {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
  arrowLeft: number;
}

export default function TourOverlay({ isActive, currentStep, onNext, onPrev, onEnd }: TourOverlayProps) {
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const [highlight, setHighlight] = useState<DOMRect | null>(null);

  const step: TourStep = TOUR_STEPS[currentStep];

  useEffect(() => {
    if (!isActive) return;

    const updatePos = () => {
      const el = document.getElementById(step.elementId);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const popoverWidth = 320;
      const popoverHeight = 200;
      const gap = 14;

      setHighlight(rect);

      let top: number;
      let placement: 'top' | 'bottom';

      if (step.position === 'bottom') {
        top = rect.bottom + gap;
        placement = 'bottom';
      } else {
        top = rect.top - popoverHeight - gap;
        placement = 'top';
      }

      let left = rect.left + rect.width / 2 - popoverWidth / 2;
      left = Math.max(16, Math.min(left, window.innerWidth - popoverWidth - 16));

      const arrowLeft = Math.min(
        Math.max(rect.left + rect.width / 2 - left - 8, 16),
        popoverWidth - 32
      );

      setPos({ top, left, placement, arrowLeft });
    };

    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos);
    };
  }, [isActive, currentStep, step]);

  if (!isActive) return null;

  return (
    <>
      {/* Dark overlay */}
      {highlight && (
        <div className="fixed inset-0 z-[9998] pointer-events-none">
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={highlight.left - 6}
                  y={highlight.top - 6}
                  width={highlight.width + 12}
                  height={highlight.height + 12}
                  rx="10"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.7)"
              mask="url(#tour-mask)"
            />
          </svg>
        </div>
      )}

      {/* Click blocker */}
      <div className="fixed inset-0 z-[9998]" onClick={onEnd} />

      {/* Highlight ring */}
      {highlight && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-xl ring-2 ring-purple-500"
          style={{
            top: highlight.top - 6,
            left: highlight.left - 6,
            width: highlight.width + 12,
            height: highlight.height + 12,
          }}
        />
      )}

      {/* Popover */}
      {pos && (
        <div
          className="fixed z-[10000] w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5"
          style={{ top: pos.top, left: pos.left }}
          onClick={e => e.stopPropagation()}
        >
          {/* Arrow up */}
          {pos.placement === 'bottom' && (
            <div
              className="absolute -top-[9px] w-4 h-4 bg-slate-900 border-l border-t border-slate-700 rotate-45"
              style={{ left: pos.arrowLeft }}
            />
          )}
          {/* Arrow down */}
          {pos.placement === 'top' && (
            <div
              className="absolute -bottom-[9px] w-4 h-4 bg-slate-900 border-r border-b border-slate-700 rotate-45"
              style={{ left: pos.arrowLeft }}
            />
          )}

          <div className="flex items-start justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-100 pr-2">{step.title}</h3>
            <button onClick={onEnd} className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed mb-4">{step.description}</p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600">{currentStep + 1} / {TOUR_STEPS.length}</span>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={onPrev}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                >
                  ← Back
                </button>
              )}
              <button
                onClick={onNext}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors"
              >
                {currentStep === TOUR_STEPS.length - 1 ? "Let's Go" : 'Next →'}
              </button>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === currentStep ? 'w-4 h-1.5 bg-purple-500' : 'w-1.5 h-1.5 bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}