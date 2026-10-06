import {
  CORE_HP,
  LANE_W,
  TOWER_CD,
  TOWER_DMG,
  TOWER_HP,
  TOWER_RANGE,
  TURRET_CD,
  TURRET_DMG,
  TURRET_HP,
  TURRET_RANGE,
  UNITS,
  clamp,
  type FxEvent,
  type GameAction,
  type Side,
  type UnitKind,
} from './data'

export type UnitSnap = {
  id: number
  o: Side
  k: UnitKind
  x: number
  y: number
  hp: number
  max: number
  sh: number
}

export type TowerSnap = { o: Side; i: number; x: number; hp: number; max: number; alive: boolean }
export type CoreSnap = { o: Side; x: number; hp: number; max: number }
export type TurretSnap = { id: number; o: Side; x: number; y: number; hp: number; max: number }
export type FlashSnap = { x: number; y: number; o: Side; life: number }
export type ShotSnap = { x: number; y: number; tx: number; ty: number; o: Side }
export type AuraSnap = { surge: number; rush: number; fury: number }

export type LaneSnap = {
  gen: number
  units: UnitSnap[]
  towers: TowerSnap[]
  cores: CoreSnap[]
  turrets: TurretSnap[]
  flashes: FlashSnap[]
  shots: ShotSnap[]
  auras: AuraSnap[]
  acks: [number, number]
  winner: Side | null
}

type Unit = UnitSnap & { cd: number }
type Tower = TowerSnap & { cd: number }
type Turret = TurretSnap & { cd: number }
type Aura = { surgeUntil: number; rushUntil: number; furyUntil: number; surgeMult: number; rushMult: number; furyMult: number }
type Shot = {
  x: number
  y: number
  tx: number
  ty: number
  dmg: number
  o: Side
  kind: 'unit' | 'tower' | 'turret' | 'core'
  ref: number
  life: number
}

const TOWER_X: Record<Side, number[]> = {
  0: [300, 210, 130],
  1: [700, 790, 870],
}

export class Lane {
  time = 0
  gen = 1
  winner: Side | null = null
  units: Unit[] = []
  towers: Tower[] = []
  cores: { o: Side; x: number; hp: number; max: number }[] = []
  turrets: Turret[] = []
  flashes: FlashSnap[] = []
  auras: Aura[] = []
  acks: [number, number] = [0, 0]
  private shots: Shot[] = []
  private fx: FxEvent[] = []
  private fxId = 1
  private uid = 1
  private tid = 1
  private seen: [Set<number>, Set<number>] = [new Set(), new Set()]
  private rewardsGiven: [number, number] = [0, 0]

  constructor() {
    this.reset()
  }

  reset() {
    this.time = 0
    this.gen++
    this.winner = null
    this.units = []
    this.shots = []
    this.flashes = []
    this.fx = []
    this.turrets = []
    this.acks = [0, 0]
    this.seen = [new Set(), new Set()]
    this.rewardsGiven = [0, 0]
    this.auras = [blankAura(), blankAura()]
    this.towers = []
    for (const o of [0, 1] as Side[]) {
      TOWER_X[o].forEach((x, i) => {
        this.towers.push({ o, i, x, hp: TOWER_HP, max: TOWER_HP, alive: true, cd: 0.4 + i * 0.15 })
      })
    }
    this.cores = [
      { o: 0, x: 48, hp: CORE_HP, max: CORE_HP },
      { o: 1, x: LANE_W - 48, hp: CORE_HP, max: CORE_HP },
    ]
  }

  pullFx(): FxEvent[] {
    const out = this.fx
    this.fx = []
    return out
  }

  apply(player: Side, action: GameAction) {
    if (this.winner !== null) return
    if (this.seen[player].has(action.id)) return
    this.seen[player].add(action.id)
    this.acks[player] = Math.max(this.acks[player], action.id)
    if (this.seen[player].size > 240) {
      for (const id of this.seen[player]) {
        if (id < this.acks[player] - 80) this.seen[player].delete(id)
      }
    }
    if (action.t === 'summon') this.spawn(player, action.unit)
    else if (action.t === 'power') this.power(player, action.p)
    else this.buff(player, action.b, action.combo)
  }

