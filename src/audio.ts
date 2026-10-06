import type { Sfx } from './data'

let ctx: AudioContext | null = null
let muted = false
let last = 0

export function isMuted(): boolean {
  return muted
}

export function setMuted(next: boolean) {
  muted = next
}

export function unlock() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return
  if (!ctx) ctx = new Ctx()
  if (ctx.state === 'suspended') void ctx.resume()
}

export function play(name: Sfx) {
  if (muted || !ctx) return
  const now = ctx.currentTime
  if (now - last < 0.02 && (name === 'score' || name === 'bumper')) return
  last = now
  const tone = (freq: number, dur: number, type: OscillatorType, gain: number, slide = 0) => {
    const osc = ctx!.createOscillator()
    const amp = ctx!.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, now)
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), now + dur)
    amp.gain.setValueAtTime(gain, now)
    amp.gain.exponentialRampToValueAtTime(0.0001, now + dur)
    osc.connect(amp)
    amp.connect(ctx!.destination)
    osc.start(now)
    osc.stop(now + dur + 0.02)
  }
  if (name === 'flip') tone(210, 0.04, 'square', 0.03)
  else if (name === 'bumper') tone(480, 0.07, 'square', 0.045, 80)
  else if (name === 'score') tone(620, 0.06, 'triangle', 0.04, 140)
  else if (name === 'summon') {
    tone(420, 0.12, 'sawtooth', 0.04, 280)
  } else if (name === 'launch') tone(180, 0.12, 'sawtooth', 0.04, 220)
  else if (name === 'drain') tone(240, 0.22, 'sine', 0.05, -160)
  else if (name === 'save') tone(520, 0.14, 'triangle', 0.05, 200)
  else if (name === 'power') tone(700, 0.1, 'square', 0.04, 180)
  else if (name === 'zone') tone(360, 0.1, 'triangle', 0.04, 90)
  else if (name === 'tower') tone(90, 0.28, 'sawtooth', 0.06, -30)
  else if (name === 'nuke') tone(140, 0.32, 'sawtooth', 0.07, -80)
  else if (name === 'win') tone(523, 0.2, 'triangle', 0.05, 200)
  else if (name === 'lose') tone(196, 0.28, 'sine', 0.05, -80)
}
