import {
  BALL_R,
  POWER_LABEL,
  SCORE,
  UNIT_KINDS,
  ZONE_LABEL,
  type GameAction,
  type PowerKind,
  type RewardKind,
  type Sfx,
  type UnitKind,
  type ZoneKind,
} from './data'

export type Input = { left: boolean; right: boolean; plunge: boolean }
export const IDLE_INPUT: Input = { left: false, right: false, plunge: false }

export type Circle = { x: number; y: number; r: number }
export type Rect = { x: number; y: number; w: number; h: number }
export type Seg = {
  x1: number
  y1: number
  x2: number
  y2: number
  r?: number
  rest?: number
  kick?: { x: number; y: number; p: number }
}

export const FLIP_L = { px: 88, py: 600, len: 66, rest: 0.58, raised: -0.5 }
export const FLIP_R = { px: 232, py: 600, len: 66, rest: Math.PI - 0.58, raised: Math.PI + 0.5 }

export const BUMPERS: Circle[] = [
  { x: 102, y: 286, r: 21 },
  { x: 156, y: 236, r: 21 },
  { x: 186, y: 312, r: 18 },
]

export const PEGS: Circle[] = [
  { x: 70, y: 150, r: 5 },
  { x: 115, y: 150, r: 5 },
  { x: 160, y: 150, r: 5 },
  { x: 205, y: 138, r: 5 },
  { x: 92, y: 188, r: 5 },
  { x: 138, y: 188, r: 5 },
  { x: 184, y: 176, r: 5 },
  { x: 118, y: 360, r: 5 },
  { x: 168, y: 348, r: 5 },
  { x: 78, y: 470, r: 5 },
  { x: 130, y: 500, r: 5 },
  { x: 188, y: 470, r: 5 },
]

export const POSTS: Circle[] = [
  { x: FLIP_L.px, y: FLIP_L.py, r: 8 },
  { x: FLIP_R.px, y: FLIP_R.py, r: 8 },
]

export const ROLLOVERS: Rect[] = [
  { x: 36, y: 78, w: 58, h: 22 },
  { x: 112, y: 78, w: 50, h: 22 },
  { x: 176, y: 78, w: 46, h: 22 },
]

export const STANDUPS: Rect[] = [
  { x: 228, y: 220, w: 14, h: 34 },
  { x: 228, y: 262, w: 14, h: 34 },
  { x: 228, y: 304, w: 14, h: 34 },
]

export const DROP: Rect = { x: 40, y: 392, w: 16, h: 46 }
export const SPINNER: Circle = { x: 154, y: 408, r: 15 }

export const ZONES: { kind: ZoneKind; x: number; y: number; w: number; h: number }[] = [
  { kind: 'rush', x: 28, y: 120, w: 200, h: 92 },
  { kind: 'aegis', x: 24, y: 370, w: 112, h: 150 },
  { kind: 'fury', x: 206, y: 210, w: 52, h: 150 },
]

export const WALLS: Seg[] = [
  { x1: 18, y1: 42, x2: 308, y2: 42, r: 5, rest: 0.55 },
  { x1: 18, y1: 42, x2: 18, y2: 670, r: 5, rest: 0.4 },
  { x1: 308, y1: 42, x2: 308, y2: 656, r: 5, rest: 0.4 },
  { x1: 258, y1: 656, x2: 308, y2: 656, r: 5, rest: 0.2 },
  { x1: 258, y1: 188, x2: 258, y2: 656, r: 5, rest: 0.35 },
  { x1: 308, y1: 112, x2: 190, y2: 46, r: 6, rest: 0.72 },
  { x1: 250, y1: 210, x2: 250, y2: 520, r: 5, rest: 0.4 },
  { x1: 250, y1: 520, x2: 236, y2: 592, r: 5, rest: 0.35 },
  { x1: 52, y1: 670, x2: 52, y2: 548, r: 4, rest: 0.3 },
  { x1: 52, y1: 548, x2: 92, y2: 608, r: 5, rest: 0.35 },
  { x1: 104, y1: 46, x2: 104, y2: 114, r: 3, rest: 0.45 },
  { x1: 168, y1: 46, x2: 168, y2: 114, r: 3, rest: 0.45 },
  { x1: 58, y1: 500, x2: 118, y2: 558, r: 6, rest: 0.2, kick: { x: 0.62, y: -0.78, p: 980 } },
  { x1: 40, y1: 530, x2: 78, y2: 496, r: 5, rest: 0.3 },
  { x1: 202, y1: 558, x2: 246, y2: 492, r: 6, rest: 0.2, kick: { x: -0.62, y: -0.78, p: 980 } },
  { x1: 228, y1: 496, x2: 252, y2: 528, r: 5, rest: 0.3 },
]

