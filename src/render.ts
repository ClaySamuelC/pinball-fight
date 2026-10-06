import { BOARD_H, BOARD_W, LANE_W, UNITS, type Side, type UnitKind } from './data'
import type { LaneSnap, UnitSnap } from './lane'
import {
  BUMPERS,
  DROP,
  FLIP_L,
  FLIP_R,
  PEGS,
  POSTS,
  ROLLOVERS,
  SPINNER,
  STANDUPS,
  WALLS,
  ZONES,
  type BoardSnap,
} from './pinball'

export type Scene = {
  w: number
  h: number
  time: number
  dt: number
  me: Side
  left: BoardSnap
  right: BoardSnap
  lane: LaneSnap
  smoothLane: boolean
  smoothRight: boolean
  names: [string, string]
  hint: string
  code: string
  shake: number
  flash: number
  debug: boolean
  bottom: number
}

const CYAN = '#39f3ff'
const MAGENTA = '#ff4bd0'
const GOLD = '#ffcc4d'
const INK = '#f7f4ff'

const stars = Array.from({ length: 70 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: Math.random() * 1.4 + 0.4,
  a: Math.random() * 0.5 + 0.2,
  s: Math.random() * 0.4 + 0.1,
}))

const trails: Record<'left' | 'right', { x: number; y: number }[]> = { left: [], right: [] }
let ghostGen = -1
let ghostUnits: UnitSnap[] = []
let ghostBall: { x: number; y: number } | null = null

type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; r: number }
const sparks: Spark[] = []
let prevLeftFlash = [0, 0, 0]
let prevRightFlash = [0, 0, 0]
let prevTowerHp = ''

export function resetView() {
  ghostGen = -1
  ghostUnits = []
  ghostBall = null
  trails.left = []
  trails.right = []
  prevLeftFlash = [0, 0, 0]
  prevRightFlash = [0, 0, 0]
  prevTowerHp = ''
  sparks.length = 0
}

