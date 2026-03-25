import { useEffect, useRef, useState } from 'react';
import { FileText, Type, PenLine, Stamp, Search, Undo2 } from 'lucide-react';

const PIXEL_FONT = "'Press Start 2P', 'Courier New', monospace";

const FEATURES = [
  { icon: <Type size={14} />, label: 'ANNOTATE' },
  { icon: <PenLine size={14} />, label: 'DRAW' },
  { icon: <Stamp size={14} />, label: 'SIGN' },
  { icon: <Search size={14} />, label: 'SEARCH' },
  { icon: <Undo2 size={14} />, label: 'HISTORY' },
];

// Floating page config: [left%, rotation, duration, delay, width]
const PAGES: [string, number, string, string, number][] = [
  ['4%',   -8,  '17s',  '0s',   30],
  ['11%',   5,  '13s', '-6s',   24],
  ['20%',  -4,  '20s', '-12s',  40],
  ['32%',   9,  '15s', '-3s',   28],
  ['47%', -12,  '18s', '-9s',   22],
  ['60%',   6,  '16s', '-1s',   36],
  ['72%',  -5,  '21s', '-15s',  32],
  ['83%',  11,  '14s', '-7s',   26],
  ['92%',  -9,  '19s', '-4s',   34],
];

const TYPEWRITER_TEXT = 'EDIT · ANNOTATE · SIGN · EXPORT';