const ORB_SPOTS = [
  { x: 86, y: 210 },
  { x: 200, y: 168 },
  { x: 74, y: 330 },
  { x: 124, y: 452 },
  { x: 196, y: 430 },
  { x: 150, y: 500 },
]

const SUB = 1 / 240

export type Pop = { text: string; x: number; y: number; life: number }

export type BoardSnap = {
  ball: { x: number; y: number } | null
  flipL: number
  flipR: number
  held: boolean
  plunger: number
  combo: number
  charges: number[]
  reload: number
  ballSave: boolean
  doubleLeft: number
  powerups: { p: PowerKind; x: number; y: number }[]
  dropUp: boolean
  standLit: boolean[]
  rollFlash: number[]
  bumperFlash: number[]
  zoneFlash: number[]
  spin: number
  pops: Pop[]
}

type Ball = { x: number; y: number; vx: number; vy: number; r: number }
type Flip = { px: number; py: number; len: number; rest: number; raised: number; angle: number; av: number; pressed: boolean }
type Orb = { p: PowerKind; x: number; y: number }

function pointSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  const l2 = dx * dx + dy * dy
  const t = l2 < 1e-8 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2))
  return { x: x1 + dx * t, y: y1 + dy * t, t }
}

function bounceCircle(ball: Ball, cx: number, cy: number, r: number, rest: number): boolean {
  let dx = ball.x - cx
  let dy = ball.y - cy
  let dist = Math.hypot(dx, dy)
  const min = ball.r + r
  if (dist >= min) return false
  if (dist < 1e-6) {
    dx = 1
    dy = 0
    dist = 1
  }
  const nx = dx / dist
  const ny = dy / dist
  const pen = min - dist
  ball.x += nx * pen
  ball.y += ny * pen
  const vn = ball.vx * nx + ball.vy * ny
  if (vn < 0) {
    ball.vx -= (1 + rest) * vn * nx
    ball.vy -= (1 + rest) * vn * ny
  }
  return true
}

function bounceSeg(
  ball: Ball,
  seg: Seg,
  surface?: { vx: number; vy: number },
): boolean {
  const hit = pointSeg(ball.x, ball.y, seg.x1, seg.y1, seg.x2, seg.y2)
  const rad = seg.r ?? 4
  let dx = ball.x - hit.x
  let dy = ball.y - hit.y
  let dist = Math.hypot(dx, dy)
  const min = ball.r + rad
  if (dist >= min) return false
  if (dist < 1e-6) {
    const sx = seg.x2 - seg.x1
    const sy = seg.y2 - seg.y1
    const sl = Math.hypot(sx, sy) || 1
    dx = -sy / sl
    dy = sx / sl
    dist = 1
  }
  const nx = dx / dist
  const ny = dy / dist
  ball.x += nx * (min - dist)
  ball.y += ny * (min - dist)
  const svx = surface?.vx ?? 0
  const svy = surface?.vy ?? 0
  let rvx = ball.vx - svx
  let rvy = ball.vy - svy
  const vn = rvx * nx + rvy * ny
  if (vn < 0) {
    const rest = seg.rest ?? 0.4
    rvx -= (1 + rest) * vn * nx
    rvy -= (1 + rest) * vn * ny
    const tx = -ny
    const ty = nx
    const vt = rvx * tx + rvy * ty
    rvx -= vt * 0.12 * tx
    rvy -= vt * 0.12 * ty
    ball.vx = rvx + svx
    ball.vy = rvy + svy
  }
  return true
}

