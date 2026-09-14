import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Mail,
  Zap,
  Flame,
  Briefcase,
  Key,
  CheckSquare,
} from 'lucide-react';

interface StardustParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  symbol: string;
  driftX: number;
  driftY: number;
  duration: number;
}

interface FloatingMailItem {
  id: string;
  type: 'urgent' | 'career' | 'security' | 'task';
  label: string;
  color: string;
  bgGlow: string;
  x: number;
  y: number;
  delay: string;
  icon: React.ReactNode;
  score: string;
}

export const MailBot3D: React.FC<{ onExplore?: () => void }> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, normalizedX: 0, normalizedY: 0 });
  const [robotPos, setRobotPos] = useState({ x: 50, y: 45 });
  const [stardust, setStardust] = useState<StardustParticle[]>([]);
  const [activeMailIndex, setActiveMailIndex] = useState(0);
  const [isScanning, setIsScanning] = useState(true);
  const [sortedCount, setSortedCount] = useState(0);
  const particleIdRef = useRef(0);

  const mailItems: FloatingMailItem[] = [
    {
      id: 'urgent-mail',
      type: 'urgent',
      label: 'Urgent Hotspot',
      color: 'text-rose-400 border-rose-400/50',
      bgGlow: 'shadow-[0_0_22px_rgba(244,63,94,0.5)] bg-rose-500/20',
      x: 20,
      y: 28,
      delay: '0s',
      icon: <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />,
      score: '99 pts',
    },
    {
      id: 'career-mail',
      type: 'career',
      label: 'Career & Offer',
      color: 'text-blue-400 border-blue-400/50',
      bgGlow: 'shadow-[0_0_22px_rgba(59,130,246,0.5)] bg-blue-500/20',
      x: 78,
      y: 26,
      delay: '1.2s',
      icon: <Briefcase className="w-3.5 h-3.5 text-blue-400" />,
      score: '96 pts',
    },
    {
      id: 'otp-mail',
      type: 'security',
      label: 'Security OTP',
      color: 'text-amber-400 border-amber-400/50',
      bgGlow: 'shadow-[0_0_22px_rgba(245,158,11,0.5)] bg-amber-500/20',
      x: 22,
      y: 72,
      delay: '2.1s',
      icon: <Key className="w-3.5 h-3.5 text-amber-400" />,
      score: '91 pts',
    },
    {
      id: 'task-mail',
      type: 'task',
      label: 'Action Task',
      color: 'text-emerald-400 border-emerald-400/50',
      bgGlow: 'shadow-[0_0_22px_rgba(16,185,129,0.5)] bg-emerald-500/20',
      x: 78,
      y: 70,
      delay: '0.8s',
      icon: <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />,
      score: '88 pts',
    },
  ];

  const spawnStardust = (originX: number, originY: number, count = 3) => {
    const starSymbols = ['✦', '★', '✧', '•', '✨', '✵'];
    const starColors = ['#C084FC', '#67E8F9', '#FDE047', '#F472B6', '#FFFFFF', '#34D399'];

    const newParticles: StardustParticle[] = [];
    for (let i = 0; i < count; i++) {
      particleIdRef.current += 1;
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 45;
      newParticles.push({
        id: particleIdRef.current,
        x: originX + (Math.random() - 0.5) * 15,
        y: originY + (Math.random() - 0.5) * 15,
        size: Math.random() > 0.4 ? 12 : 8,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        symbol: starSymbols[Math.floor(Math.random() * starSymbols.length)],
        driftX: Math.cos(angle) * dist,
        driftY: Math.sin(angle) * dist + 15,
        duration: 1.2 + Math.random() * 0.8,
      });
    }

    setStardust((prev) => [...prev.slice(-30), ...newParticles]);
  };

  useEffect(() => {
    let t = 0;
    const flightInterval = setInterval(() => {
      t += 0.05;
      const baseFlightX = 50 + Math.sin(t) * 14;
      const baseFlightY = 46 + Math.cos(t * 1.5) * 10;
      const targetX = baseFlightX + mousePos.normalizedX * 16;
      const targetY = baseFlightY + mousePos.normalizedY * 16;

      setRobotPos({ x: targetX, y: targetY });

      if (Math.random() > 0.2) {
        spawnStardust(targetX, targetY + 10, 2);
      }
    }, 50);

    return () => clearInterval(flightInterval);
  }, [mousePos]);

  useEffect(() => {
    const cleanup = setInterval(() => {
      setStardust((prev) => prev.slice(-25));
    }, 1500);
    return () => clearInterval(cleanup);
  }, []);

  useEffect(() => {
    const cycle = setInterval(() => {
      setIsScanning(true);
      setTimeout(() => {
        setIsScanning(false);
        setSortedCount((c) => c + 1);
        setActiveMailIndex((i) => (i + 1) % mailItems.length);
      }, 1500);
    }, 3600);

    return () => clearInterval(cycle);
  }, [mailItems.length]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;

    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      normalizedX: nx,
      normalizedY: ny,
    });

    if (Math.random() > 0.4) {
      const px = ((e.clientX - rect.left) / rect.width) * 100;
      const py = ((e.clientY - rect.top) / rect.height) * 100;
      spawnStardust(px, py, 1);
    }
  };

  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    spawnStardust(px, py, 10);
    setSortedCount((c) => c + 1);
    setActiveMailIndex((i) => (i + 1) % mailItems.length);
  };

  const activeTargetMail = mailItems[activeMailIndex];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onClick={handleStageClick}
      className="relative w-full h-[300px] sm:h-[340px] mx-auto select-none rounded-3xl overflow-hidden cursor-crosshair group flex items-center justify-center"
      style={{ perspective: '1000px' }}
    >
      {/* Deep Space Background Aura */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1c1438]/80 via-[#130e26]/90 to-[#0c081a]/95 backdrop-blur-md rounded-3xl border border-purple-500/30" />

      {/* Floating Constellation Starfield Background */}
      <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(#A855F7_1px,transparent_1px)] [background-size:20px_20px]" />

      {/* Ambient Cosmic Lights */}
      <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-1/4 right-1/4 w-44 h-44 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none animate-pulse-slow" />

      {/* ========================================================= */}
      {/* ✨ SPRINKLY STARDUST PARTICLES TRAIL                      */}
      {/* ========================================================= */}
      {stardust.map((star) => (
        <div
          key={star.id}
          className="absolute pointer-events-none stardust-particle font-mono select-none"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            color: star.color,
            fontSize: `${star.size}px`,
            textShadow: `0 0 10px ${star.color}, 0 0 20px ${star.color}`,
            '--drift-x': `${star.driftX}px`,
            '--drift-y': `${star.driftY}px`,
            animationDuration: `${star.duration}s`,
          } as any}
        >
          {star.symbol}
        </div>
      ))}

      {/* ========================================================= */}
      {/* ✉️ FLOATING 3D MAIL ICONS IN ORBIT                        */}
      {/* ========================================================= */}
      {mailItems.map((mail, idx) => {
        const isTarget = idx === activeMailIndex;

        return (
          <div
            key={mail.id}
            className={`absolute animate-mail-float transition-all duration-700 ease-out z-10 flex flex-col items-center ${
              isTarget ? 'scale-110 z-20' : 'opacity-80 scale-95'
            }`}
            style={{
              left: `${mail.x}%`,
              top: `${mail.y}%`,
              animationDelay: mail.delay,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Glowing Mail Envelope Icon */}
            <div
              className={`relative p-3 rounded-2xl border transition-all duration-300 backdrop-blur-md cursor-pointer hover:scale-125 ${
                mail.bgGlow
              } ${mail.color} ${
                isTarget
                  ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#130e26] animate-bounce-subtle'
                  : 'hover:border-white/60'
              }`}
            >
              <div className="flex items-center justify-center">
                <Mail className="w-6 h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
              </div>

              {/* Category Mini Floating Badge */}
              <div className="absolute -bottom-1.5 -right-1.5 p-1 rounded-lg bg-[#0e0a1c] border border-white/20 shadow-md">
                {mail.icon}
              </div>
            </div>

            {/* Floating Tag Label */}
            <div
              className={`mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold whitespace-nowrap transition-all duration-300 border ${
                isTarget
                  ? 'bg-purple-900/90 text-white border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                  : 'bg-black/60 text-slate-300 border-white/10 opacity-70'
              }`}
            >
              <span>{mail.label}</span>
              {isTarget && (
                <span className="ml-1 text-cyan-300 font-bold">[{mail.score}]</span>
              )}
            </div>
          </div>
        );
      })}

      {/* ========================================================= */}
      {/* 🤖 3D FLYING ROBOT WITH STARDUST THRUSTERS                */}
      {/* ========================================================= */}
      <div
        className="absolute transition-all duration-150 ease-out z-30 pointer-events-auto"
        style={{
          left: `${robotPos.x}%`,
          top: `${robotPos.y}%`,
          transform: `translate(-50%, -50%) rotateY(${mousePos.normalizedX * 25}deg) rotateX(${
            -mousePos.normalizedY * 20
          }deg) rotateZ(${mousePos.normalizedX * 12}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        <div className="relative animate-robot-fly cursor-pointer group">
          {/* Glowing Aura halo around flying bot */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-purple-500/40 via-cyan-400/40 to-pink-500/30 rounded-full blur-xl opacity-90 animate-pulse" />

          {/* Robot Head Body */}
          <div className="relative w-24 h-20 rounded-3xl bg-gradient-to-b from-[#35275E] via-[#241A45] to-[#150F2D] border-2 border-purple-300/80 shadow-[0_12px_30px_-4px_rgba(168,85,247,0.6)] p-2 flex flex-col justify-between items-center transition-transform group-hover:scale-110">
            {/* Flying Antenna with Sparkling Star Beacon */}
            <div className="absolute -top-4 flex flex-col items-center">
              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-cyan-400 to-white border-2 border-white shadow-[0_0_15px_#38BDF8] flex items-center justify-center animate-pulse">
                <span className="text-[8px] text-purple-950 font-black">✦</span>
              </div>
              <div className="w-1 h-2 bg-gradient-to-b from-purple-300 to-indigo-500 rounded-full" />
            </div>

            {/* Side Cyber Wings */}
            <div className="absolute -left-2.5 top-4 w-2.5 h-6 rounded-l-xl bg-gradient-to-b from-cyan-400 to-purple-600 border border-purple-300/60 shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
            <div className="absolute -right-2.5 top-4 w-2.5 h-6 rounded-r-xl bg-gradient-to-b from-cyan-400 to-purple-600 border border-purple-300/60 shadow-[0_0_8px_rgba(56,189,248,0.5)]" />

            {/* Visor Screen with Expressive Cyber Eyes */}
            <div className="w-full h-10 rounded-2xl bg-[#070512] border border-purple-400/50 p-1 flex items-center justify-around overflow-hidden shadow-inner relative">
              {/* Laser sweep line across visor */}
              <div className="absolute inset-y-0 w-6 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-shimmer" />

              {/* Left Eye */}
              <div className="w-4 h-4 rounded-full bg-cyan-400/20 border border-cyan-400 flex items-center justify-center shadow-[0_0_10px_#38BDF8]">
                <div className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
              </div>

              {/* Center Audio Wave HUD */}
              <div className="flex items-center gap-0.5 h-2.5">
                <span className="w-0.5 h-2 bg-purple-400 rounded-full animate-pulse" />
                <span className="w-0.5 h-3 bg-cyan-400 rounded-full animate-bounce-subtle" />
                <span className="w-0.5 h-2 bg-purple-400 rounded-full animate-pulse" />
              </div>

              {/* Right Eye */}
              <div className="w-4 h-4 rounded-full bg-cyan-400/20 border border-cyan-400 flex items-center justify-center shadow-[0_0_10px_#38BDF8]">
                <div className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
              </div>
            </div>

            {/* Bottom Thruster Jet with Stardust Plasma Flame */}
            <div className="absolute -bottom-3 flex items-center gap-2">
              <div className="w-2.5 h-4 rounded-b-full bg-gradient-to-b from-cyan-400 via-purple-500 to-transparent shadow-[0_0_12px_#38BDF8] animate-pulse" />
              <div className="w-2.5 h-4 rounded-b-full bg-gradient-to-b from-cyan-400 via-purple-500 to-transparent shadow-[0_0_12px_#38BDF8] animate-pulse" />
            </div>

            {/* AI Core Emblem */}
            <div className="flex items-center gap-1 text-[8px] font-mono text-purple-200">
              <Sparkles className="w-2.5 h-2.5 text-cyan-300 animate-spin" />
              <span>Mailo AI</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🌟 LASER SCANNING BEAM TO ACTIVE TARGET MAIL             */}
      {/* ========================================================= */}
      {isScanning && activeTargetMail && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-15">
          <defs>
            <linearGradient id="laserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#C084FC" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#F472B6" stopOpacity="0.4" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <line
            x1={`${robotPos.x}%`}
            y1={`${robotPos.y}%`}
            x2={`${activeTargetMail.x}%`}
            y2={`${activeTargetMail.y}%`}
            stroke="url(#laserGrad)"
            strokeWidth="2.5"
            strokeDasharray="4,3"
            filter="url(#glow)"
            className="animate-pulse"
          />
        </svg>
      )}

      {/* Floating Prompt on hover / click */}
      <div className="absolute bottom-2 inset-x-0 flex items-center justify-center pointer-events-none z-20">
        <div className="px-3 py-1 rounded-full bg-purple-950/70 border border-purple-500/30 text-[10px] font-mono text-purple-200/80 backdrop-blur-md flex items-center gap-1.5 shadow-lg">
          <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />
          <span>Click to sprinkle stardust & sort mail</span>
          <span className="text-cyan-300 font-bold">({sortedCount} sorted)</span>
        </div>
      </div>
    </div>
  );
};
