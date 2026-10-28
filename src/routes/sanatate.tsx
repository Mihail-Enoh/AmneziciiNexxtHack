import { createFileRoute } from '@tanstack/react-router';
import { HealthFlow } from '@/components/health/HealthFlow';
import { useProfiles } from '@/lib/store';

export const Route = createFileRoute('/sanatate')({
  head: () => ({ meta: [
    { title: 'Sănătate și obiceiuri — Prototype123' },
    { name: 'description', content: 'Răspunsuri și analize verificate de tine, pentru scenarii de sprijin și planificarea financiară a familiei.' },
    { property: 'og:title', content: 'Sănătate și obiceiuri — Prototype123' },
    { property: 'og:description', content: 'Un parcurs calm pentru a înțelege posibilele nevoi de sprijin ale persoanei de care ai grijă.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: HealthPage,
});

/** Each person has their own answers and documents: switching person remounts the flow with that person's session. */
function HealthPage() {
  const { activeId, loaded } = useProfiles();
  // Remount once saved data is loaded and on every person change, so the right session is read.
  return <HealthFlow key={`${activeId}:${loaded ? 1 : 0}`} />;
}