function hitRect(ball: Ball, box: Rect, rest: number): boolean {
  const cx = Math.max(box.x, Math.min(ball.x, box.x + box.w))
  const cy = Math.max(box.y, Math.min(ball.y, box.y + box.h))
  let dx = ball.x - cx
  let dy = ball.y - cy
  const d2 = dx * dx + dy * dy
  if (d2 > ball.r * ball.r) return false
  if (d2 < 1e-8) {
    const left = ball.x - box.x
    const right = box.x + box.w - ball.x
    const top = ball.y - box.y
    const bottom = box.y + box.h - ball.y
    const min = Math.min(left, right, top, bottom)
    if (min === left) {
      ball.x = box.x - ball.r
      ball.vx = -Math.abs(ball.vx) * rest
    } else if (min === right) {
      ball.x = box.x + box.w + ball.r
      ball.vx = Math.abs(ball.vx) * rest
    } else if (min === top) {
      ball.y = box.y - ball.r
      ball.vy = -Math.abs(ball.vy) * rest
    } else {
      ball.y = box.y + box.h + ball.r
      ball.vy = Math.abs(ball.vy) * rest
    }
    return true
  }
  const dist = Math.sqrt(d2)
  const nx = dx / dist
  const ny = dy / dist
  const pen = ball.r - dist
  ball.x += nx * pen
  ball.y += ny * pen
  const vn = ball.vx * nx + ball.vy * ny
  if (vn < 0) {
    ball.vx -= (1 + rest) * vn * nx
    ball.vy -= (1 + rest) * vn * ny
  }
  return true
}

function inside(ball: Ball, box: { x: number; y: number; w: number; h: number }): boolean {
  return ball.x >= box.x && ball.x <= box.x + box.w && ball.y >= box.y && ball.y <= box.y + box.h
}

export class Pinball {
  ball: Ball | null = null
  held = true
  plunger = 0
  combo = 0
  pendingFloor = 0
  charges = [0, 0, 0, 0, 0]
  reload = 0
  ballSave = false
  doubleLeft = 0
  powerups: Orb[] = []
  pops: Pop[] = []
  spin = 0
  hits = 0
  drains = 0
  nudges = 0
  summons = 0
  onSound: ((s: Sfx) => void) | null = null
  onAnnounce: ((text: string) => void) | null = null

  private flipL: Flip = { ...FLIP_L, angle: FLIP_L.rest, av: 0, pressed: false }
  private flipR: Flip = { ...FLIP_R, angle: FLIP_R.rest, av: 0, pressed: false }
  private events: GameAction[] = []
  private seq = 1
  private acc = 0
  private charging = false
  private wasLeft = false
  private wasRight = false
  private bumperCd = [0, 0, 0]
  private bumperFlash = [0, 0, 0]
  private standCd = [0, 0, 0]
  private rollLatch = [false, false, false]
  private rollFlash = [0, 0, 0]
  private dropTimer = 0
  private spinCd = 0
  private zoneCd = [0, 0, 0]
  private zoneFlash = [0, 0, 0]
  private slow = 0
  private orbTimer = 4

  constructor() {
    this.spawnHeld()
  }

  reset() {
    this.ball = null
    this.held = true
    this.plunger = 0
    this.combo = 0
    this.pendingFloor = 0
    this.charges = [0, 0, 0, 0, 0]
    this.reload = 0
    this.ballSave = false
    this.doubleLeft = 0
    this.powerups = []
    this.pops = []
    this.spin = 0
    this.events = []
    this.charging = false
    this.bumperCd = [0, 0, 0]
    this.bumperFlash = [0, 0, 0]
    this.standCd = [0, 0, 0]
    this.rollLatch = [false, false, false]
    this.rollFlash = [0, 0, 0]
    this.dropTimer = 0
    this.spinCd = 0
    this.zoneCd = [0, 0, 0]
    this.zoneFlash = [0, 0, 0]
    this.slow = 0
    this.orbTimer = 3 + Math.random() * 4
    this.flipL.angle = FLIP_L.rest
    this.flipR.angle = FLIP_R.rest
    this.spawnHeld()
  }

  pullEvents(): GameAction[] {
    const out = this.events
    this.events = []
    return out
  }

  applyReward(kind: RewardKind) {
    if (kind === 'ballSave') {
      this.ballSave = true
      this.addPop('BALL SAVE', 160, 280)
    } else if (kind === 'comboFloor') {
      this.combo = Math.max(this.combo, 2)
      this.pendingFloor = 2
      this.addPop('COMBO x2', 160, 280)
    } else {
      this.doubleLeft = 20
      this.addPop('DOUBLE', 160, 280)
    }
  }

  spawnGifts(count: number) {
    for (let i = 0; i < count; i++) this.addOrb(true)
    this.addPop('POWERUPS', 160, 240)
  }

