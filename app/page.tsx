"use client";

import { useState, useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { motion, AnimatePresence } from "motion/react";
import {
  Copy,
  HelpCircle,
  Swords,
  Users,
  Play,
  RotateCcw,
  Home,
} from "lucide-react";

type Screen = "home" | "lobby" | "game" | "end";

export default function GameApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [roomId, setRoomId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [gameState, setGameState] = useState<any>(null);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [ping, setPing] = useState(0);

  useEffect(() => {
    const s = getSocket();

    s.on("connect", () => {
      console.log("Connected to server");
    });

    s.on("room_created", (id: string) => {
      setRoomId(id);
      setScreen("lobby");
    });

    s.on("match_started", (state: any) => {
      setGameState(state);
      setScreen("game");
    });

    s.on("state_update", (state: any) => {
      setGameState(state);
      if (state.status === "ended") {
        setScreen("end");
      }
    });

    s.on("error", (msg: string) => {
      setError(msg);
      setTimeout(() => setError(""), 3000);
    });

    s.on("player_disconnected", (msg: string) => {
      setError(msg);
      setScreen("end");
    });

    // Ping calculation
    const pingInterval = setInterval(() => {
      const start = Date.now();
      s.emit("ping", () => {
        setPing(Date.now() - start);
      });
    }, 2000);

    return () => {
      s.off("connect");
      s.off("room_created");
      s.off("match_started");
      s.off("state_update");
      s.off("error");
      s.off("player_disconnected");
      clearInterval(pingInterval);
    };
  }, []);

  const createRoom = () => {
    const s = getSocket();
    if (s) s.emit("create_room");
  };

  const joinRoom = () => {
    const s = getSocket();
    if (s && joinCode.length === 6) {
      s.emit("join_room", joinCode.toUpperCase());
    } else if (!s) {
      setError("Conectando ao servidor...");
    } else {
      setError("Código inválido. Deve ter 6 caracteres.");
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomId);
  };

  const rematch = () => {
    const s = getSocket();
    if (s) s.emit("rematch", gameState?.id);
  };

  const goHome = () => {
    setScreen("home");
    setRoomId("");
    setJoinCode("");
    setGameState(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col items-center justify-center overflow-hidden relative">
      {/* Neon Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-20" />

      <AnimatePresence mode="wait">
        {screen === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center z-10 space-y-8"
          >
            <div className="text-center space-y-2">
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-500 drop-shadow-[0_0_15px_rgba(217,70,239,0.5)] uppercase italic">
                Neon Vendetta
              </h1>
              <p className="text-zinc-400 text-lg md:text-xl tracking-widest uppercase font-mono">
                Um tiro. Uma morte.
              </p>
            </div>

            <div className="flex flex-col gap-4 w-full max-w-xs">
              <button
                onClick={createRoom}
                className="group relative px-6 py-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                <Swords className="w-5 h-5" />
                Criar Partida
              </button>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="CÓDIGO"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-center font-mono text-xl uppercase focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
                <button
                  onClick={joinRoom}
                  className="px-4 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all flex items-center justify-center"
                >
                  <Play className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={() => setShowHowToPlay(true)}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <HelpCircle className="w-5 h-5" />
                Como Jogar
              </button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500 font-mono bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20"
              >
                {error}
              </motion.div>
            )}
          </motion.div>
        )}

        {screen === "lobby" && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="flex flex-col items-center z-10 bg-zinc-900/80 p-12 rounded-3xl border border-zinc-800 backdrop-blur-sm shadow-2xl"
          >
            <Users className="w-16 h-16 text-cyan-500 mb-6" />
            <h2 className="text-3xl font-bold mb-2">Sala Criada</h2>
            <p className="text-zinc-400 mb-8 text-center max-w-xs">
              Compartilhe o código abaixo com seu oponente para iniciar a
              partida.
            </p>

            <div className="flex items-center gap-4 mb-8 bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
              <span className="text-5xl font-mono font-bold tracking-widest text-fuchsia-500">
                {roomId}
              </span>
              <button
                onClick={copyCode}
                className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
                title="Copiar Código"
              >
                <Copy className="w-6 h-6 text-zinc-300" />
              </button>
            </div>

            <div className="flex items-center gap-3 text-zinc-400 animate-pulse">
              <div className="w-2 h-2 bg-cyan-500 rounded-full" />
              <span>Aguardando outro jogador...</span>
            </div>
          </motion.div>
        )}

        {screen === "game" && gameState && (
          <GameArena gameState={gameState} socket={getSocket()} ping={ping} />
        )}

        {screen === "end" && gameState && (
          <motion.div
            key="end"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center z-10 bg-zinc-900 p-12 rounded-3xl border border-zinc-800 shadow-2xl"
          >
            <h2 className="text-5xl font-black italic uppercase mb-2 text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-500 to-cyan-500">
              {gameState.winner === getSocket()?.id ? "Vitória" : "Derrota"}
            </h2>
            <p className="text-zinc-400 font-mono mb-8">
              {gameState.winner?.includes("W.O")
                ? "Oponente desconectou."
                : "A carnificina acabou."}
            </p>

            <div className="grid grid-cols-2 gap-8 mb-10 w-full max-w-md">
              <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 text-center">
                <div className="text-zinc-500 text-sm uppercase tracking-wider mb-1">
                  Suas Kills
                </div>
                <div className="text-4xl font-bold text-cyan-500">
                  {gameState.players[getSocket()?.id as string]?.kills || 0}
                </div>
              </div>
              <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 text-center">
                <div className="text-zinc-500 text-sm uppercase tracking-wider mb-1">
                  Mortes
                </div>
                <div className="text-4xl font-bold text-fuchsia-500">
                  {gameState.players[getSocket()?.id as string]?.deaths || 0}
                </div>
              </div>
            </div>

            <div className="flex gap-4 w-full">
              <button
                onClick={rematch}
                className="flex-1 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Revanche
              </button>
              <button
                onClick={goHome}
                className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                Menu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How to Play Modal */}
      <AnimatePresence>
        {showHowToPlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowHowToPlay(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold mb-6 text-fuchsia-500">
                Como Jogar
              </h3>

              <div className="space-y-6">
                <div>
                  <h4 className="text-zinc-400 uppercase text-sm font-bold tracking-wider mb-2">
                    Objetivo
                  </h4>
                  <p className="text-zinc-300">
                    O primeiro a alcançar 10 eliminações vence. Um tiro é letal.
                  </p>
                </div>

                <div>
                  <h4 className="text-zinc-400 uppercase text-sm font-bold tracking-wider mb-2">
                    Controles
                  </h4>
                  <ul className="space-y-2 text-zinc-300">
                    <li>
                      <kbd className="bg-zinc-800 px-2 py-1 rounded text-cyan-400 font-mono text-sm">
                        W A S D
                      </kbd>{" "}
                      - Mover
                    </li>
                    <li>
                      <kbd className="bg-zinc-800 px-2 py-1 rounded text-cyan-400 font-mono text-sm">
                        Mouse
                      </kbd>{" "}
                      - Mirar
                    </li>
                    <li>
                      <kbd className="bg-zinc-800 px-2 py-1 rounded text-cyan-400 font-mono text-sm">
                        Click Esq.
                      </kbd>{" "}
                      - Atirar
                    </li>
                    <li>
                      <kbd className="bg-zinc-800 px-2 py-1 rounded text-cyan-400 font-mono text-sm">
                        Shift
                      </kbd>{" "}
                      - Dash (Esquiva)
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-zinc-400 uppercase text-sm font-bold tracking-wider mb-2">
                    Dicas
                  </h4>
                  <p className="text-zinc-300 text-sm">
                    Você fica invencível por 1 segundo ao renascer. Use o dash
                    para escapar de tiros, mas cuidado com o tempo de recarga!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowHowToPlay(false)}
                className="w-full mt-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all"
              >
                Entendi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Game Arena Component ---
function GameArena({
  gameState,
  socket,
  ping,
}: {
  gameState: any;
  socket: any;
  ping: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hitFlash, setHitFlash] = useState(false);
  const [shake, setShake] = useState(0);

  // Input state
  const keys = useRef({ w: false, a: false, s: false, d: false, shift: false });
  const mouse = useRef({ x: 0, y: 0, down: false });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W") keys.current.w = true;
      if (e.key === "a" || e.key === "A") keys.current.a = true;
      if (e.key === "s" || e.key === "S") keys.current.s = true;
      if (e.key === "d" || e.key === "D") keys.current.d = true;
      if (e.key === "Shift") keys.current.shift = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W") keys.current.w = false;
      if (e.key === "a" || e.key === "A") keys.current.a = false;
      if (e.key === "s" || e.key === "S") keys.current.s = false;
      if (e.key === "d" || e.key === "D") keys.current.d = false;
      if (e.key === "Shift") keys.current.shift = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    socket.on(
      "player_hit",
      ({ victim, killer }: { victim: string; killer: string }) => {
        if (victim === socket.id) {
          setHitFlash(true);
          setTimeout(() => setHitFlash(false), 100);
        }
        if (killer === socket.id || victim === socket.id) {
          setShake(10);
        }
      },
    );
    return () => socket.off("player_hit");
  }, [socket]);

  useEffect(() => {
    if (shake > 0) {
      const timer = setTimeout(() => setShake((s) => Math.max(0, s - 1)), 16);
      return () => clearTimeout(timer);
    }
  }, [shake]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Input loop
    const inputInterval = setInterval(() => {
      // Convert mouse coordinates to canvas relative
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const canvasMouseX = (mouse.current.x - rect.left) * scaleX;
      const canvasMouseY = (mouse.current.y - rect.top) * scaleY;

      socket.emit("input", gameState.id, {
        up: keys.current.w,
        down: keys.current.s,
        left: keys.current.a,
        right: keys.current.d,
        mouseX: canvasMouseX,
        mouseY: canvasMouseY,
        dash: keys.current.shift,
        shoot: mouse.current.down,
      });

      // Reset one-time inputs
      keys.current.shift = false;
    }, 1000 / 60);

    // Render loop
    let animationFrameId: number;
    const render = () => {
      // Clear
      ctx.fillStyle = "#09090b"; // zinc-950
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Grid
      ctx.strokeStyle = "#27272a"; // zinc-800
      ctx.lineWidth = 1;
      for (let x = 0; x <= canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Obstacles
      const OBSTACLES = [
        { x: 300, y: 150, width: 200, height: 40 },
        { x: 300, y: 410, width: 200, height: 40 },
        { x: 150, y: 250, width: 40, height: 100 },
        { x: 610, y: 250, width: 40, height: 100 },
      ];
      ctx.fillStyle = "#18181b"; // zinc-900
      ctx.strokeStyle = "#3f3f46"; // zinc-700
      ctx.lineWidth = 2;
      OBSTACLES.forEach((obs) => {
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
      });

      // Draw Weapons
      gameState.weapons.forEach((w: any) => {
        if (w.active) {
          ctx.fillStyle = w.type === "shotgun" ? "#ef4444" : "#eab308"; // red for shotgun, yellow for melee
          ctx.shadowBlur = 10;
          ctx.shadowColor = ctx.fillStyle;
          ctx.beginPath();
          ctx.arc(w.x, w.y, 8, 0, Math.PI * 2);
          ctx.fill();

          // Weapon icon/text
          ctx.fillStyle = "#fff";
          ctx.font = "10px monospace";
          ctx.textAlign = "center";
          ctx.fillText(w.type === "shotgun" ? "S" : "M", w.x, w.y + 3);
          ctx.shadowBlur = 0;
        }
      });

      // Draw Projectiles
      gameState.projectiles.forEach((p: any) => {
        if (p.type === "melee") {
          ctx.fillStyle = "rgba(234, 179, 8, 0.5)"; // yellow transparent
          ctx.beginPath();
          ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = p.type === "shotgun" ? "#ef4444" : "#fff";
          ctx.shadowBlur = 10;
          ctx.shadowColor = ctx.fillStyle;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.type === "shotgun" ? 4 : 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0; // reset
        }
      });

      // Draw Players
      Object.values(gameState.players).forEach((p: any) => {
        if (p.health <= 0) return; // Dead

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);

        // Invincibility blink
        if (p.invincibilityTimer > 0) {
          ctx.globalAlpha = Math.sin(Date.now() / 50) > 0 ? 1 : 0.3;
        }

        // Dash trail
        if (p.dashTimer > 0) {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.arc(-20, 0, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(-40, 0, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Body
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        // Direction indicator / Weapon
        ctx.fillStyle = "#fff";
        if (p.weapon === "pistol") {
          ctx.fillRect(10, -2, 12, 4);
        } else if (p.weapon === "shotgun") {
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(10, -3, 18, 6);
        } else if (p.weapon === "melee") {
          ctx.fillStyle = "#eab308";
          ctx.fillRect(10, -1, 20, 2);
        }

        ctx.restore();

        // Draw Name / HP bar above
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(p.id === socket.id ? "VOCÊ" : "INIMIGO", p.x, p.y - 25);
      });

      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      clearInterval(inputInterval);
      cancelAnimationFrame(animationFrameId);
    };
  }, [gameState, socket]);

  const handleMouseMove = (e: React.MouseEvent) => {
    mouse.current.x = e.clientX;
    mouse.current.y = e.clientY;
  };

  const handleMouseDown = () => (mouse.current.down = true);
  const handleMouseUp = () => (mouse.current.down = false);

  // Find players
  const me = gameState.players[socket.id];
  const opponent = Object.values(gameState.players).find(
    (p: any) => p.id !== socket.id,
  ) as any;

  return (
    <motion.div
      key="game"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col items-center justify-center relative"
    >
      {/* HUD */}
      <div className="absolute top-6 left-0 w-full px-8 flex justify-between items-start z-10 pointer-events-none">
        <div className="flex flex-col gap-2">
          <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 px-6 py-3 rounded-2xl flex items-center gap-6 shadow-lg">
            <div className="flex flex-col items-center">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                Você
              </span>
              <span className="text-3xl font-black text-cyan-500">
                {me?.kills || 0}
              </span>
            </div>
            <div className="text-zinc-600 font-black text-2xl italic">VS</div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
                Inimigo
              </span>
              <span className="text-3xl font-black text-fuchsia-500">
                {opponent?.kills || 0}
              </span>
            </div>
          </div>
          <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 flex items-center gap-2 w-fit">
            <div
              className={`w-2 h-2 rounded-full ${ping < 50 ? "bg-green-500" : ping < 100 ? "bg-yellow-500" : "bg-red-500"}`}
            />
            {ping} ms
          </div>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 px-6 py-3 rounded-2xl shadow-lg flex flex-col items-end">
          <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
            Tempo
          </span>
          <span className="text-2xl font-mono text-zinc-300">
            {Math.floor(gameState.matchTime / 60)
              .toString()
              .padStart(2, "0")}
            :
            {Math.floor(gameState.matchTime % 60)
              .toString()
              .padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* Hit Flash Overlay */}
      <div
        className={`absolute inset-0 bg-red-500/30 pointer-events-none transition-opacity duration-100 z-20 ${hitFlash ? "opacity-100" : "opacity-0"}`}
      />

      {/* Game Canvas */}
      <div className="relative rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border-2 border-zinc-800">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="bg-zinc-950 cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Respawn Overlay */}
        {me?.respawnTimer > 0 && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
            <span className="text-red-500 font-black text-4xl uppercase italic mb-2">
              Eliminado
            </span>
            <span className="text-zinc-300 font-mono">
              Renasce em {Math.ceil(me.respawnTimer)}s
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