export function draw(ctx: CanvasRenderingContext2D, scene: Scene) {
  const { w, h } = scene
  ctx.clearRect(0, 0, w, h)
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#14082a')
  sky.addColorStop(0.45, '#07051a')
  sky.addColorStop(1, '#05030f')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  for (const star of stars) {
    const tw = 0.55 + Math.sin(scene.time * star.s * 6 + star.x * 20) * 0.45
    ctx.globalAlpha = star.a * tw
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(((star.x + scene.time * 0.004) % 1) * w, star.y * h, star.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  const pad = 12
  const top = 52
  const availW = w - pad * 2
  const availH = h - top - scene.bottom
  let laneW = Math.max(230, availW * 0.38)
  let boardW = (availW - laneW - pad * 2) / 2
  let boardH = availH
  const naturalH = boardW * (BOARD_H / BOARD_W) + 86
  if (naturalH < boardH) {
    boardH = naturalH
  } else {
    const playH = boardH - 86
    boardW = playH * (BOARD_W / BOARD_H)
    laneW = availW - boardW * 2 - pad * 2
  }
  const y = top + Math.max(0, (availH - boardH) / 2)
  const x0 = pad + Math.max(0, (availW - (boardW * 2 + laneW + pad * 2)) / 2)
  const left = { x: x0, y, w: boardW, h: boardH }
  const lane = { x: x0 + boardW + pad, y, w: Math.max(180, laneW), h: boardH }
  const right = { x: lane.x + lane.w + pad, y, w: boardW, h: boardH }

  ctx.save()
  if (scene.shake > 0) {
    const mag = scene.shake * 18
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag)
  }

  const glow = ctx.createRadialGradient(lane.x + lane.w / 2, lane.y + lane.h * 0.6, 20, lane.x + lane.w / 2, lane.y + lane.h * 0.5, lane.w)
  glow.addColorStop(0, 'rgba(255, 204, 77, 0.16)')
  glow.addColorStop(1, 'rgba(255, 204, 77, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(lane.x - 40, lane.y, lane.w + 80, lane.h)

  drawBoard(ctx, left, scene.left, CYAN, scene.names[0], scene.hint, 'left', false, scene)
  drawBoard(ctx, right, scene.right, MAGENTA, scene.names[1], '', 'right', scene.smoothRight, scene)
  drawLane(ctx, lane, scene)
  ctx.restore()

  if (scene.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${scene.flash * 0.45})`
    ctx.fillRect(0, 0, w, h)
  }
  stepSparks(ctx, scene.dt)
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number },
  snap: BoardSnap,
  accent: string,
  name: string,
  hint: string,
  key: 'left' | 'right',
  smooth: boolean,
  scene: Scene,
) {
  const header = 86
  round(ctx, rect.x, rect.y, rect.w, rect.h, 16)
  ctx.fillStyle = '#100a22'
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = accent
  ctx.stroke()
  ctx.save()
  ctx.shadowColor = accent
  ctx.shadowBlur = 12
  ctx.stroke()
  ctx.restore()

  const comboColor = snap.combo >= 6 ? MAGENTA : snap.combo >= 3 ? GOLD : INK
  text(ctx, name, rect.x + 14, rect.y + 18, 18, accent, 'left')
  text(ctx, `COMBO x${snap.combo}`, rect.x + rect.w - 14, rect.y + 18, 16, comboColor, 'right')
  const status =
    hint ||
    (snap.reload > 0 ? 'NEXT BALL' : snap.doubleLeft > 0 ? 'DOUBLE CHARGE' : snap.ballSave ? 'BALL SAVE' : '')
  if (status) text(ctx, status, rect.x + rect.w / 2, rect.y + 40, 13, status === 'BALL SAVE' ? CYAN : GOLD, 'center')
  drawMeters(ctx, rect.x + 10, rect.y + 54, rect.w - 20, snap.charges)

  const play = { x: rect.x + 8, y: rect.y + header, w: rect.w - 16, h: rect.h - header - 8 }
  ctx.save()
  round(ctx, play.x, play.y, play.w, play.h, 12)
  ctx.clip()
  const bg = ctx.createLinearGradient(play.x, play.y, play.x, play.y + play.h)
  bg.addColorStop(0, '#24143f')
  bg.addColorStop(1, '#12091f')
  ctx.fillStyle = bg
  ctx.fillRect(play.x, play.y, play.w, play.h)

  const scale = play.w / BOARD_W
  ctx.translate(play.x, play.y)
  ctx.scale(scale, scale)

  for (let i = 0; i < ZONES.length; i++) {
    const zone = ZONES[i]
    const flash = snap.zoneFlash[i] ?? 0
    ctx.fillStyle =
      zone.kind === 'rush'
        ? `rgba(57,243,255,${0.08 + flash * 0.3})`
        : zone.kind === 'aegis'
          ? `rgba(125,255,178,${0.08 + flash * 0.3})`
          : `rgba(255,93,108,${0.08 + flash * 0.3})`
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h)
  }

  for (let i = 0; i < ROLLOVERS.length; i++) {
    const lane = ROLLOVERS[i]
    ctx.fillStyle = snap.rollFlash[i] > 0.05 ? 'rgba(125,255,178,0.7)' : 'rgba(125,255,178,0.14)'
    ctx.strokeStyle = '#7dffb2'
    ctx.lineWidth = 2
    ctx.fillRect(lane.x, lane.y, lane.w, lane.h)
    ctx.strokeRect(lane.x, lane.y, lane.w, lane.h)
  }

  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(190, 220, 255, 0.55)'
  ctx.lineWidth = 6
  for (const wall of WALLS) {
    ctx.beginPath()
    ctx.moveTo(wall.x1, wall.y1)
    ctx.lineTo(wall.x2, wall.y2)
    ctx.stroke()
  }
  if (scene.debug) {
    ctx.strokeStyle = '#b6ff4a'
    ctx.lineWidth = 1
    for (const wall of WALLS) {
      ctx.beginPath()
      ctx.moveTo(wall.x1, wall.y1)
      ctx.lineTo(wall.x2, wall.y2)
      ctx.stroke()
    }
  }

  for (const peg of PEGS) glowDot(ctx, peg.x, peg.y, peg.r, '#d7c6ff', 10)
  for (const post of POSTS) glowDot(ctx, post.x, post.y, post.r, accent, 8)

  if (snap.dropUp) {
    ctx.fillStyle = '#ff7d59'
    ctx.fillRect(DROP.x, DROP.y, DROP.w, DROP.h)
    glowDot(ctx, DROP.x + 8, DROP.y + 16, 4, '#fff', 8)
  } else {
    ctx.strokeStyle = 'rgba(255,125,89,0.45)'
    ctx.strokeRect(DROP.x, DROP.y, DROP.w, DROP.h)
  }
  if (scale > 0.5) chip(ctx, 'BRUTE', 108, 418, scale, '#ff7d59')

  for (let i = 0; i < STANDUPS.length; i++) {
    const box = STANDUPS[i]
    ctx.fillStyle = snap.standLit[i] ? '#d9a6ff' : 'rgba(217,166,255,0.25)'
    ctx.fillRect(box.x, box.y, box.w, box.h)
  }
  if (scale > 0.5) chip(ctx, 'ARCHER', 196, 198, scale, '#d9a6ff')

  ctx.save()
  ctx.translate(SPINNER.x, SPINNER.y)
  ctx.rotate(snap.spin)
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, SPINNER.r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-SPINNER.r, 0)
  ctx.lineTo(SPINNER.r, 0)
  ctx.moveTo(0, -SPINNER.r)
  ctx.lineTo(0, SPINNER.r)
  ctx.stroke()
  ctx.restore()
  if (scale > 0.5) chip(ctx, 'SIEGE', SPINNER.x, SPINNER.y + 34, scale, GOLD)

  for (let i = 0; i < BUMPERS.length; i++) {
    const bumper = BUMPERS[i]
    const flash = snap.bumperFlash[i] ?? 0
    const rings = 2 + Math.floor(flash * 2)
    for (let n = 0; n < rings; n++) {
      ctx.beginPath()
      ctx.arc(bumper.x, bumper.y, bumper.r + n * 4 + flash * 8, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(99,180,255,${0.85 - n * 0.25})`
      ctx.lineWidth = 3
      ctx.stroke()
    }
    const g = ctx.createRadialGradient(bumper.x - 4, bumper.y - 4, 2, bumper.x, bumper.y, bumper.r)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.45, '#63b4ff')
    g.addColorStop(1, '#1a4f88')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(bumper.x, bumper.y, bumper.r - 4, 0, Math.PI * 2)
    ctx.fill()
    const prev = key === 'left' ? prevLeftFlash : prevRightFlash
    if (flash > 0.85 && prev[i] < 0.4) burst(play.x + bumper.x * scale, play.y + bumper.y * scale, '#9ad4ff')
    prev[i] = flash
  }
  if (scale > 0.5) {
    chip(ctx, 'SCOUT', 146, 128, scale, '#7dffb2')
    chip(ctx, 'RUSH', 46, 136, scale, CYAN)
    chip(ctx, 'SOLDIER', 72, 338, scale, '#9ad4ff')
    chip(ctx, 'FURY', 230, 352, scale, '#ff8b9a')
    chip(ctx, 'AEGIS', 78, 508, scale, '#7dffb2')
  }

  for (const orb of snap.powerups) drawOrb(ctx, orb.p, orb.x, orb.y, scene.time)

  drawFlipper(ctx, FLIP_L.px, FLIP_L.py, FLIP_L.len, snap.flipL, accent)
  drawFlipper(ctx, FLIP_R.px, FLIP_R.py, FLIP_R.len, snap.flipR, accent)
  drawSpring(ctx, snap.plunger)

  const ball = presentBall(key, snap.ball, scene.dt, smooth)
  if (ball) {
    trails[key].push({ x: ball.x, y: ball.y })
    if (trails[key].length > 10) trails[key].shift()
    trails[key].forEach((p, i) => {
      ctx.globalAlpha = (i / trails[key].length) * 0.45
      ctx.fillStyle = accent
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1
    const g = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, 8)
    g.addColorStop(0, '#ffffff')
    g.addColorStop(0.5, accent)
    g.addColorStop(1, '#ffffff')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, 7, 0, Math.PI * 2)
    ctx.fill()
  } else trails[key] = []

  for (const pop of snap.pops) {
    ctx.globalAlpha = Math.max(0, pop.life)
    text(ctx, pop.text, pop.x, pop.y, 16 / scale, GOLD, 'center')
    ctx.globalAlpha = 1
  }

  if (snap.reload > 0) {
    ctx.fillStyle = 'rgba(4, 2, 12, 0.55)'
    ctx.fillRect(0, 0, BOARD_W, BOARD_H)
    text(ctx, 'NEXT BALL', 160, 300, 22 / scale, INK, 'center')
    text(ctx, String(Math.ceil(snap.reload)), 160, 348, 64 / scale, GOLD, 'center')
  }

  ctx.restore()
}

