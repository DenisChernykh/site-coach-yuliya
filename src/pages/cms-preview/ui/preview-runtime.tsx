import { useEffect } from 'react';
import { startPreview } from '../model/preview';

export function CmsPreviewRuntime() {
  useEffect(startPreview, []);
  return null;
}
