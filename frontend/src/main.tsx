import { createRoot } from 'react-dom/client';
import { CinematicHero } from '@/components/cinematic-hero';
import './index.css';

const root = document.getElementById('cinematic-hero');
if (root) createRoot(root).render(<CinematicHero />);