  step(dt: number) {
    if (this.winner !== null) return
    const frame = Math.min(0.05, Math.max(0, dt))
    this.time += frame
    for (const unit of this.units) this.driveUnit(unit, frame)
    this.driveTowers(frame)
    this.driveTurrets(frame)
    this.driveShots(frame)
    this.units = this.units.filter((u) => u.hp > 0)
    this.turrets = this.turrets.filter((t) => t.hp > 0)
    this.flashes = this.flashes
      .map((f) => ({ ...f, life: f.life - frame }))
      .filter((f) => f.life > 0)
    for (const core of this.cores) {
      if (core.hp <= 0 && this.winner === null) {
        core.hp = 0
        const winner: Side = core.o === 0 ? 1 : 0
        this.winner = winner
        this.fx.push({ t: 'win', player: winner, id: this.fxId++ })
      }
    }
  }

  snapshot(): LaneSnap {
    return {
      gen: this.gen,
      units: this.units.map((u) => ({
        id: u.id,
        o: u.o,
        k: u.k,
        x: u.x,
        y: u.y,
        hp: u.hp,
        max: u.max,
        sh: u.sh,
      })),
      towers: this.towers.map((t) => ({ o: t.o, i: t.i, x: t.x, hp: Math.max(0, t.hp), max: t.max, alive: t.alive })),
      cores: this.cores.map((c) => ({ o: c.o, x: c.x, hp: Math.max(0, c.hp), max: c.max })),
      turrets: this.turrets.map((t) => ({ id: t.id, o: t.o, x: t.x, y: t.y, hp: t.hp, max: t.max })),
      flashes: this.flashes.map((f) => ({ ...f })),
      shots: this.shots.map((s) => ({ x: s.x, y: s.y, tx: s.tx, ty: s.ty, o: s.o })),
      auras: this.auras.map((a) => ({
        surge: Math.max(0, a.surgeUntil - this.time),
        rush: Math.max(0, a.rushUntil - this.time),
        fury: Math.max(0, a.furyUntil - this.time),
      })),
      acks: [this.acks[0], this.acks[1]],
      winner: this.winner,
    }
  }

  private spawn(player: Side, kind: UnitKind) {
    const stat = UNITS[kind]
    const mine = this.units.filter((u) => u.o === player)
    if (mine.length >= 16) {
      mine.sort((a, b) => a.id - b.id)
      this.units = this.units.filter((u) => u !== mine[0])
    }
    this.units.push({
      id: this.uid++,
      o: player,
      k: kind,
      x: player === 0 ? 360 : 640,
      y: clamp(stat.y + (Math.random() - 0.5) * 12, -44, 44),
      hp: stat.hp,
      max: stat.hp,
      sh: 0,
      cd: 0.25 + Math.random() * 0.2,
    })
  }

  private power(player: Side, kind: 'surge' | 'nuke' | 'turret') {
    if (kind === 'surge') {
      this.auras[player].surgeUntil = this.time + 8
      this.auras[player].surgeMult = 1.6
    } else if (kind === 'nuke') {
      const enemy: Side = player === 0 ? 1 : 0
      this.units = this.units.filter((u) => u.o !== enemy)
      this.fx.push({ t: 'nuke', player, id: this.fxId++ })
    } else {
      const owned = this.turrets.filter((t) => t.o === player)
      if (owned.length >= 2) {
        owned.sort((a, b) => a.id - b.id)
        this.turrets = this.turrets.filter((t) => t !== owned[0])
      }
      const y = owned.length % 2 === 0 ? -18 : 18
      this.turrets.push({
        id: this.tid++,
        o: player,
        x: player === 0 ? 390 : 610,
        y,
        hp: TURRET_HP,
        max: TURRET_HP,
        cd: 0.3,
      })
    }
  }

  private buff(player: Side, kind: 'rush' | 'aegis' | 'fury', combo: number) {
    const c = clamp(combo, 1, 8)
    const aura = this.auras[player]
    if (kind === 'rush') {
      aura.rushUntil = this.time + 3.4
      aura.rushMult = 1.28 + 0.07 * (c - 1)
    } else if (kind === 'fury') {
      aura.furyUntil = this.time + 3.2
      aura.furyMult = 1.22 + 0.06 * (c - 1)
    } else {
      const amount = 16 + 7 * c
      for (const unit of this.units) {
        if (unit.o === player) unit.sh = Math.max(unit.sh, amount)
      }
    }
  }