function drawMeters(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, charges: number[]) {
  const kinds: UnitKind[] = ['scout', 'soldier', 'archer', 'brute', 'siege']
  const gap = 4
  const bw = (w - gap * 4) / 5
  kinds.forEach((kind, i) => {
    const bx = x + i * (bw + gap)
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    round(ctx, bx, y, bw, 16, 4)
    ctx.fill()
    ctx.fillStyle = UNITS[kind].color
    round(ctx, bx, y, bw * Math.max(0, Math.min(1, charges[i] / 100)), 16, 4)
    ctx.fill()
    const label = UNITS[kind].label
    const size = Math.min(12, Math.max(9, (bw - 4) / (label.length * 0.58)))
    text(ctx, label, bx + bw / 2, y + 24, size, UNITS[kind].color, 'center')
  })
}

function drawLane(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; w: number; h: number },
  scene: Scene,
) {
  round(ctx, rect.x, rect.y, rect.w, rect.h, 16)
  const bg = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h)
  bg.addColorStop(0, '#1a1038')
  bg.addColorStop(0.55, '#120a24')
  bg.addColorStop(1, '#241018')
  ctx.fillStyle = bg
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = GOLD
  ctx.stroke()

  ctx.save()
  ctx.translate(rect.x, rect.y)
  const ground = rect.h * 0.72
  const yard = ctx.createLinearGradient(0, ground - 30, 0, rect.h)
  yard.addColorStop(0, '#2a1844')
  yard.addColorStop(1, '#140814')
  ctx.fillStyle = yard
  ctx.fillRect(8, ground - 8, rect.w - 16, rect.h - ground)
  ctx.strokeStyle = 'rgba(255,204,77,0.35)'
  ctx.setLineDash([8, 10])
  ctx.beginPath()
  ctx.moveTo(24, ground)
  ctx.lineTo(rect.w - 24, ground)
  ctx.stroke()
  ctx.setLineDash([])

  if (scene.code) text(ctx, `CODE  ${scene.code.split('').join(' ')}`, rect.w / 2, 28, 18, GOLD, 'center')
  text(ctx, 'LANE', rect.w / 2, 52, 12, 'rgba(247,244,255,0.7)', 'center')

  const units = smoothUnits(scene.lane, scene.dt, scene.smoothLane)
  const X = (sim: number) => {
    const nx = scene.me === 1 ? LANE_W - sim : sim
    return (nx / LANE_W) * rect.w
  }
  const Y = (sim: number) => ground - sim * rect.h * 0.0031

  for (const core of scene.lane.cores) drawCore(ctx, X(core.x), ground, core.hp / core.max, core.o === scene.me)
  for (const tower of scene.lane.towers) drawTower(ctx, X(tower.x), ground, tower, scene)
  for (const turret of scene.lane.turrets) drawTurret(ctx, X(turret.x), Y(turret.y), turret.hp / turret.max, turret.o === scene.me)
  for (const unit of units) {
    const mine = unit.o === scene.me
    const faceRight = mine
    drawUnit(ctx, X(unit.x), Y(unit.y), unit, faceRight, mine, scene.lane.auras[unit.o])
  }
  for (const shot of scene.lane.shots) {
    ctx.strokeStyle = shot.o === scene.me ? CYAN : MAGENTA
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(X(shot.x), Y(shot.y))
    ctx.lineTo(X(shot.tx), Y(shot.ty))
    ctx.stroke()
    glowDot(ctx, X(shot.x), Y(shot.y), 3, shot.o === scene.me ? CYAN : MAGENTA, 8)
  }
  for (const flash of scene.lane.flashes) {
    ctx.globalAlpha = Math.max(0, flash.life * 4)
    glowDot(ctx, X(flash.x), Y(flash.y), 10, flash.o === scene.me ? CYAN : GOLD, 16)
    ctx.globalAlpha = 1
  }
  ctx.restore()

  const hpKey = scene.lane.towers.map((t) => Math.round(t.hp)).join(',')
  if (prevTowerHp && hpKey !== prevTowerHp) {
    scene.lane.towers.forEach((tower) => {
      if (tower.hp <= 0) burst(rect.x + ((scene.me === 1 ? LANE_W - tower.x : tower.x) / LANE_W) * rect.w, rect.y + ground, GOLD)
    })
  }
  prevTowerHp = hpKey
}

