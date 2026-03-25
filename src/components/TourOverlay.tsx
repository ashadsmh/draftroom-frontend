import React, { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { TOUR_STEPS } from '../hooks/useTour';

interface TourOverlayProps {
  isActive: boolean;
  onEnd: () => void;
}

export default function TourOverlay({ isActive, onEnd }: TourOverlayProps) {
  useEffect(() => {
    if (!isActive) return;

    const driverObj = driver({
      showProgress: true,
      animate: true,
      overlayColor: 'rgba(2, 6, 23, 0.8)', // slate-950 with opacity
      popoverClass: 'draftroom-tour-popover',
      steps: TOUR_STEPS.map(step => ({
        element: `#${step.elementId}`,
        popover: {
          title: step.title,
          description: step.description,
          side: step.position,
          align: 'start',
        }
      })),
      onDestroyStarted: () => {
        if (driverObj.hasNextStep() || confirm("Are you sure you want to skip the tour?")) {
          driverObj.destroy();
          onEnd();
        }
      }
    });

    driverObj.drive();

    return () => {
      driverObj.destroy();
    };
  }, [isActive, onEnd]);

  return null; // The overlay is handled by driver.js
}
