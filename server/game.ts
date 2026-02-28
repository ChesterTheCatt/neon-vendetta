import { Server, Socket } from "socket.io";

const TICK_RATE = 60;
const TICK_INTERVAL = 1000 / TICK_RATE;

// Game Constants
const ARENA_WIDTH = 800;
const ARENA_HEIGHT = 600;
const PLAYER_SPEED = 300; // pixels per second
const DASH_SPEED = 900;
const DASH_DURATION = 0.2; // seconds
const DASH_COOLDOWN = 1.5; // seconds
const RESPAWN_TIME = 2; // seconds
const INVINCIBILITY_TIME = 1; // seconds
const MAX_KILLS = 10;

type WeaponType = "pistol" | "shotgun" | "melee";

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

const OBSTACLES: Obstacle[] = [
  { x: 300, y: 150, width: 200, height: 40 },
  { x: 300, y: 410, width: 200, height: 40 },
  { x: 150, y: 250, width: 40, height: 100 },
  { x: 610, y: 250, width: 40, height: 100 },
];

function checkCollision(x: number, y: number, radius: number): boolean {
  for (const obs of OBSTACLES) {
    // Closest point on rectangle to circle center
    const cx = Math.max(obs.x, Math.min(x, obs.x + obs.width));
    const cy = Math.max(obs.y, Math.min(y, obs.y + obs.height));

    // Distance from closest point to circle center
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < radius * radius) {
      return true;
    }
  }
  return false;
}

function resolveCollision(p: PlayerState) {
  const radius = 15;
  for (const obs of OBSTACLES) {
    const cx = Math.max(obs.x, Math.min(p.x, obs.x + obs.width));
    const cy = Math.max(obs.y, Math.min(p.y, obs.y + obs.height));

    const dx = p.x - cx;
    const dy = p.y - cy;
    const distSq = dx * dx + dy * dy;

    if (distSq < radius * radius && distSq > 0) {
      const dist = Math.sqrt(distSq);
      const overlap = radius - dist;
      p.x += (dx / dist) * overlap;
      p.y += (dy / dist) * overlap;
    }
  }
}

interface PlayerState {
  id: string;
  x: number;
  y: number;
  angle: number;
  health: number;
  weapon: WeaponType;
  dashTimer: number;
  dashCooldownTimer: number;
  respawnTimer: number;
  invincibilityTimer: number;
  kills: number;
  deaths: number;
  isHost: boolean;
  color: string;
  shootCooldown: number;
  input: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    mouseX: number;
    mouseY: number;
    dash: boolean;
    shoot: boolean;
  };
}

interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
  type: WeaponType;
  life: number; // seconds
}

interface WeaponSpawn {
  id: string;
  x: number;
  y: number;
  type: WeaponType;
  cooldown: number;
  active: boolean;
}

const WEAPON_SPAWNS: Omit<WeaponSpawn, "id" | "cooldown" | "active">[] = [
  { x: 400, y: 300, type: "shotgun" },
  { x: 100, y: 100, type: "melee" },
  { x: 700, y: 500, type: "melee" },
];

interface RoomState {
  id: string;
  status: "waiting" | "playing" | "ended";
  players: Record<string, PlayerState>;
  projectiles: Projectile[];
  weapons: WeaponSpawn[];
  winner: string | null;
  matchTime: number;
}

const rooms: Record<string, RoomState> = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function createPlayer(id: string, isHost: boolean): PlayerState {
  return {
    id,
    x: isHost ? 100 : ARENA_WIDTH - 100,
    y: ARENA_HEIGHT / 2,
    angle: 0,
    health: 1,
    weapon: "pistol",
    dashTimer: 0,
    dashCooldownTimer: 0,
    respawnTimer: 0,
    invincibilityTimer: 0,
    kills: 0,
    deaths: 0,
    isHost,
    color: isHost ? "#ff00ff" : "#00ffff", // Neon Pink vs Neon Cyan
    shootCooldown: 0,
    input: {
      up: false,
      down: false,
      left: false,
      right: false,
      mouseX: 0,
      mouseY: 0,
      dash: false,
      shoot: false,
    },
  };
}

