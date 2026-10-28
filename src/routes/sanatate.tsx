import { createFileRoute } from '@tanstack/react-router';
import { HealthFlow } from '@/components/health/HealthFlow';

export const Route = createFileRoute('/sanatate')({
  head: () => ({ meta: [
    { title: 'Sănătate și obiceiuri — Prototype123' },
    { name: 'description', content: 'Răspunsuri și analize verificate de tine, pentru scenarii de sprijin și planificarea financiară a familiei.' },
    { property: 'og:title', content: 'Sănătate și obiceiuri — Prototype123' },
    { property: 'og:description', content: 'Un parcurs calm pentru a înțelege posibilele nevoi de sprijin ale părintelui tău.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: HealthFlow,
});