  private driveUnit(unit: Unit, dt: number) {
    const stat = UNITS[unit.k]
    const aura = this.auras[unit.o]
    const rush = aura.rushUntil > this.time ? aura.rushMult : 1
    unit.cd -= dt * rush
    const target = this.pickTarget(unit, stat.melee ? 120 : 230)
    if (!target) return
    const dx = target.x - unit.x
    const dy = target.y - unit.y
    const dist = Math.hypot(dx, dy) || 1
    if (dist > stat.range) {
      const step = stat.speed * rush * dt
      unit.x += (dx / dist) * step
      unit.y += (dy / dist) * Math.min(step, 90 * dt)
    }
    this.separate(unit, dt)
    unit.x = clamp(unit.x, 70, LANE_W - 70)
    unit.y = clamp(unit.y, -46, 46)
    const ndx = target.x - unit.x
    const ndy = target.y - unit.y
    const nd = Math.hypot(ndx, ndy)
    if (nd <= stat.range + 4 && unit.cd <= 0) {
      unit.cd = stat.cd
      let dmg = stat.melee ? stat.dmg : stat.dmg
      if (target.kind !== 'unit' && stat.tower > 0) dmg = stat.tower
      dmg *= this.dmgMult(unit.o)
      if (stat.melee) {
        this.hurt(target, dmg, unit.o)
        this.flashes.push({ x: target.x, y: target.y, o: unit.o, life: 0.12 })
      } else {
        this.shots.push({
          x: unit.x,
          y: unit.y,
          tx: target.x,
          ty: target.y,
          dmg,
          o: unit.o,
          kind: target.kind,
          ref: target.ref,
          life: 1.4,
        })
      }
    }
  }

  private driveTowers(dt: number) {
    for (const tower of this.towers) {
      if (!tower.alive) continue
      tower.cd -= dt
      const target = this.nearestUnit(tower.o === 0 ? 1 : 0, tower.x, 0, TOWER_RANGE)
      if (!target || tower.cd > 0) continue
      tower.cd = TOWER_CD
      this.shots.push({
        x: tower.x,
        y: 0,
        tx: target.x,
        ty: target.y,
        dmg: TOWER_DMG,
        o: tower.o,
        kind: 'unit',
        ref: target.id,
        life: 1.2,
      })
    }
  }

  private driveTurrets(dt: number) {
    for (const turret of this.turrets) {
      turret.cd -= dt
      const target = this.nearestUnit(turret.o === 0 ? 1 : 0, turret.x, turret.y, TURRET_RANGE)
      if (!target || turret.cd > 0) continue
      turret.cd = TURRET_CD
      this.shots.push({
        x: turret.x,
        y: turret.y,
        tx: target.x,
        ty: target.y,
        dmg: TURRET_DMG,
        o: turret.o,
        kind: 'unit',
        ref: target.id,
        life: 1.2,
      })
    }
  }

  private driveShots(dt: number) {
    for (const shot of this.shots) {
      const target = this.locate(shot.kind, shot.ref, shot.o)
      if (!target) {
        shot.life = 0
        continue
      }
      const dx = target.x - shot.x
      const dy = target.y - shot.y
      const dist = Math.hypot(dx, dy)
      const step = 540 * dt
      shot.tx = target.x
      shot.ty = target.y
      if (dist <= step + target.r) {
        this.hurt(target, shot.dmg, shot.o)
        this.flashes.push({ x: target.x, y: target.y, o: shot.o, life: 0.1 })
        shot.life = 0
      } else {
        shot.x += (dx / dist) * step
        shot.y += (dy / dist) * step
        shot.life -= dt
      }
    }
    this.shots = this.shots.filter((s) => s.life > 0)
  }

  private dmgMult(player: Side): number {
    const aura = this.auras[player]
    let mult = 1
    if (aura.surgeUntil > this.time) mult *= aura.surgeMult
    if (aura.furyUntil > this.time) mult *= aura.furyMult
    return mult
  }

  private pickTarget(unit: Unit, aggro: number): Aim | null {
    const enemy: Side = unit.o === 0 ? 1 : 0
    let best: Aim | null = null
    let bestDist = aggro
    for (const other of this.units) {
      if (other.o !== enemy || !this.inFront(unit, other.x)) continue
      const dist = Math.hypot(other.x - unit.x, other.y - unit.y)
      if (dist < bestDist) {
        bestDist = dist
        best = { kind: 'unit', ref: other.id, x: other.x, y: other.y, r: UNITS[other.k].r }
      }
    }
    for (const turret of this.turrets) {
      if (turret.o !== enemy || !this.inFront(unit, turret.x)) continue
      const dist = Math.hypot(turret.x - unit.x, turret.y - unit.y)
      if (dist < bestDist) {
        bestDist = dist
        best = { kind: 'turret', ref: turret.id, x: turret.x, y: turret.y, r: 16 }
      }
    }
    if (best) return best
    const tower = this.frontTower(enemy)
    if (tower) return { kind: 'tower', ref: tower.i + enemy * 10, x: tower.x, y: 0, r: 20 }
    const core = this.cores[enemy]
    return { kind: 'core', ref: enemy, x: core.x, y: 0, r: 28 }
  }