function drawCore(ctx: CanvasRenderingContext2D, x: number, ground: number, hp: number, mine: boolean) {
  const color = mine ? CYAN : MAGENTA
  ctx.save()
  ctx.translate(x, ground - 54)
  ctx.fillStyle = color
  ctx.globalAlpha = 0.25 + hp * 0.5
  ctx.beginPath()
  ctx.moveTo(0, -34)
  ctx.lineTo(22, 0)
  ctx.lineTo(0, 34)
  ctx.lineTo(-22, 0)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()
  bar(ctx, x - 22, ground - 102, 44, 6, hp, color)
  text(ctx, 'CORE', x, ground - 112, 11, INK, 'center')
}

function drawTower(
  ctx: CanvasRenderingContext2D,
  x: number,
  ground: number,
  tower: { hp: number; max: number; alive: boolean },
  _scene: Scene,
) {
  const hp = tower.alive ? tower.hp / tower.max : 0
  ctx.save()
  ctx.translate(x, ground)
  ctx.fillStyle = tower.alive ? '#3a2a12' : '#1a1420'
  ctx.fillRect(-16, -22, 32, 22)
  ctx.fillStyle = tower.alive ? GOLD : '#4a4458'
  ctx.beginPath()
  ctx.moveTo(-20, -20)
  ctx.lineTo(0, -92)
  ctx.lineTo(20, -20)
  ctx.closePath()
  ctx.fill()
  if (tower.alive) glowDot(ctx, 0, -58, 6, '#fff6c8', 14)
  ctx.restore()
  if (tower.alive) bar(ctx, x - 18, ground - 104, 36, 5, hp, GOLD)
}