  snapshot(): BoardSnap {
    return {
      ball: this.ball ? { x: this.ball.x, y: this.ball.y } : null,
      flipL: this.flipL.angle,
      flipR: this.flipR.angle,
      held: this.held,
      plunger: this.plunger,
      combo: this.combo,
      charges: this.charges.slice(),
      reload: this.reload,
      ballSave: this.ballSave,
      doubleLeft: this.doubleLeft,
      powerups: this.powerups.map((o) => ({ p: o.p, x: o.x, y: o.y })),
      dropUp: this.dropTimer <= 0,
      standLit: this.standCd.map((c) => c <= 0),
      rollFlash: this.rollFlash.slice(),
      bumperFlash: this.bumperFlash.slice(),
      zoneFlash: this.zoneFlash.slice(),
      spin: this.spin,
      pops: this.pops.map((p) => ({ ...p })),
    }
  }

  step(dt: number, input: Input) {
    const frame = Math.min(0.05, Math.max(0, dt))
    this.animate(frame)
    this.controls(frame, input)
    this.acc += frame
    let guard = 0
    while (this.acc >= SUB && guard++ < 16) {
      this.acc -= SUB
      this.integrate(SUB)
    }
    this.maybeSpawnOrb(frame)
  }

  private spawnHeld() {
    this.ball = { x: 283, y: 628, vx: 0, vy: 0, r: BALL_R }
    this.held = true
    this.charging = false
    this.plunger = 0
    this.combo = this.pendingFloor
    this.pendingFloor = 0
    this.slow = 0
  }

  private animate(dt: number) {
    const fade = (arr: number[], rate: number) => {
      for (let i = 0; i < arr.length; i++) arr[i] = Math.max(0, arr[i] - dt * rate)
    }
    fade(this.bumperFlash, 2.4)
    fade(this.rollFlash, 1.6)
    fade(this.zoneFlash, 1.2)
    for (let i = 0; i < 3; i++) {
      this.bumperCd[i] = Math.max(0, this.bumperCd[i] - dt)
      this.standCd[i] = Math.max(0, this.standCd[i] - dt)
    }
    this.spinCd = Math.max(0, this.spinCd - dt)
    this.dropTimer = Math.max(0, this.dropTimer - dt)
    for (let i = 0; i < 3; i++) this.zoneCd[i] = Math.max(0, this.zoneCd[i] - dt)
    if (this.doubleLeft > 0) this.doubleLeft = Math.max(0, this.doubleLeft - dt)
    if (!this.ball) {
      this.reload = Math.max(0, this.reload - dt)
      if (this.reload === 0) this.spawnHeld()
    }
    this.pops = this.pops
      .map((p) => ({ ...p, life: p.life - dt, y: p.y - dt * 28 }))
      .filter((p) => p.life > 0)
      .slice(-5)
    if (this.ball && !this.held) this.spin += Math.hypot(this.ball.vx, this.ball.vy) * dt * 0.01
  }

  private controls(dt: number, input: Input) {
    this.flipL.pressed = input.left
    this.flipR.pressed = input.right
    if (input.left && !this.wasLeft) this.onSound?.('flip')
    if (input.right && !this.wasRight) this.onSound?.('flip')
    this.wasLeft = input.left
    this.wasRight = input.right
    if (this.held && this.ball) {
      if (input.plunge) {
        this.charging = true
        this.plunger = Math.min(1, this.plunger + dt * 0.95)
      } else if (this.charging) {
        this.launch()
      }
    } else if (!input.plunge) {
      this.charging = false
    }
  }

  private launch() {
    if (!this.ball) return
    this.held = false
    this.charging = false
    const power = this.plunger
    this.ball.vy = -820 - power * 760
    this.ball.vx = -70 - Math.random() * 70
    this.plunger = 0
    this.onSound?.('launch')
  }

