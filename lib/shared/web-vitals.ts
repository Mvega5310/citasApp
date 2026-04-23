import type { Metric } from 'web-vitals';
import { onCLS, onFID, onLCP, onINP, onTTFB } from 'web-vitals';

const send = (metric: Metric) => {
  try {
    navigator.sendBeacon?.('/api/metrics', JSON.stringify(metric)) ||
      fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
        keepalive: true,
      });
  } catch {
    // noop
  }
};

export const initWebVitals = () => {
  onCLS(send);
  onFID(send);
  onLCP(send);
  onINP(send);
  onTTFB(send);
};

