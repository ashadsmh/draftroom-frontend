import { useState, useEffect, useCallback } from 'react';

const TOUR_KEY = 'draftroom_tour_seen';
const LEBRON_ID = '2544';

export interface TourStep {
  elementId: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export const TOUR_STEPS: TourStep[] = [
  {
    elementId: 'tour-hero',
    title: '👋 Welcome to DraftRoom',
    description: 'The analytics tool built for fantasy basketball. One heads up — we run on a free server, so your first search may <strong>take up to 60 seconds to load</strong>. Worth the wait.',
    position: 'bottom',
  },
  {
    elementId: 'tour-search',
    title: '🔍 Search Any Player',
    description: 'Search any NBA player by name. Try nicknames like "Wemby", "SGA", or "Luka". Pull up their DR Score, season stats, and 5-game projections instantly.',
    position: 'bottom',
  },
  {
    elementId: 'tour-prospects',
    title: '🏆 Leaderboard',
    description: 'The highest-rated players by DR Score right now. Filter by position or sort by trending up, most points, or highest score. Click any card to load their full analysis.',
    position: 'top',
  },
  {
    elementId: 'tour-breakout',
    title: '⭐ Breakout Alerts',
    description: 'Younger players whose projected DR Score is trending up significantly — these are the under-the-radar adds worth picking up before anyone else notices.',
    position: 'top',
  },
  {
    elementId: 'tour-watchlist',
    title: '🔖 Your Watchlist',
    description: 'Bookmark any player card to save them here. Your watchlist persists across sessions — perfect for tracking your fantasy targets throughout the season.',
    position: 'top',
  },
  {
    elementId: 'tour-build-team',
    title: '🏀 Build Team',
    description: 'Build any 5-player lineup — mix real rosters or dream teams. See the combined DR Score, Offensive Rating, and Defensive Rating. Compare two squads head-to-head.',
    position: 'bottom',
  },
  {
    elementId: 'tour-optimize',
    title: '⚡ Optimize Lineup',
    description: 'Paste your actual fantasy roster and get ranked start/sit recommendations — injury-aware, matchup-adjusted, with clear reasoning behind every pick.',
    position: 'bottom',
  },
];

export function useTour(
  onTourStart?: () => void,
  onTourEnd?: () => void,
) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    onTourStart?.();
  }, [onTourStart]);

  const endTour = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(TOUR_KEY, 'true');
    onTourEnd?.();
  }, [onTourEnd]);

  const nextStep = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      endTour();
    }
  }, [currentStep, endTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) setCurrentStep(s => s - 1);
  }, [currentStep]);

  // Auto-start on first visit (after welcome modal is gone)
  useEffect(() => {
    const seen = localStorage.getItem(TOUR_KEY);
    if (!seen) {
      const timer = setTimeout(() => startTour(), 800);
      return () => clearTimeout(timer);
    }
  }, [startTour]);

  // Scroll element into view on step change
  useEffect(() => {
    if (!isActive) return;
    const el = document.getElementById(TOUR_STEPS[currentStep].elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive, currentStep]);

  return { isActive, currentStep, startTour, endTour, nextStep, prevStep };
}

export { LEBRON_ID };