  private integrate(dt: number) {
    this.moveFlip(this.flipL, dt)
    this.moveFlip(this.flipR, dt)
    const ball = this.ball
    if (!ball) return
    if (this.held) {
      ball.x = 283
      ball.y = 628 - this.plunger * 38
      ball.vx = 0
      ball.vy = 0
      return
    }
    ball.vy += 760 * dt
    const drag = Math.exp(-0.18 * dt)
    ball.vx *= drag
    ball.vy *= drag
    ball.x += ball.vx * dt
    ball.y += ball.vy * dt
    this.collideFlip(ball, this.flipL)
    this.collideFlip(ball, this.flipR)
    for (const seg of WALLS) {
      if (bounceSeg(ball, seg) && seg.kick) {
        ball.vx = seg.kick.x * seg.kick.p
        ball.vy = seg.kick.y * seg.kick.p
      }
    }
    for (const peg of PEGS) bounceCircle(ball, peg.x, peg.y, peg.r, 0.62)
    for (const post of POSTS) bounceCircle(ball, post.x, post.y, post.r, 0.35)
    this.collideBumpers(ball)
    for (let i = 0; i < STANDUPS.length; i++) {
      if (hitRect(ball, STANDUPS[i], 0.45) && this.standCd[i] <= 0) {
        this.standCd[i] = 0.75
        this.gain(2, SCORE.standup)
      }
    }
    if (this.dropTimer <= 0 && hitRect(ball, DROP, 0.4)) {
      this.dropTimer = 9
      this.gain(3, SCORE.drop)
    }
    if (bounceCircle(ball, SPINNER.x, SPINNER.y, SPINNER.r, 0.25) && this.spinCd <= 0) {
      this.spinCd = 0.14
      this.spin += 1.4
      this.gain(4, SCORE.spinner)
    }
    this.collideFlip(ball, this.flipL)
    this.collideFlip(ball, this.flipR)
    this.gate(ball)
    this.sensors(ball)
    this.capSpeed(ball)
    if (ball.y > 668 && ball.x < 258) {
      this.drain()
      return
    }
    if (ball.x < -30 || ball.x > 350 || ball.y > 760) {
      this.drain()
      return
    }
    if (ball.x > 266 && ball.x < 302 && ball.y > 610 && ball.vy > 0) {
      this.held = true
      this.charging = false
      this.plunger = 0
      return
    }
    const speed = Math.hypot(ball.vx, ball.vy)
    if (speed < 22 && ball.y < 640) this.slow += dt
    else this.slow = 0
    if (this.slow > 1.5) {
      ball.vy -= 320
      ball.vx += (Math.random() - 0.5) * 180
      this.slow = 0
      this.nudges++
    }
  }

  private moveFlip(f: Flip, dt: number) {
    const target = f.pressed ? f.raised : f.rest
    const speed = f.pressed ? 22 : 9
    const prev = f.angle
    const diff = target - f.angle
    const max = speed * dt
    if (Math.abs(diff) <= max) f.angle = target
    else f.angle += Math.sign(diff) * max
    f.av = (f.angle - prev) / dt
  }

  private collideFlip(ball: Ball, f: Flip) {
    const x2 = f.px + Math.cos(f.angle) * f.len
    const y2 = f.py + Math.sin(f.angle) * f.len
    const hit = pointSeg(ball.x, ball.y, f.px, f.py, x2, y2)
    const pressing = f.pressed && Math.abs(f.angle - f.raised) > 0.03
    const kick = pressing ? 1.5 : 1
    const svx = -Math.sin(f.angle) * hit.t * f.len * f.av * kick
    const svy = Math.cos(f.angle) * hit.t * f.len * f.av * kick
    bounceSeg(ball, { x1: f.px, y1: f.py, x2, y2, r: 6, rest: 0.12 }, { vx: svx, vy: svy })
  }

  private collideBumpers(ball: Ball) {
    for (let i = 0; i < BUMPERS.length; i++) {
      const b = BUMPERS[i]
      const dx = ball.x - b.x
      const dy = ball.y - b.y
      const dist = Math.hypot(dx, dy) || 1
      if (dist > ball.r + b.r) continue
      if (this.bumperCd[i] <= 0) {
        const ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.35
        const sp = 820 + Math.random() * 140
        ball.x = b.x + Math.cos(ang) * (ball.r + b.r + 1)
        ball.y = b.y + Math.sin(ang) * (ball.r + b.r + 1)
        ball.vx = Math.cos(ang) * sp
        ball.vy = Math.sin(ang) * sp
        this.bumperCd[i] = 0.1
        this.bumperFlash[i] = 1
        this.gain(1, SCORE.bumper)
        this.onSound?.('bumper')
      } else {
        bounceCircle(ball, b.x, b.y, b.r, 0.45)
      }
    }
  }