  private inFront(unit: Unit, x: number): boolean {
    return unit.o === 0 ? x >= unit.x - 12 : x <= unit.x + 12
  }

  private frontTower(enemy: Side): Tower | null {
    for (let i = 0; i < 3; i++) {
      const tower = this.towers.find((t) => t.o === enemy && t.i === i && t.alive)
      if (tower) return tower
    }
    return null
  }

  private nearestUnit(owner: Side, x: number, y: number, range: number): Unit | null {
    let best: Unit | null = null
    let bestDist = range
    for (const unit of this.units) {
      if (unit.o !== owner) continue
      const dist = Math.hypot(unit.x - x, unit.y - y)
      if (dist < bestDist) {
        bestDist = dist
        best = unit
      }
    }
    return best
  }

  private locate(kind: Shot['kind'], ref: number, _attacker: Side): Aim | null {
    if (kind === 'unit') {
      const unit = this.units.find((u) => u.id === ref && u.hp > 0)
      if (!unit) return null
      return { kind, ref, x: unit.x, y: unit.y, r: UNITS[unit.k].r }
    }
    if (kind === 'turret') {
      const turret = this.turrets.find((t) => t.id === ref && t.hp > 0)
      if (!turret) return null
      return { kind, ref, x: turret.x, y: turret.y, r: 16 }
    }
    if (kind === 'tower') {
      const enemy = ref >= 10 ? 1 : 0
      const index = ref >= 10 ? ref - 10 : ref
      const tower = this.towers.find((t) => t.o === enemy && t.i === index && t.alive)
      if (!tower) return null
      return { kind, ref, x: tower.x, y: 0, r: 20 }
    }
    const core = this.cores[ref]
    if (!core || core.hp <= 0) return null
    return { kind, ref, x: core.x, y: 0, r: 28 }
  }

  private hurt(target: Aim, dmg: number, attacker: Side) {
    if (target.kind === 'unit') {
      const unit = this.units.find((u) => u.id === target.ref)
      if (!unit) return
      this.applyDamage(unit, dmg)
      return
    }
    if (target.kind === 'turret') {
      const turret = this.turrets.find((t) => t.id === target.ref)
      if (!turret) return
      turret.hp -= dmg
      return
    }
    if (target.kind === 'tower') {
      const enemy: Side = target.ref >= 10 ? 1 : 0
      const index = target.ref >= 10 ? target.ref - 10 : target.ref
      const tower = this.towers.find((t) => t.o === enemy && t.i === index && t.alive)
      if (!tower) return
      tower.hp -= dmg
      if (tower.hp <= 0) this.killTower(tower, attacker)
      return
    }
    const core = this.cores[target.ref]
    if (!core || this.frontTower(core.o)) return
    core.hp -= dmg
  }

  private applyDamage(unit: Unit, dmg: number) {
    let left = dmg
    if (unit.sh > 0) {
      const used = Math.min(unit.sh, left)
      unit.sh -= used
      left -= used
    }
    unit.hp -= left
  }

  private killTower(tower: Tower, attacker: Side) {
    tower.alive = false
    tower.hp = 0
    this.fx.push({ t: 'tower', id: this.fxId++ })
    const n = ++this.rewardsGiven[attacker]
    const reward = n === 1 ? 'ballSave' : n === 2 ? 'comboFloor' : 'doubleCharge'
    this.fx.push({ t: 'reward', player: attacker, reward, id: this.fxId++ })
    this.fx.push({ t: 'gifts', player: tower.o, id: this.fxId++ })
    this.flashes.push({ x: tower.x, y: 0, o: attacker, life: 0.45 })
  }

  private separate(unit: Unit, dt: number) {
    for (const other of this.units) {
      if (other === unit) continue
      const dx = unit.x - other.x
      const dy = unit.y - other.y
      const dist = Math.hypot(dx, dy)
      if (dist > 0 && dist < 20) {
        unit.y += (dy / dist) * 36 * dt
        if (other.o === unit.o && dist < 16) unit.x -= (unit.o === 0 ? 1 : -1) * 20 * dt
      }
    }
  }
}

type Aim = { kind: 'unit' | 'tower' | 'turret' | 'core'; ref: number; x: number; y: number; r: number }

function blankAura(): Aura {
  return { surgeUntil: 0, rushUntil: 0, furyUntil: 0, surgeMult: 1, rushMult: 1, furyMult: 1 }
}
