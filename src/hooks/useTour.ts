import { useEffect, useCallback } from 'react';
import { driver } from 'driver.js/dist/driver.esm.js';
import 'driver.js/dist/driver.css';

const TOUR_KEY = 'draftroom_tour_seen';

export function useTour() {
  const startTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: '#000',
      overlayOpacity: 0.75,
      smoothScroll: true,
      popoverClass: 'draftroom-tour-popover',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: "Let's Go",
      steps: [
        {
          element: '#tour-search',
          popover: {
            title: '🔍 Search Any Player',
            description: 'Search any NBA player by name — or try nicknames like "Wemby", "SGA", or "Luka". Pull up their DR Score, season stats, and 5-game projections instantly.',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '#tour-dr-score',
          popover: {
            title: '📊 DraftRoom Score',
            description: 'The DR Score is our proprietary efficiency metric (0–100) calculated from True Shooting, Playmaking, Defensive Impact, Foul Drawing, and Volume Efficiency — updated every 10 games.',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '#tour-optimize',
          popover: {
            title: '⚡ Optimize Lineup',
            description: 'Paste your fantasy roster and get instant start/sit recommendations. Injury-aware, matchup-adjusted, with reasoning behind every decision.',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '#tour-build-team',
          popover: {
            title: '🏀 Build Team',
            description: 'Build any 5-player lineup and see their combined DR Score, Offensive Rating, and Defensive Rating. Compare two teams head-to-head.',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '#tour-breakout',
          popover: {
            title: '⭐ Breakout Alerts',
            description: 'Players whose projected DR Score is trending up significantly — younger players gaining momentum worth adding to your roster.',
            side: 'top',
            align: 'center',
          },
        },
        {
          element: '#tour-prospects',
          popover: {
            title: '🔖 Watchlist',
            description: 'Bookmark any player card to save them to your Watchlist. Your watchlist persists across sessions so you can track your targets.',
            side: 'top',
            align: 'center',
          },
        },
      ],
      onDestroyed: () => {
        localStorage.setItem(TOUR_KEY, 'true');
      },
    });

    driverObj.drive();
  }, []);

  // Auto-start on first visit
  useEffect(() => {
    const seen = localStorage.getItem(TOUR_KEY);
    if (!seen) {
      // Small delay so the page renders first
      const timer = setTimeout(() => startTour(), 1200);
      return () => clearTimeout(timer);
    }
  }, [startTour]);

  return { startTour };
}