  private gate(ball: Ball) {
    if (ball.x > 264 && ball.vy > 40 && ball.y > 176 && ball.y < 206) {
      ball.y = 168
      ball.vy = -220
      ball.vx = -200
    }
  }

  private sensors(ball: Ball) {
    for (let i = 0; i < ROLLOVERS.length; i++) {
      const insideLane = inside(ball, ROLLOVERS[i])
      if (insideLane && !this.rollLatch[i]) {
        this.rollLatch[i] = true
        this.rollFlash[i] = 1
        this.gain(0, SCORE.rollover)
        this.onSound?.('score')
      } else if (!insideLane) this.rollLatch[i] = false
    }
    for (let i = 0; i < this.powerups.length; i++) {
      const orb = this.powerups[i]
      if (Math.hypot(ball.x - orb.x, ball.y - orb.y) <= ball.r + 12) {
        this.powerups.splice(i, 1)
        i--
        this.events.push({ t: 'power', p: orb.p, id: this.seq++ })
        this.addPop(POWER_LABEL[orb.p], orb.x, orb.y)
        this.onAnnounce?.(POWER_LABEL[orb.p])
        this.onSound?.('power')
      }
    }
    for (let i = 0; i < ZONES.length; i++) {
      if (this.zoneCd[i] > 0) continue
      if (!inside(ball, ZONES[i])) continue
      this.zoneCd[i] = 4.2
      this.zoneFlash[i] = 1
      const combo = Math.max(1, this.combo)
      this.events.push({ t: 'buff', b: ZONES[i].kind, combo, id: this.seq++ })
      this.addPop(ZONE_LABEL[ZONES[i].kind].title, ball.x, ball.y - 16)
      this.onSound?.('zone')
    }
  }

  private gain(index: number, base: number) {
    this.combo = Math.min(SCORE.comboCap, this.combo + 1)
    const mult = this.combo * (this.doubleLeft > 0 ? 2 : 1)
    this.charges[index] += base * mult
    this.hits++
    const kind = UNIT_KINDS[index]
    while (this.charges[index] >= SCORE.cap) {
      this.charges[index] -= SCORE.cap
      this.events.push({ t: 'summon', unit: kind, id: this.seq++ })
      this.summons++
      this.addPop(UNITS_LABEL[kind], this.ball?.x ?? 160, (this.ball?.y ?? 200) - 20)
      this.onSound?.('summon')
    }
  }

  private drain() {
    const ball = this.ball
    if (!ball) return
    if (this.ballSave) {
      this.ballSave = false
      ball.x = 160
      ball.y = 530
      ball.vx = (Math.random() - 0.5) * 80
      ball.vy = -620
      this.slow = 0
      this.addPop('SAVED', 160, 500)
      this.onSound?.('save')
      return
    }
    this.ball = null
    this.held = false
    this.combo = 0
    this.reload = 6
    this.drains++
    this.rollLatch = [false, false, false]
    this.onSound?.('drain')
  }

  private capSpeed(ball: Ball) {
    const sp = Math.hypot(ball.vx, ball.vy)
    const max = 1580
    if (sp > max) {
      ball.vx *= max / sp
      ball.vy *= max / sp
    }
  }

  private addPop(text: string, x: number, y: number) {
    this.pops.push({ text, x, y, life: 0.9 })
  }

  private addOrb(force: boolean) {
    if (!force && this.powerups.length >= 3) return
    if (this.powerups.length >= 5) return
    const kinds: PowerKind[] = ['surge', 'nuke', 'turret']
    const kind = kinds[Math.floor(Math.random() * kinds.length)]
    const spot = ORB_SPOTS[Math.floor(Math.random() * ORB_SPOTS.length)]
    const orb = { p: kind, x: spot.x + (Math.random() - 0.5) * 16, y: spot.y + (Math.random() - 0.5) * 16 }
    this.powerups.push(orb)
  }

  private maybeSpawnOrb(dt: number) {
    this.orbTimer -= dt
    if (this.orbTimer > 0) return
    this.orbTimer = 8 + Math.random() * 6
    this.addOrb(false)
  }
}

const UNITS_LABEL: Record<UnitKind, string> = {
  scout: 'SCOUT',
  soldier: 'SOLDIER',
  archer: 'ARCHER',
  brute: 'BRUTE',
  siege: 'SIEGE',
}
