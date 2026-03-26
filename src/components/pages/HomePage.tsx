import { useEffect, useState } from 'react';
import {
  FileText, Type, PenLine, Stamp, Search,
  Undo2, Image, Scissors, ArrowRight, Sparkles,
} from 'lucide-react';

const FEATURES = [
  {
    icon: <Type size={20} />,
    title: 'Text & Annotations',
    desc: 'Add text, highlights, underlines and rich comments anywhere on your PDF.',
  },
  {
    icon: <PenLine size={20} />,
    title: 'Freehand Drawing',
    desc: 'Draw arrows, shapes, and freehand strokes with full color and opacity control.',
  },
  {
    icon: <Stamp size={20} />,
    title: 'Stamps & Signatures',
    desc: 'Apply approval stamps or capture your handwritten signature in seconds.',
  },
  {
    icon: <Search size={20} />,
    title: 'Find & Search',
    desc: 'Instantly locate any text across all pages with highlighted match navigation.',
  },
  {
    icon: <Undo2 size={20} />,
    title: 'Full Undo / Redo',
    desc: 'Unlimited history lets you experiment freely and roll back any mistake.',
  },
  {
    icon: <Image size={20} />,
    title: 'Insert Images',
    desc: 'Embed photos, logos, or screenshots directly onto any page.',
  },
  {
    icon: <Scissors size={20} />,
    title: 'Redact Content',
    desc: 'Permanently cover sensitive information before sharing your document.',
  },
  {
    icon: <FileText size={20} />,
    title: 'Export & Print',
    desc: 'Save an annotated PDF or print with pixel-perfect layout preservation.',
  },
];

export function HomePage({ onEnter }: { onEnter: () => void }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Any key to enter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['Tab', 'F5', 'F12'].includes(e.key)) return;
      onEnter();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onEnter]);

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-x-hidden"
      style={{ background: 'linear-gradient(135deg, #05050d 0%, #0c0c1e 50%, #080814 100%)' }}
    >
      {/* ── Gradient orbs ─────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Blue orb — top left */}
        <div
          style={{
            position: 'absolute', top: '-10%', left: '-5%',
            width: 700, height: 700, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)',
            animation: 'orb-1 18s ease-in-out infinite',
            filter: 'blur(1px)',
          }}
        />
        {/* Indigo orb — top right */}
        <div
          style={{
            position: 'absolute', top: '-15%', right: '-10%',
            width: 800, height: 800, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
            animation: 'orb-2 22s ease-in-out infinite',
            filter: 'blur(1px)',
          }}
        />
        {/* Purple orb — bottom center */}
        <div
          style={{
            position: 'absolute', bottom: '-20%', left: '35%',
            width: 600, height: 600, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
            animation: 'orb-3 26s ease-in-out infinite',
            filter: 'blur(1px)',
          }}
        />

        {/* Subtle dot grid */}
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* Top gradient line */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)',
          }}
        />
      </div>

      {/* ── Navbar ────────────────────────────────────── */}
      <nav
        className="relative z-10 flex items-center justify-between px-8 py-5"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(12px)',
          background: 'rgba(5,5,13,0.4)',
          opacity: entered ? 1 : 0,
          transition: 'opacity 0.6s ease',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FileText size={16} className="text-white" />
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">PDF Editor</span>
        </div>

        <button
          onClick={onEnter}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.14)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
        >
          Open Editor <ArrowRight size={14} />
        </button>
      </nav>

      {/* ── Hero ──────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-28 pb-24">
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 999,
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.3)',
            color: '#a5b4fc',
            fontSize: 12, fontWeight: 500,
            marginBottom: 28,
            animation: entered ? 'fade-up 0.7s ease both, badge-pulse 3s ease-in-out 1s infinite' : 'none',
            animationDelay: '0s, 1s',
          }}
        >
          <Sparkles size={12} />
          Free · No Sign-up · Works in Browser
        </div>

        {/* Main title */}
        <h1
          style={{
            fontSize: 'clamp(3rem, 8vw, 6rem)',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            marginBottom: 24,
            background: 'linear-gradient(135deg, #ffffff 20%, #a5b4fc 60%, #60a5fa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            animation: entered ? 'fade-up 0.8s ease both' : 'none',
            animationDelay: '0.1s',
          }}
        >
          Edit PDFs<br />
          <span
            style={{
              background: 'linear-gradient(135deg, #6366f1, #3b82f6, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Effortlessly
          </span>
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            color: '#94a3b8',
            maxWidth: 520,
            lineHeight: 1.7,
            marginBottom: 40,
            animation: entered ? 'fade-up 0.8s ease both' : 'none',
            animationDelay: '0.2s',
          }}
        >
          Annotate, draw, sign, and redact your documents directly in the browser.
          No uploads. No accounts. Instant and private.
        </p>

        {/* CTA buttons */}
        <div
          style={{
            display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
            animation: entered ? 'fade-up 0.8s ease both' : 'none',
            animationDelay: '0.3s',
          }}
        >
          {/* Primary CTA */}
          <button
            onClick={onEnter}
            className="group flex items-center gap-2 px-7 py-3.5 text-white font-semibold rounded-xl transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
              boxShadow: '0 0 0 1px rgba(99,102,241,0.5), 0 20px 40px rgba(99,102,241,0.3)',
              fontSize: 15,
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px rgba(99,102,241,0.7), 0 20px 60px rgba(99,102,241,0.5)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 1px rgba(99,102,241,0.5), 0 20px 40px rgba(99,102,241,0.3)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            {/* Shimmer overlay */}
            <span
              style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2.5s linear infinite',
              }}
            />
            <FileText size={16} />
            Open Editor
            <ArrowRight size={16} />
          </button>

          {/* Secondary */}
          <button
            onClick={onEnter}
            className="flex items-center gap-2 px-7 py-3.5 font-semibold rounded-xl transition-all active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#e2e8f0',
              fontSize: 15,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            Drop a PDF to start
          </button>
        </div>
      </section>

      {/* ── Feature grid ──────────────────────────────── */}
      <section className="relative z-10 px-6 pb-24">
        <div
          style={{
            maxWidth: 1000, margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 16,
                padding: '22px 20px',
                cursor: 'default',
                animation: entered ? 'card-in 0.7s ease both' : 'none',
                animationDelay: `${0.35 + i * 0.06}s`,
                transition: 'border-color 0.2s, background 0.2s, transform 0.2s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(99,102,241,0.4)';
                el.style.background = 'rgba(99,102,241,0.06)';
                el.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(255,255,255,0.07)';
                el.style.background = 'rgba(255,255,255,0.03)';
                el.style.transform = 'translateY(0)';
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 40, height: 40, borderRadius: 10, marginBottom: 14,
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(59,130,246,0.2))',
                  border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#818cf8',
                }}
              >
                {f.icon}
              </div>
              <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>
                {f.title}
              </div>
              <div style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom bar ────────────────────────────────── */}
      <div
        className="relative z-10 mt-auto flex items-center justify-center py-6"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#334155', fontSize: 12 }}
      >
        Press any key to open the editor
      </div>
    </div>
  );
}