export function HomePage({ onEnter }: { onEnter: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);
  const [subtitle, setSubtitle] = useState('');
  const [cursorOn, setCursorOn] = useState(true);

  // Any key / click to enter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['Tab', 'F5', 'F12'].includes(e.key)) return;
      onEnter();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onEnter]);

  // Pixel-rain canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const CELL = 14;
    const FONT_SIZE = 11;
    let cols = 0;
    let drops: number[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.floor(canvas.width / CELL);
      drops = Array.from({ length: cols }, () =>
        -(Math.random() * (canvas.height / CELL))
      );
    };
    resize();
    window.addEventListener('resize', resize);

    const GLYPHS = ['0', '1', '█', '▓', '░', '■', '□', '▪', '▫'];
    let frame = 0;
    let raf: number;

    const tick = () => {
      frame++;
      // Trailing fade
      ctx.fillStyle = 'rgba(9,9,11,0.055)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${FONT_SIZE}px monospace`;
      ctx.textAlign = 'left';

      for (let i = 0; i < drops.length; i++) {
        const x = i * CELL;
        const y = drops[i] * CELL;
        const g = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

        // Bright head
        ctx.fillStyle = '#93c5fd';
        ctx.fillText(g, x, y);

        // Second cell (medium)
        ctx.fillStyle = 'rgba(59,130,246,0.65)';
        ctx.fillText(GLYPHS[Math.floor(Math.random() * GLYPHS.length)], x, y - CELL);

        // Third cell (dim)
        ctx.fillStyle = 'rgba(59,130,246,0.18)';
        ctx.fillText(GLYPHS[Math.floor(Math.random() * GLYPHS.length)], x, y - CELL * 2);

        // Reset drop
        if (y > canvas.height && Math.random() > 0.975) drops[i] = -4;

        // Stagger speeds so columns fall at slightly different rates
        if (frame % (2 + (i % 3)) === 0) drops[i] += 1;
      }

      raf = requestAnimationFrame(tick);
    };
    tick();

    const t = setTimeout(() => setVisible(true), 150);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      clearTimeout(t);
    };
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (!visible) return;
    let i = 0;
    const iv = setInterval(() => {
      if (i <= TYPEWRITER_TEXT.length) {
        setSubtitle(TYPEWRITER_TEXT.slice(0, i++));
      } else {
        clearInterval(iv);
      }
    }, 52);
    return () => clearInterval(iv);
  }, [visible]);

  // Blinking cursor
  useEffect(() => {
    const iv = setInterval(() => setCursorOn(c => !c), 480);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#09090b]">

      {/* Pixel rain background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: 0.38 }}
      />

      {/* Radial vignette to focus center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 70% at 50% 50%, transparent 0%, rgba(9,9,11,0.75) 100%)' }}
      />

      {/* CRT scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 5 }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0, right: 0, height: 3,
            background: 'rgba(59,130,246,0.06)',
            animation: 'scan-line 5s linear infinite',
          }}
        />
      </div>

      {/* Floating pixel PDF pages */}
      {PAGES.map(([left, rot, dur, delay, w], i) => (
        <div
          key={i}
          className="absolute bottom-[-80px] pointer-events-none"
          style={{
            left,
            animation: `float-up ${dur} ${delay} linear infinite`,
            ['--page-rot' as string]: `${rot}deg`,
          }}
        >
          <PixelPage width={w} />
        </div>
      ))}

      {/* ── Hero content ───────────────────────────────────── */}
      <div
        className="relative z-10 flex flex-col items-center gap-7 px-6 text-center"
        style={{
          transition: 'opacity 0.9s ease, transform 0.9s ease',
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(24px)',
        }}
      >
        {/* Glowing file icon */}
        <div style={{ animation: 'pixel-glow-pulse 2.5s ease-in-out infinite' }}>
          <FileText
            size={72}
            strokeWidth={1.5}
            className="text-[#3b82f6]"
          />
        </div>

        {/* Title */}
        <div style={{ fontFamily: PIXEL_FONT, lineHeight: 1.5 }}>
          <div
            className="text-[#3b82f6]"
            style={{ fontSize: 'clamp(1.6rem, 5.5vw, 3.2rem)' }}
          >
            PDF
          </div>
          <div
            className="text-white"
            style={{ fontSize: 'clamp(1.6rem, 5.5vw, 3.2rem)' }}
          >
            EDITOR
          </div>
        </div>

        {/* Typewriter subtitle */}
        <div
          className="text-[#3b82f6] flex items-center"
          style={{
            fontFamily: PIXEL_FONT,
            fontSize: 'clamp(0.42rem, 1.4vw, 0.62rem)',
            letterSpacing: '0.05em',
            minHeight: '1.4em',
          }}
        >
          {subtitle}
          <span
            className="ml-0.5"
            style={{ opacity: cursorOn ? 1 : 0, transition: 'opacity 0.1s' }}
          >█</span>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {FEATURES.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[#a1a1aa] border border-[#3f3f46] bg-[#18181b]"
              style={{ fontFamily: PIXEL_FONT, fontSize: '0.45rem', letterSpacing: '0.04em' }}
            >
              <span className="text-[#3b82f6]">{f.icon}</span>
              {f.label}
            </div>
          ))}
        </div>

        {/* CTA button */}
        <button
          onClick={onEnter}
          className="mt-2 px-8 py-4 bg-[#3b82f6] hover:bg-[#2563eb] text-white tracking-widest transition-colors duration-150 active:scale-95"
          style={{
            fontFamily: PIXEL_FONT,
            fontSize: '0.72rem',
            boxShadow: '4px 4px 0 #1e40af, 0 0 32px rgba(59,130,246,0.55)',
            transition: 'background-color 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '4px 4px 0 #1e40af, 0 0 64px rgba(59,130,246,0.95)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              '4px 4px 0 #1e40af, 0 0 32px rgba(59,130,246,0.55)';
          }}
        >
          [ OPEN EDITOR ]
        </button>

        {/* Press any key hint */}
        <p
          className="text-[#3f3f46] animate-pulse"
          style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.08em' }}
        >
          PRESS ANY KEY TO CONTINUE
        </p>
      </div>
    </div>
  );
}

/** Small pixel-art document shape that floats upward */
function PixelPage({ width }: { width: number }) {
  const height = Math.round(width * 1.35);
  const ear = Math.round(width * 0.28);
  const lineCount = 4;

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: '#18181b',
        border: '2px solid #3f3f46',
        position: 'relative',
        boxShadow: '2px 2px 0 #27272a',
        clipPath: `polygon(0 0, ${width - ear}px 0, ${width}px ${ear}px, ${width}px ${height}px, 0 ${height}px)`,
      }}
    >
      {/* Dog-ear fold line */}
      <div
        style={{
          position: 'absolute',
          top: 0, right: 0,
          width: ear, height: ear,
          borderLeft: '2px solid #3f3f46',
          borderBottom: '2px solid #3f3f46',
          backgroundColor: '#09090b',
        }}
      />
      {/* Text lines */}
      {Array.from({ length: lineCount }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: '14%',
            right: i % 2 === 0 ? '14%' : '30%',
            top: `${28 + i * 17}%`,
            height: Math.max(1, Math.round(width * 0.07)),
            backgroundColor: '#3f3f46',
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}