function drawTurret(ctx: CanvasRenderingContext2D, x: number, y: number, hp: number, mine: boolean) {
  ctx.fillStyle = mine ? '#145c48' : '#5c1848'
  ctx.fillRect(x - 8, y - 16, 16, 16)
  ctx.fillStyle = '#7dffb2'
  ctx.fillRect(x - 2, y - 26, 12, 6)
  bar(ctx, x - 12, y - 34, 24, 4, hp, '#7dffb2')
}

function drawUnit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  unit: UnitSnap,
  faceRight: boolean,
  mine: boolean,
  aura: { surge: number; rush: number; fury: number } | undefined,
) {
  const stat = UNITS[unit.k]
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1.4, 1.4)
  if (!faceRight) ctx.scale(-1, 1)
  ctx.fillStyle = stat.color
  ctx.strokeStyle = mine ? CYAN : MAGENTA
  ctx.lineWidth = 3
  if (unit.k === 'scout') {
    poly(ctx, [14, 0, -8, -8, -8, 8])
  } else if (unit.k === 'soldier') {
    round(ctx, -8, -9, 16, 18, 4)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(6, -2, 4, 0, Math.PI * 2)
    ctx.fill()
  } else if (unit.k === 'archer') {
    poly(ctx, [12, 0, -6, -8, -10, 0, -6, 8])
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(2, 0, 7, -1.2, 1.2)
    ctx.stroke()
  } else if (unit.k === 'brute') {
    round(ctx, -12, -12, 24, 24, 6)
    ctx.fill()
    ctx.stroke()
  } else {
    poly(ctx, [16, 0, 6, -8, -10, -7, -10, 7, 6, 8])
  }
  if (unit.k === 'scout' || unit.k === 'siege') {
    ctx.fill()
    ctx.stroke()
  }
  ctx.restore()
  if (aura?.surge) glowDot(ctx, x, y, stat.r + 6, 'rgba(255,93,115,0.45)', 0)
  if (aura?.fury) glowDot(ctx, x, y, stat.r + 3, 'rgba(255,80,80,0.35)', 0)
  if (unit.hp < unit.max || unit.sh > 0) {
    bar(ctx, x - 12, y - stat.r - 12, 24, 4, unit.hp / unit.max, stat.color)
    if (unit.sh > 0) bar(ctx, x - 12, y - stat.r - 17, 24, 3, Math.min(1, unit.sh / 80), CYAN)
  }
}

function drawOrb(ctx: CanvasRenderingContext2D, kind: 'surge' | 'nuke' | 'turret', x: number, y: number, time: number) {
  const color = kind === 'surge' ? '#ff5d73' : kind === 'nuke' ? '#ffe56a' : '#7dffb2'
  const pulse = 11 + Math.sin(time * 6) * 2
  glowDot(ctx, x, y, pulse, color, 16)
  ctx.fillStyle = '#140818'
  ctx.beginPath()
  ctx.arc(x, y, 7, 0, Math.PI * 2)
  ctx.fill()
  text(ctx, kind === 'surge' ? 'S' : kind === 'nuke' ? 'N' : 'T', x, y + 1, 12, color, 'center')
}