export function initGameServer(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log("Client connected:", socket.id);

    socket.on("create_room", () => {
      const roomId = generateRoomCode();
      rooms[roomId] = {
        id: roomId,
        status: "waiting",
        players: {
          [socket.id]: createPlayer(socket.id, true),
        },
        projectiles: [],
        weapons: WEAPON_SPAWNS.map((w, i) => ({
          ...w,
          id: `w_${i}`,
          cooldown: 0,
          active: true,
        })),
        winner: null,
        matchTime: 0,
      };
      socket.join(roomId);
      socket.emit("room_created", roomId);
      socket.emit("state_update", rooms[roomId]);
    });

    socket.on("join_room", (roomId: string) => {
      const room = rooms[roomId];
      if (!room) {
        socket.emit("error", "Sala não encontrada.");
        return;
      }
      if (Object.keys(room.players).length >= 2) {
        socket.emit("error", "Sala cheia.");
        return;
      }

      room.players[socket.id] = createPlayer(socket.id, false);
      socket.join(roomId);
      room.status = "playing";
      io.to(roomId).emit("match_started", room);
    });

    socket.on("input", (roomId: string, input: any) => {
      const room = rooms[roomId];
      if (room && room.players[socket.id]) {
        room.players[socket.id].input = input;
      }
    });

    socket.on("ping", (cb) => {
      if (typeof cb === "function") cb();
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      for (const roomId in rooms) {
        const room = rooms[roomId];
        if (room.players[socket.id]) {
          delete room.players[socket.id];
          if (Object.keys(room.players).length === 0) {
            delete rooms[roomId];
          } else {
            room.status = "ended";
            room.winner = Object.keys(room.players)[0]; // The other player wins by W.O.
            io.to(roomId).emit(
              "player_disconnected",
              "Oponente desconectou. Você venceu por W.O.",
            );
            io.to(roomId).emit("state_update", room);
          }
        }
      }
    });

    socket.on("rematch", (roomId: string) => {
      const room = rooms[roomId];
      if (room && room.status === "ended" && !room.winner?.includes("W.O")) {
        // Reset room state
        room.status = "playing";
        room.projectiles = [];
        room.weapons = WEAPON_SPAWNS.map((w, i) => ({
          ...w,
          id: `w_${i}`,
          cooldown: 0,
          active: true,
        }));
        ((room.winner = null), (room.matchTime = 0));
        let isHost = true;
        for (const pid in room.players) {
          room.players[pid] = createPlayer(pid, isHost);
          isHost = false;
        }
        io.to(roomId).emit("match_started", room);
      }
    });
  });

  // Game Loop
  setInterval(() => {
    const dt = TICK_INTERVAL / 1000;

    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.status !== "playing") continue;

      room.matchTime += dt;

      // Update players
      for (const pid in room.players) {
        const p = room.players[pid];

        if (p.respawnTimer > 0) {
          p.respawnTimer -= dt;
          if (p.respawnTimer <= 0) {
            p.health = 1;
            p.x = p.isHost ? 100 : ARENA_WIDTH - 100;
            p.y = ARENA_HEIGHT / 2;
            p.invincibilityTimer = INVINCIBILITY_TIME;
          }
          continue;
        }

        if (p.invincibilityTimer > 0) {
          p.invincibilityTimer -= dt;
        }

        if (p.dashCooldownTimer > 0) {
          p.dashCooldownTimer -= dt;
        }

        if (p.dashTimer > 0) {
          p.dashTimer -= dt;
          // Dash movement
          p.x += Math.cos(p.angle) * DASH_SPEED * dt;
          p.y += Math.sin(p.angle) * DASH_SPEED * dt;
        } else {
          // Normal movement
          let dx = 0;
          let dy = 0;
          if (p.input.up) dy -= 1;
          if (p.input.down) dy += 1;
          if (p.input.left) dx -= 1;
          if (p.input.right) dx += 1;

          if (dx !== 0 || dy !== 0) {
            const len = Math.sqrt(dx * dx + dy * dy);
            dx /= len;
            dy /= len;
            p.x += dx * PLAYER_SPEED * dt;
            p.y += dy * PLAYER_SPEED * dt;
          }

          // Aiming
          p.angle = Math.atan2(p.input.mouseY - p.y, p.input.mouseX - p.x);

          // Dash trigger
          if (p.input.dash && p.dashCooldownTimer <= 0) {
            p.dashTimer = DASH_DURATION;
            p.dashCooldownTimer = DASH_COOLDOWN;
          }

          // Shooting
          if (p.input.shoot) {
            if (p.shootCooldown <= 0) {
              if (p.weapon === "pistol") {
                room.projectiles.push({
                  id: Math.random().toString(36).substring(2, 9),
                  x: p.x + Math.cos(p.angle) * 20,
                  y: p.y + Math.sin(p.angle) * 20,
                  vx: Math.cos(p.angle) * 800,
                  vy: Math.sin(p.angle) * 800,
                  ownerId: p.id,
                  type: "pistol",
                  life: 2,
                });
                p.shootCooldown = 0.3; // 300ms fire rate
              } else if (p.weapon === "shotgun") {
                for (let i = -2; i <= 2; i++) {
                  const spreadAngle = p.angle + i * 0.15;
                  room.projectiles.push({
                    id: Math.random().toString(36).substring(2, 9),
                    x: p.x + Math.cos(spreadAngle) * 20,
                    y: p.y + Math.sin(spreadAngle) * 20,
                    vx: Math.cos(spreadAngle) * 700,
                    vy: Math.sin(spreadAngle) * 700,
                    ownerId: p.id,
                    type: "shotgun",
                    life: 0.5,
                  });
                }
                p.shootCooldown = 1.0; // 1s fire rate
                p.weapon = "pistol"; // Drop shotgun after 1 shot (or keep it? let's drop it)
              } else if (p.weapon === "melee") {
                room.projectiles.push({
                  id: Math.random().toString(36).substring(2, 9),
                  x: p.x + Math.cos(p.angle) * 25,
                  y: p.y + Math.sin(p.angle) * 25,
                  vx: Math.cos(p.angle) * 100, // Slow moving hitbox
                  vy: Math.sin(p.angle) * 100,
                  ownerId: p.id,
                  type: "melee",
                  life: 0.1, // Very short life
                });
                p.shootCooldown = 0.5;
              }
            }
          }
        }

        if (p.shootCooldown > 0) {
          p.shootCooldown -= dt;
        }

        // Clamp to arena
        p.x = Math.max(20, Math.min(ARENA_WIDTH - 20, p.x));
        p.y = Math.max(20, Math.min(ARENA_HEIGHT - 20, p.y));

        // Resolve obstacle collisions
        resolveCollision(p);

        // Weapon Pickup
        for (const w of room.weapons) {
          if (w.active && p.weapon === "pistol") {
            const dist = Math.hypot(p.x - w.x, p.y - w.y);
            if (dist < 30) {
              p.weapon = w.type;
              w.active = false;
              w.cooldown = 10; // 10 seconds respawn
            }
          }
        }
      }

      // Update weapons
      for (const w of room.weapons) {
        if (!w.active) {
          w.cooldown -= dt;
          if (w.cooldown <= 0) {
            w.active = true;
          }
        }
      }

      // Update projectiles
      for (let i = room.projectiles.length - 1; i >= 0; i--) {
        const proj = room.projectiles[i];
        proj.x += proj.vx * dt;
        proj.y += proj.vy * dt;
        proj.life -= dt;

        let hit = false;

        // Check collision with obstacles
        if (checkCollision(proj.x, proj.y, 3)) {
          hit = true;
        }

        // Check collision with players
        for (const pid in room.players) {
          const p = room.players[pid];
          if (
            p.id !== proj.ownerId &&
            p.health > 0 &&
            p.invincibilityTimer <= 0
          ) {
            const dist = Math.hypot(p.x - proj.x, p.y - proj.y);
            if (dist < 20) {
              // Player radius
              p.health = 0;
              p.deaths++;
              p.respawnTimer = RESPAWN_TIME;
              if (room.players[proj.ownerId]) {
                room.players[proj.ownerId].kills++;
                if (room.players[proj.ownerId].kills >= MAX_KILLS) {
                  room.status = "ended";
                  room.winner = proj.ownerId;
                }
              }
              hit = true;
              // Emit hit event for screenshake/flash
              io.to(roomId).emit("player_hit", {
                victim: p.id,
                killer: proj.ownerId,
              });
              break;
            }
          }
        }

        if (
          hit ||
          proj.life <= 0 ||
          proj.x < 0 ||
          proj.x > ARENA_WIDTH ||
          proj.y < 0 ||
          proj.y > ARENA_HEIGHT
        ) {
          room.projectiles.splice(i, 1);
        }
      }

      // Broadcast state
      io.to(roomId).emit("state_update", room);
    }
  }, TICK_INTERVAL);
}
