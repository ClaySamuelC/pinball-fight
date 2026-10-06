export const BOARD_W = 320
export const BOARD_H = 680
export const BALL_R = 7
export const LANE_W = 1000

export const UNIT_KINDS = ['scout', 'soldier', 'archer', 'brute', 'siege'] as const
export type UnitKind = (typeof UNIT_KINDS)[number]
export type PowerKind = 'surge' | 'nuke' | 'turret'
export type ZoneKind = 'rush' | 'aegis' | 'fury'
export type RewardKind = 'ballSave' | 'comboFloor' | 'doubleCharge'
export type Side = 0 | 1

export type Sfx =
  | 'flip'
  | 'bumper'
  | 'score'
  | 'summon'
  | 'drain'
  | 'save'
  | 'power'
  | 'launch'
  | 'zone'
  | 'tower'
  | 'nuke'
  | 'win'
  | 'lose'

export type GameAction =
  | { t: 'summon'; unit: UnitKind; id: number }
  | { t: 'power'; p: PowerKind; id: number }
  | { t: 'buff'; b: ZoneKind; combo: number; id: number }

export type FxEvent =
  | { t: 'reward'; player: Side; reward: RewardKind; id: number }
  | { t: 'gifts'; player: Side; id: number }
  | { t: 'tower'; id: number }
  | { t: 'nuke'; player: Side; id: number }
  | { t: 'win'; player: Side; id: number }

export const SCORE = {
  rollover: 42,
  bumper: 20,
  standup: 38,
  drop: 100,
  spinner: 14,
  cap: 100,
  comboCap: 8,
}

export type UnitStat = {
  label: string
  hp: number
  dmg: number
  speed: number
  range: number
  cd: number
  r: number
  y: number
  melee: boolean
  tower: number
  color: string
}

export const UNITS: Record<UnitKind, UnitStat> = {
  scout: {
    label: 'SCOUT',
    hp: 46,
    dmg: 7,
    speed: 180,
    range: 28,
    cd: 0.5,
    r: 11,
    y: -28,
    melee: true,
    tower: 0,
    color: '#7dffb2',
  },
  soldier: {
    label: 'SOLDIER',
    hp: 108,
    dmg: 12,
    speed: 118,
    range: 30,
    cd: 0.78,
    r: 13,
    y: 0,
    melee: true,
    tower: 0,
    color: '#63b4ff',
  },
  archer: {
    label: 'ARCHER',
    hp: 64,
    dmg: 10,
    speed: 112,
    range: 132,
    cd: 0.92,
    r: 12,
    y: -12,
    melee: false,
    tower: 0,
    color: '#d9a6ff',
  },
  brute: {
    label: 'BRUTE',
    hp: 260,
    dmg: 20,
    speed: 70,
    range: 32,
    cd: 1.05,
    r: 16,
    y: 26,
    melee: true,
    tower: 0,
    color: '#ff7d59',
  },
  siege: {
    label: 'SIEGE',
    hp: 160,
    dmg: 8,
    speed: 80,
    range: 156,
    cd: 1.25,
    r: 14,
    y: 12,
    melee: false,
    tower: 28,
    color: '#ffe56a',
  },
}

export const TOWER_HP = 480
export const TOWER_DMG = 15
export const TOWER_RANGE = 188
export const TOWER_CD = 0.86
export const CORE_HP = 700
export const TURRET_HP = 150
export const TURRET_DMG = 11
export const TURRET_RANGE = 156
export const TURRET_CD = 0.68

export const ZONE_LABEL: Record<ZoneKind, { title: string; sub: string }> = {
  rush: { title: 'RUSH', sub: 'SPEED' },
  aegis: { title: 'AEGIS', sub: 'SHIELD' },
  fury: { title: 'FURY', sub: 'DAMAGE' },
}

export const POWER_LABEL: Record<PowerKind, string> = {
  surge: 'SURGE',
  nuke: 'NUKE',
  turret: 'TURRET',
}

export const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function makeCode(): string {
  let code = ''
  for (let i = 0; i < 4; i++) code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return code
}

export function cleanCode(raw: string): string | null {
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (code.length !== 4) return null
  for (const ch of code) if (!ALPHABET.includes(ch)) return null
  return code
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}