function drawFlipper(ctx: CanvasRenderingContext2D, px: number, py: number, len: number, angle: number, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = 12
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(px, py)
  ctx.lineTo(px + Math.cos(angle) * len, py + Math.sin(angle) * len)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'
  ctx.lineWidth = 3
  ctx.stroke()
}

function drawSpring(ctx: CanvasRenderingContext2D, power: number) {
  ctx.strokeStyle = '#ffb4c8'
  ctx.lineWidth = 2
  ctx.beginPath()
  const top = 640 - power * 28
  ctx.moveTo(274, 652)
  for (let i = 0; i < 6; i++) {
    const y = 652 - ((652 - top) * i) / 6
    ctx.lineTo(i % 2 === 0 ? 292 : 274, y)
  }
  ctx.stroke()
}

function presentBall(
  key: 'left' | 'right',
  ball: { x: number; y: number } | null,
  dt: number,
  smooth: boolean,
): { x: number; y: number } | null {
  if (key === 'left' || !smooth) return ball
  if (!ball) {
    ghostBall = null
    return null
  }
  if (!ghostBall) ghostBall = { ...ball }
  const rate = 1 - Math.exp(-14 * dt)
  ghostBall.x += (ball.x - ghostBall.x) * rate
  ghostBall.y += (ball.y - ghostBall.y) * rate
  return ghostBall
}

function smoothUnits(snap: LaneSnap, dt: number, enabled: boolean): UnitSnap[] {
  if (!enabled || ghostGen !== snap.gen && ghostUnits.length === 0) {
    ghostGen = snap.gen
    ghostUnits = snap.units.map((u) => ({ ...u }))
    return snap.units
  }
  if (ghostGen !== snap.gen) {
    ghostGen = snap.gen
    ghostUnits = snap.units.map((u) => ({ ...u }))
    return ghostUnits
  }
  const rate = 1 - Math.exp(-12 * Math.max(0.001, dt))
  const next: UnitSnap[] = []
  for (const unit of snap.units) {
    const prev = ghostUnits.find((p) => p.id === unit.id)
    if (!prev) next.push({ ...unit })
    else next.push({ ...unit, x: prev.x + (unit.x - prev.x) * rate, y: prev.y + (unit.y - prev.y) * rate })
  }
  ghostUnits = next
  return next
}

function burst(x: number, y: number, color: string) {
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2
    const s = 40 + Math.random() * 120
    sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4, max: 0.4, color, r: 2 + Math.random() * 2 })
  }
}

function stepSparks(ctx: CanvasRenderingContext2D, dt: number) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const spark = sparks[i]
    spark.life -= dt
    spark.x += spark.vx * dt
    spark.y += spark.vy * dt
    spark.vy += 80 * dt
    if (spark.life <= 0) {
      sparks.splice(i, 1)
      continue
    }
    ctx.globalAlpha = spark.life / spark.max
    ctx.fillStyle = spark.color
    ctx.beginPath()
    ctx.arc(spark.x, spark.y, spark.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function glowDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, blur: number) {
  if (blur > 0) {
    ctx.save()
    ctx.shadowColor = color
    ctx.shadowBlur = blur
  }
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  if (blur > 0) ctx.restore()
}

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, amount: number, color: string) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = color
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, amount)), h)
}

function poly(ctx: CanvasRenderingContext2D, pts: number[]) {
  ctx.beginPath()
  ctx.moveTo(pts[0], pts[1])
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1])
  ctx.closePath()
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function chip(
  ctx: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  scale: number,
  color: string,
) {
  const size = 12 / scale
  ctx.font = `800 ${size}px Outfit, "Segoe UI", sans-serif`
  const width = ctx.measureText(label).width + 8 / scale
  const height = 16 / scale
  ctx.fillStyle = 'rgba(6, 4, 16, 0.86)'
  ctx.beginPath()
  ctx.roundRect(x - width / 2, y - height / 2, width, height, 4 / scale)
  ctx.fill()
  text(ctx, label, x, y, size, color, 'center')
}

function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign,
) {
  ctx.font = `800 ${size}px Outfit, "Segoe UI", sans-serif`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.lineWidth = Math.max(2, size / 5)
  ctx.strokeStyle = 'rgba(0,0,0,0.8)'
  ctx.strokeText(value, x, y)
  ctx.fillStyle = color
  ctx.fillText(value, x, y)
}
