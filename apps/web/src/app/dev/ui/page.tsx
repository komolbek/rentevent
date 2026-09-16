import { notFound } from 'next/navigation';
import { UiGallery } from './UiGallery';

/**
 * Every component in every state — the page a prompt author opens to see
 * what exists (spec §6.5). Development only: production returns 404.
 */
export default function DevUiPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <UiGallery />;
}
