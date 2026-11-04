import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4';
const displayFont = { fontFamily: "'Instrument Serif', serif" };

export function CinematicHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyPreference = () => {
      const video = videoRef.current;
      if (!video) return;
      if (motion.matches) video.pause();
      else void video.play().catch(() => setPaused(true));
    };
    applyPreference();
    motion.addEventListener('change', applyPreference);
    return () => motion.removeEventListener('change', applyPreference);
  }, []);

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setPaused(true));
    else video.pause();
  }

  return (
    <section className="relative isolate flex min-h-svh flex-col overflow-hidden bg-background text-foreground" aria-labelledby="cinematic-title">
      <video
        ref={videoRef}
        className="absolute inset-0 z-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onError={() => setUnavailable(true)}
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      <nav className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-8 py-6" aria-label="RSVP navigation">
        <span className="text-3xl tracking-tight text-foreground" style={displayFont}>
          Velorah<sup className="text-xs">®</sup>
        </span>
        <Button asChild><a href="#rsvp">RSVP</a></Button>
      </nav>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-[90px] text-center md:pt-32 md:pb-40">
        <h1 id="cinematic-title" aria-label="Where dreams rise through the silence." className="animate-fade-rise m-0 max-w-7xl text-5xl leading-[0.95] font-normal tracking-[-2.46px] text-foreground sm:text-7xl md:text-8xl" style={displayFont}>
          Where <em className="not-italic text-muted-foreground">dreams</em> rise<br className="hidden sm:block" />{' '}
          <em className="not-italic text-muted-foreground">through the silence.</em>
        </h1>
        <p className="animate-fade-rise-delay mt-8 mb-0 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          We’re designing tools for deep thinkers, bold creators, and quiet rebels. Amid the chaos, we build digital spaces for sharp focus and inspired work.
        </p>
        <div className="animate-fade-rise-delay-2 mt-12">
          <Button size="hero" asChild><a href="#rsvp">RSVP</a></Button>
        </div>
      </div>

      {!unavailable && (
        <Button size="icon" className="absolute right-6 bottom-6 z-10" aria-label={paused ? 'Play background video' : 'Pause background video'} aria-pressed={paused} onClick={togglePlayback}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            {paused ? <path d="M4 2.5 13 8l-9 5.5z" /> : <path d="M3 2h3v12H3zm7 0h3v12h-3z" />}
          </svg>
        </Button>
      )}
    </section>
  );
}
