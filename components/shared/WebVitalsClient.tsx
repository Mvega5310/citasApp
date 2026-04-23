'use client';

import { useEffect } from 'react';
import { initWebVitals } from '@/lib/shared/web-vitals';

export default function WebVitalsClient() {
  useEffect(() => {
    initWebVitals();
  }, []);
  return null;
}

