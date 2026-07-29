import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

let currentPreference = true;
let initialized = false;
const listeners = new Set<(enabled: boolean) => void>();

const publish = (enabled: boolean) => {
  currentPreference = enabled;
  listeners.forEach((listener) => listener(enabled));
};

const initializePreference = () => {
  if (initialized) return;
  initialized = true;
  void AccessibilityInfo.isReduceMotionEnabled().then(publish);
  AccessibilityInfo.addEventListener('reduceMotionChanged', publish);
};

/**
 * Starts conservatively with motion disabled until Android reports the user's
 * accessibility preference. One shared native listener serves the whole app,
 * including long lists of entry cards.
 */
export const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(currentPreference);

  useEffect(() => {
    listeners.add(setReducedMotion);
    initializePreference();
    setReducedMotion(currentPreference);
    return () => {
      listeners.delete(setReducedMotion);
    };
  }, []);

  return reducedMotion;
};
