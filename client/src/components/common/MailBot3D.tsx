import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Flame,
  Briefcase,
  Key,
  CheckSquare,
  Radio,
  Zap,
  Send,
  Shield,
  Activity,
  Cpu,
  RefreshCw,
  Eye,
  Sliders,
  Play,
  Rotate3d,
} from 'lucide-react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  symbol?: string;
}

interface RadarMailNode {
  id: string;
  title: string;
  category: string;
  score: number;
  color: string;
  glowColor: string;
  icon: string;
  angle: number; // in radians
  distance: number; // 0 to 1 radius percentage
  speed: number;
  detail: string;
  actionText: string;
}

type AnimationMode = 'radar' | 'robot' | 'pipeline';

export const MailBot3D: React.FC<{ onExplore?: () => void }> = ({ onExplore }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State
  const [activeMode, setActiveMode] = useState<AnimationMode>('radar');
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5, rawX: 0, rawY: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [selectedNode, setSelectedNode] = useState<RadarMailNode | null>(null);
  const [triagedCount, setTriagedCount] = useState(18);
  const [isScanning, setIsScanning] = useState(true);
  const [robotEmotion, setRobotEmotion] = useState<'friendly' | 'scanning' | 'excited' | 'wink'>('friendly');
  const [laserTarget, setLaserTarget] = useState<{ x: number; y: number } | null>(null);

  // Radar Email Nodes
  const [nodes, setNodes] = useState<RadarMailNode[]>([
    {
      id: 'hotspot-1',
      title: 'Interview Loop Invitation',
      category: 'Career Hotspot',
      score: 99,
      color: '#F43F5E',
      glowColor: 'rgba(244,63,94,0.6)',
      icon: '🔥',
      angle: 0.8,
      distance: 0.65,
      speed: 0.008,
      detail: 'Google Final Round • 24h Deadline to accept slot',
      actionText: 'Auto-Scheduled to Calendar',
    },
    {
      id: 'career-2',
      title: 'Stripe Staff SWE Offer Letter',
      category: 'Career & Offer',
      score: 96,
      color: '#38BDF8',
      glowColor: 'rgba(56,189,248,0.6)',
      icon: '💼',
      angle: 2.4,
      distance: 0.75,
      speed: 0.006,
      detail: 'Compensation & Equity breakdown attached',
      actionText: 'High Priority Highlighted',
    },
    {
      id: 'otp-3',
      title: 'AWS Production Auth Code',
      category: 'Security OTP',
      score: 92,
      color: '#F59E0B',
      glowColor: 'rgba(245,158,11,0.6)',
      icon: '🔐',
      angle: 4.1,
      distance: 0.55,
      speed: 0.009,
      detail: 'Verification Code: 849-201 (Expires in 5 mins)',
      actionText: 'Auto-Extracted OTP',
    },
    {
      id: 'task-4',
      title: 'Quarterly Infrastructure Review',
      category: 'Action Task',
      score: 88,
      color: '#10B981',
      glowColor: 'rgba(16,185,129,0.6)',
      icon: '⚡',
      angle: 5.3,
      distance: 0.7,
      speed: 0.007,
      detail: 'Due Friday: 3 actionable deliverables extracted',
      actionText: 'Kanban Card Created',
    },
    {
      id: 'telegram-5',
      title: 'Telegram: Meta Campus Drive',
      category: 'Telegram Ingest',
      score: 94,
      color: '#A855F7',
      glowColor: 'rgba(168,85,247,0.6)',
      icon: '✈️',
      angle: 3.5,
      distance: 0.82,
      speed: 0.005,
      detail: 'Direct ATS Career Link bypassed & verified',
      actionText: 'Scraped & Verified',
    },
  ]);

  // Particles system
  const particlesRef = useRef<Particle[]>([]);
  const radarSweepAngleRef = useRef(0);
  const animFrameIdRef = useRef<number | null>(null);

  // Mouse move handler for smooth parallax tilt
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const x = rawX / rect.width;
    const y = rawY / rect.height;
    setMousePos({ x, y, rawX, rawY });
  }, []);

  // Spawn particle bursts
  const spawnBlast = useCallback((x: number, y: number, count = 24, color = '#F59E0B') => {
    const symbols = ['✦', '★', '✧', '•', '✨', '⚡'];
    const colors = ['#F59E0B', '#38BDF8', '#F43F5E', '#10B981', '#C084FC', '#FFFFFF'];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      particlesRef.current.push({
        id: Math.random(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 0,
        maxLife: 30 + Math.random() * 30,
        symbol: Math.random() > 0.4 ? symbols[Math.floor(Math.random() * symbols.length)] : undefined,
      });
    }
  }, []);

  // Click on radar canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Check if clicked near any node
    const maxRadius = Math.min(centerX, centerY) * 0.88;
    let clickedNode: RadarMailNode | null = null;

    nodes.forEach((node) => {
      const nodeX = centerX + Math.cos(node.angle) * (node.distance * maxRadius);
      const nodeY = centerY + Math.sin(node.angle) * (node.distance * maxRadius);
      const dist = Math.hypot(clickX - nodeX, clickY - nodeY);
      if (dist < 28) {
        clickedNode = node;
      }
    });

    if (clickedNode) {
      setSelectedNode(clickedNode);
      spawnBlast(clickX, clickY, 30, (clickedNode as RadarMailNode).color);
      setTriagedCount((prev) => prev + 1);
      setRobotEmotion('excited');
      setTimeout(() => setRobotEmotion('friendly'), 2000);
    } else {
      spawnBlast(clickX, clickY, 18, '#F59E0B');
      setTriagedCount((prev) => prev + 1);
      setRobotEmotion('wink');
      setTimeout(() => setRobotEmotion('friendly'), 1500);
    }
  };

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 460);
    let height = (canvas.height = 320);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const maxRadius = Math.min(centerX, centerY) * 0.86;

      // 1. Draw Holographic Radar Background Grid Rings
      ctx.save();
      for (let r = 0.25; r <= 1.0; r += 0.25) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius * r, 0, Math.PI * 2);
        ctx.strokeStyle = r === 1.0 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(147, 51, 234, 0.15)';
        ctx.lineWidth = r === 1.0 ? 1.5 : 1;
        ctx.setLineDash(r === 0.75 ? [4, 6] : []);
        ctx.stroke();
      }

      // Crosshairs
      ctx.setLineDash([2, 4]);
      ctx.strokeStyle = 'rgba(147, 51, 234, 0.18)';
      ctx.beginPath();
      ctx.moveTo(centerX - maxRadius, centerY);
      ctx.lineTo(centerX + maxRadius, centerY);
      ctx.moveTo(centerX, centerY - maxRadius);
      ctx.lineTo(centerX, centerY + maxRadius);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 2. Radar Sweep Beam (Rotating Sonar Scan)
      radarSweepAngleRef.current += 0.025;
      const sweepAngle = radarSweepAngleRef.current;

      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
      gradient.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
      gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.12)');
      gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, maxRadius, sweepAngle - 0.45, sweepAngle);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Leading Sweep Laser Line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(sweepAngle) * maxRadius,
        centerY + Math.sin(sweepAngle) * maxRadius
      );
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.restore();

      // 3. Update and Draw Orbital Nodes
      setNodes((prevNodes) =>
        prevNodes.map((node) => ({
          ...node,
          angle: (node.angle + node.speed) % (Math.PI * 2),
        }))
      );

      nodes.forEach((node) => {
        const nx = centerX + Math.cos(node.angle) * (node.distance * maxRadius);
        const ny = centerY + Math.sin(node.angle) * (node.distance * maxRadius);

        // Ambient Beam connecting core to node
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = node.glowColor.replace('0.6', '0.15');
        ctx.lineWidth = 1;
        ctx.stroke();

        // Node Glow Ring
        ctx.beginPath();
        ctx.arc(nx, ny, 16, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 18, 30, 0.85)';
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 14;
        ctx.fill();

        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Icon / Emoji inside node
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur = 0;
        ctx.fillText(node.icon, nx, ny + 1);

        // Priority Score Pill
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = node.color;
        ctx.fillText(`${node.score}%`, nx, ny + 24);

        ctx.restore();
      });

      // 4. Center Core Pulse (Mail Hinge AI Processing Reactor)
      ctx.save();
      const corePulse = Math.sin(Date.now() * 0.005) * 4;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 22 + corePulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 24;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#0F121E';
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#FDE047';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('AI', centerX, centerY);
      ctx.restore();

      // 5. Update & Draw Particles (Stardust / Sparkles)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;
        p.life++;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        if (p.alpha <= 0 || p.life >= p.maxLife) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;

        if (p.symbol) {
          ctx.font = `${p.size * 2}px sans-serif`;
          ctx.fillText(p.symbol, p.x, p.y);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 320;
    };

    window.addEventListener('resize', handleResize);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [nodes]);

  // Periodic automatic stardust
  useEffect(() => {
    const timer = setInterval(() => {
      if (canvasRef.current) {
        const w = canvasRef.current.width;
        const h = canvasRef.current.height;
        spawnBlast(w / 2 + (Math.random() * 80 - 40), h / 2 + (Math.random() * 80 - 40), 4);
      }
    }, 1800);
    return () => clearInterval(timer);
  }, [spawnBlast]);

  // Parallax 3D Card Style
  const cardTransform = useMemo(() => {
    if (!isHovered) return 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
    const tiltX = (mousePos.y - 0.5) * -12;
    const tiltY = (mousePos.x - 0.5) * 12;
    return `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
  }, [isHovered, mousePos]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setMousePos({ x: 0.5, y: 0.5, rawX: 0, rawY: 0 });
      }}
      className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-b from-[#131122]/90 via-[#0E0C1B]/95 to-[#080712] border border-purple-500/30 shadow-[0_20px_50px_-15px_rgba(147,51,234,0.35)] transition-transform duration-300 ease-out select-none"
      style={{
        transform: cardTransform,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Top Floating Controls HUD */}
      <div className="relative z-20 px-5 pt-4 pb-2 flex items-center justify-between border-b border-purple-500/20 bg-[#161228]/60 backdrop-blur-md">
        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-purple-950/50 rounded-xl border border-purple-500/30">
          <button
            onClick={() => setActiveMode('radar')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeMode === 'radar'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>3D Radar</span>
          </button>

          <button
            onClick={() => setActiveMode('robot')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeMode === 'robot'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Mailo Bot</span>
          </button>

          <button
            onClick={() => setActiveMode('pipeline')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeMode === 'pipeline'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                : 'text-purple-300 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Live Stream</span>
          </button>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>60 FPS Active</span>
          </div>
          <button
            onClick={() => {
              if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                spawnBlast(rect.width / 2, 160, 40, '#F59E0B');
              }
              setTriagedCount((c) => c + 3);
            }}
            className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs transition-all active:scale-95"
            title="Trigger AI Particle Scan"
          >
            <Sparkles className="w-4 h-4 animate-spin" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODE 1: 3D HOLOGRAPHIC RADAR CANVAS                      */}
      {/* ========================================================= */}
      {activeMode === 'radar' && (
        <div className="relative w-full h-[320px] overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="w-full h-full cursor-crosshair relative z-10"
          />

          {/* Interactive Tooltip Card for Selected Radar Node */}
          {selectedNode && (
            <div className="absolute top-4 inset-x-6 z-30 animate-scale-in-spring">
              <div className="p-3.5 rounded-2xl bg-[#16122B]/95 border border-purple-500/40 shadow-2xl backdrop-blur-xl flex items-center justify-between text-left">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                    style={{ backgroundColor: `${selectedNode.color}20`, border: `1px solid ${selectedNode.color}` }}
                  >
                    {selectedNode.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white tracking-tight">{selectedNode.title}</span>
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold"
                        style={{ backgroundColor: `${selectedNode.color}25`, color: selectedNode.color }}
                      >
                        {selectedNode.score}/100 Priority
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300/80 mt-0.5">{selectedNode.detail}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs text-white transition-all"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Bottom Interactive Click Tip */}
          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center pointer-events-none z-20">
            <div className="px-3.5 py-1.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-[11px] font-mono text-purple-200/90 backdrop-blur-md flex items-center gap-2 shadow-lg">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              <span>Click any orbital node or tap radar to triage</span>
              <span className="text-amber-300 font-bold">({triagedCount} processed)</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 2: 🤖 CYBER BOT MAILO 2.0 (Glassmorphic 3D Assistant)*/}
      {/* ========================================================= */}
      {activeMode === 'robot' && (
        <div className="relative w-full h-[320px] p-6 flex flex-col items-center justify-center overflow-hidden">
          {/* Cyber grid background */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:20px_20px]" />

          {/* 3D Flying Robot */}
          <div
            className="relative cursor-pointer transition-transform duration-200"
            style={{
              transform: `translate(${(mousePos.x - 0.5) * 50}px, ${(mousePos.y - 0.5) * 35}px) rotateY(${
                (mousePos.x - 0.5) * 28
              }deg) rotateX(${(mousePos.y - 0.5) * -20}deg)`,
              transformStyle: 'preserve-3d',
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              spawnBlast(rect.left + rect.width / 2, rect.top + rect.height / 2, 35, '#38BDF8');
              setTriagedCount((c) => c + 1);
              setRobotEmotion(robotEmotion === 'friendly' ? 'excited' : 'friendly');
            }}
          >
            {/* Ambient Bot Glow Aura */}
            <div className="absolute -inset-6 bg-gradient-to-tr from-amber-500/30 via-purple-600/40 to-cyan-400/30 rounded-full blur-2xl opacity-90 animate-pulse" />

            {/* Robot Head Frame */}
            <div className="relative w-28 h-24 rounded-[32px] bg-gradient-to-b from-[#2E234D] via-[#1E1736] to-[#120E24] border-2 border-purple-400/60 shadow-[0_15px_35px_-5px_rgba(168,85,247,0.5)] p-2.5 flex flex-col justify-between items-center group">
              {/* Antenna with Glowing Gem */}
              <div className="absolute -top-5 flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-400 to-white border-2 border-amber-300 shadow-[0_0_18px_#F59E0B] flex items-center justify-center animate-bounce-subtle">
                  <span className="text-[9px] text-amber-950 font-black">✦</span>
                </div>
                <div className="w-1.5 h-2.5 bg-gradient-to-b from-amber-400 to-purple-500 rounded-full" />
              </div>

              {/* Side Cyber Ears */}
              <div className="absolute -left-3 top-6 w-3 h-8 rounded-l-xl bg-gradient-to-b from-amber-400 to-purple-600 border border-purple-300/40 shadow-[0_0_10px_rgba(245,158,11,0.4)]" />
              <div className="absolute -right-3 top-6 w-3 h-8 rounded-r-xl bg-gradient-to-b from-amber-400 to-purple-600 border border-purple-300/40 shadow-[0_0_10px_rgba(245,158,11,0.4)]" />

              {/* Visor Screen */}
              <div className="w-full h-12 rounded-2xl bg-[#06050E] border border-purple-400/40 p-1 flex items-center justify-around overflow-hidden shadow-inner relative">
                {/* Shimmer sweep */}
                <div className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent animate-shimmer" />

                {/* Left Eye */}
                <div className="w-5 h-5 rounded-full bg-cyan-400/20 border border-cyan-400 flex items-center justify-center shadow-[0_0_12px_#38BDF8]">
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-cyan-300 transition-transform duration-100"
                    style={{
                      transform: `translate(${(mousePos.x - 0.5) * 4}px, ${(mousePos.y - 0.5) * 4}px)`,
                    }}
                  />
                </div>

                {/* Audio Equalizer Spectrum */}
                <div className="flex items-center gap-1 h-3">
                  <span className="w-1 h-3 bg-amber-400 rounded-full animate-pulse" />
                  <span className="w-1 h-4 bg-cyan-400 rounded-full animate-bounce-subtle" />
                  <span className="w-1 h-2.5 bg-purple-400 rounded-full animate-pulse" />
                </div>

                {/* Right Eye */}
                <div className="w-5 h-5 rounded-full bg-cyan-400/20 border border-cyan-400 flex items-center justify-center shadow-[0_0_12px_#38BDF8]">
                  <div
                    className="w-2.5 h-2.5 rounded-full bg-cyan-300 transition-transform duration-100"
                    style={{
                      transform: `translate(${(mousePos.x - 0.5) * 4}px, ${(mousePos.y - 0.5) * 4}px)`,
                    }}
                  />
                </div>
              </div>

              {/* Bottom Thrusters */}
              <div className="absolute -bottom-3.5 flex items-center gap-2.5">
                <div className="w-3 h-5 rounded-b-full bg-gradient-to-b from-amber-400 via-purple-500 to-transparent shadow-[0_0_14px_#F59E0B] animate-pulse" />
                <div className="w-3 h-5 rounded-b-full bg-gradient-to-b from-cyan-400 via-purple-500 to-transparent shadow-[0_0_14px_#38BDF8] animate-pulse" />
              </div>

              {/* Bot Tag */}
              <div className="flex items-center gap-1.5 text-[9px] font-mono text-amber-300 font-bold">
                <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />
                <span>Mailo AI 2.0</span>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <div className="text-xs font-semibold text-white">Click Mailo to interact & trigger AI stardust sorting</div>
            <div className="text-[11px] text-purple-300/70 font-mono mt-0.5">Move your cursor to guide his eyes & 3D head</div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 3: ⚡ LIVE STREAM INGESTION PIPELINE                 */}
      {/* ========================================================= */}
      {activeMode === 'pipeline' && (
        <div className="relative w-full h-[320px] p-6 flex flex-col justify-between overflow-hidden">
          <div className="grid grid-cols-3 gap-3 relative z-10">
            {/* Input Sources */}
            <div className="p-3 rounded-2xl bg-[#17122E]/80 border border-blue-500/30 text-left">
              <div className="text-[10px] font-mono uppercase text-blue-400 font-bold mb-1 flex items-center gap-1">
                <Radio className="w-3 h-3" /> Multi-Source
              </div>
              <div className="text-xs font-bold text-white">Gmail • Telegram • Outlook</div>
              <div className="text-[10px] text-slate-400 mt-1">Direct IMAP & Webhook live ingestion</div>
            </div>

            {/* Neural Priority Core */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-center shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <div className="text-[10px] font-mono uppercase text-amber-400 font-bold mb-1 flex items-center justify-center gap-1">
                <Cpu className="w-3 h-3 animate-spin" /> Claude / Gemini 3.7
              </div>
              <div className="text-xs font-black text-amber-300">Priority Engine</div>
              <div className="text-[10px] text-amber-200/70 mt-1">Real-time urgency scoring & action tags</div>
            </div>

            {/* Action Targets */}
            <div className="p-3 rounded-2xl bg-[#17122E]/80 border border-emerald-500/30 text-right">
              <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold mb-1 flex items-center justify-end gap-1">
                <CheckSquare className="w-3 h-3" /> Action Output
              </div>
              <div className="text-xs font-bold text-white">Kanban & Calendar</div>
              <div className="text-[10px] text-slate-400 mt-1">Deadlines extracted & tasks scheduled</div>
            </div>
          </div>

          {/* Animated Flow Track */}
          <div className="relative my-4 flex items-center justify-between px-6">
            <div className="w-full h-1.5 bg-gradient-to-r from-blue-500 via-amber-400 to-emerald-400 rounded-full relative overflow-hidden">
              <div className="absolute inset-0 bg-white/40 animate-shimmer" />
            </div>
          </div>

          {/* Bottom Live Metrics */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="p-2 rounded-xl bg-black/40 border border-white/10">
              <div className="text-slate-400 text-[10px]">Processing Latency</div>
              <div className="text-emerald-400 font-bold text-sm">0.038s</div>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-white/10">
              <div className="text-slate-400 text-[10px]">Triaged This Session</div>
              <div className="text-amber-400 font-bold text-sm">{triagedCount} emails</div>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-white/10">
              <div className="text-slate-400 text-[10px]">Accuracy Confidence</div>
              <div className="text-cyan-400 font-bold text-sm">99.8%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
