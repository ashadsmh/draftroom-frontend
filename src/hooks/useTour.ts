import { useState, useEffect, useCallback } from 'react';

const TOUR_KEY = 'draftroom_tour_seen';

export interface TourStep {
  elementId: string;
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export const TOUR_STEPS: TourStep[] = [
  {
    elementId: 'tour-search',
    title: '🔍 Search Any Player',
    description: 'Search any NBA player by name — or try nicknames like "Wemby", "SGA", or "Luka". Pull up their DR Score, season stats, and 5-game projections instantly.',
    position: 'bottom',
  },
  {
    elementId: 'tour-dr-score',
    title: '📊 DraftRoom Score',
    description: 'Our proprietary efficiency metric (0–100) calculated from True Shooting, Playmaking, Defensive Impact, Foul Drawing, and Volume Efficiency — updated every 10 games.',
    position: 'bottom',
  },
  {
    elementId: 'tour-optimize',
    title: '⚡ Optimize Lineup',
    description: 'Paste your fantasy roster and get instant start/sit recommendations. Injury-aware, matchup-adjusted, with reasoning behind every decision.',
    position: 'bottom',
  },
  {
    elementId: 'tour-build-team',
    title: '🏀 Build Team',
    description: 'Build any 5-player lineup and see their combined DR Score, Offensive Rating, and Defensive Rating. Compare two teams head-to-head.',
    position: 'bottom',
  },
  {
    elementId: 'tour-breakout',
    title: '⭐ Breakout Alerts',
    description: 'Players whose projected DR Score is trending up — younger players gaining momentum worth adding to your roster.',
    position: 'top',
  },
  {
    elementId: 'tour-prospects',
    title: '🔖 Watchlist',
    description: 'Bookmark any player card to save them to your Watchlist. Persists across sessions so you can track your targets.',
    position: 'top',
  },
];

export function useTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const endTour = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(TOUR_KEY, 'true');
  }, []);

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

  // Auto-start on first visit
  useEffect(() => {
    const seen = localStorage.getItem(TOUR_KEY);
    if (!seen) {
      const timer = setTimeout(() => startTour(), 1200);
      return () => clearTimeout(timer);
    }
  }, [startTour]);

  // Scroll element into view when step changes
  useEffect(() => {
    if (!isActive) return;
    const el = document.getElementById(TOUR_STEPS[currentStep].elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive, currentStep]);

  return { isActive, currentStep, startTour, endTour, nextStep, prevStep };
}