import { createAi, aiInput, type AiState } from './ai'
import { isMuted, play, setMuted, unlock } from './audio'
import { cleanCode, makeCode, type FxEvent, type GameAction, type RewardKind, type Side } from './data'
import { Lane, type LaneSnap } from './lane'
import { joinRoomCode, type NetMsg, type Session } from './net'
import { Pinball, type BoardSnap, type Input } from './pinball'
import { draw, resetView, type Scene } from './render'

type Mode = 'attract' | 'connecting' | 'waiting' | 'play' | 'end'
type Role = 'solo' | 'host' | 'guest'

type World = {
  left: Pinball
  right: Pinball | null
  rightSnap: BoardSnap | null
  lane: Lane | null
  laneSnap: LaneSnap | null
  aiL: AiState
  aiR: AiState
}

const canvas = document.querySelector<HTMLCanvasElement>('#view')!
const ctx = canvas.getContext('2d')!
const lobby = document.querySelector<HTMLElement>('#lobby')!
const home = document.querySelector<HTMLElement>('#home')!
const wait = document.querySelector<HTMLElement>('#wait')!
const help = document.querySelector<HTMLElement>('#helpbox')!
const end = document.querySelector<HTMLElement>('#end')!
const endTitle = document.querySelector<HTMLElement>('#endTitle')!
const endBody = document.querySelector<HTMLElement>('#endBody')!
const bannerEl = document.querySelector<HTMLElement>('#banner')!
const touch = document.querySelector<HTMLElement>('#touch')!
const codeInput = document.querySelector<HTMLInputElement>('#codeInput')!
const homeError = document.querySelector<HTMLElement>('#homeError')!
const waitText = document.querySelector<HTMLElement>('#waitText')!
const codeView = document.querySelector<HTMLElement>('#codeView')!
const soundBtn = document.querySelector<HTMLButtonElement>('#sound')!

const keys = new Set<string>()
const pointers = { left: false, right: false, launch: false }
const debug = new URLSearchParams(location.search).has('debug')

let mode: Mode = 'attract'
let role: Role = 'solo'
let me: Side = 0
let online = false
let code = ''
let nonce = 0
let session: Session | null = null
let token = 0
let opponent: string | null = null
let pending: GameAction[] = []
let winner: Side | null = null
let shake = 0
let flash = 0
let bannerLife = 0
let connectLeft = 0
let helloAcc = 0
let sendAcc = 0
let rematchN = 0
let last = performance.now()
const seenFx = new Set<number>()
const idleSnap = new Pinball().snapshot()

const attract: World = {
  left: new Pinball(),
  right: new Pinball(),
  rightSnap: null,
  lane: new Lane(),
  laneSnap: null,
  aiL: createAi(),
  aiR: createAi(),
}
let match: World | null = null

const blankLane = new Lane().snapshot()

function humanBoard(): Pinball {
  const board = new Pinball()
  board.onSound = (sfx) => play(sfx)
  board.onAnnounce = (text) => showBanner(text)
  return board
}

function readInput(): Input {
  return {
    left: keys.has('arrowleft') || keys.has('a') || keys.has('z') || pointers.left,
    right: keys.has('arrowright') || keys.has('l') || keys.has('d') || keys.has('/') || pointers.right,
    plunge: keys.has(' ') || keys.has('arrowdown') || pointers.launch,
  }
}

function showBanner(text: string) {
  bannerEl.textContent = text
  bannerEl.classList.add('show')
  bannerLife = 1.5
}

function rewardText(reward: RewardKind): string {
  if (reward === 'ballSave') return 'BALL SAVE'
  if (reward === 'comboFloor') return 'COMBO x2'
  return 'DOUBLE CHARGE'
}

function applyTo(board: Pinball | null, event: FxEvent) {
  if (!board) return
  if (event.t === 'reward') board.applyReward(event.reward)
  if (event.t === 'gifts') board.spawnGifts(2)
}

function handleFx(event: FxEvent, fromNet: boolean) {
  if (seenFx.has(event.id)) return
  seenFx.add(event.id)
  if (!match) return
  if (event.t === 'reward' || event.t === 'gifts') {
    if (event.player === me) applyTo(match.left, event)
    else applyTo(match.right, event)
    if (event.player === me) showBanner(event.t === 'gifts' ? 'POWERUPS' : rewardText(event.reward))
  } else if (event.t === 'tower') {
    showBanner('TOWER DOWN')
    play('tower')
    shake = Math.max(shake, 0.2)
  } else if (event.t === 'nuke') {
    if (event.player === me) showBanner('NUKE')
    play('nuke')
    flash = 1
    shake = 0.3
  } else if (event.t === 'win') finish(event.player)
  if (!fromNet && session && role === 'host') session.send({ k: 'fx', e: event })
}

function finish(winnerSide: Side) {
  if (mode !== 'play') return
  mode = 'end'
  winner = winnerSide
  play(winnerSide === me ? 'win' : 'lose')
  endTitle.textContent = winnerSide === me ? 'YOU WIN' : 'YOU LOSE'
  endBody.textContent = winnerSide === me ? 'The enemy core fell.' : 'Your core fell.'
  end.classList.remove('hidden')
  updateTouch()
}

function showLeft() {
  if (mode === 'end') return
  mode = 'end'
  endTitle.textContent = 'OPPONENT LEFT'
  endBody.textContent = 'Opponent left the match.'
  end.classList.remove('hidden')
  updateTouch()
}

function feed(board: Pinball, dt: number, input: Input, player: Side, lane: Lane) {
  board.step(dt, input)
  for (const event of board.pullEvents()) lane.apply(player, event)
}

function stepAttract(dt: number) {
  const lane = attract.lane!
  feed(attract.left, dt, aiInput(attract.left, dt, attract.aiL), 0, lane)
  feed(attract.right!, dt, aiInput(attract.right!, dt, attract.aiR), 1, lane)
  lane.step(dt)
  for (const event of lane.pullFx()) {
    if (event.t === 'reward' || event.t === 'gifts') applyTo(event.player === 0 ? attract.left : attract.right, event)
  }
  if (lane.winner !== null) {
    attract.left.reset()
    attract.right!.reset()
    lane.reset()
  }
}

function stepPlay(dt: number) {
  if (!match) return
  match.left.step(dt, readInput())
  if (role === 'guest') pending.push(...match.left.pullEvents())
  else if (match.lane) {
    for (const event of match.left.pullEvents()) match.lane.apply(me, event)
    if (match.right) feed(match.right, dt, aiInput(match.right, dt, match.aiR), 1, match.lane)
    match.lane.step(dt)
    for (const event of match.lane.pullFx()) handleFx(event, false)
    if (match.lane.winner !== null) finish(match.lane.winner)
  }
  if (!online || !session) return
  sendAcc += dt
  if (sendAcc < 0.08) return
  sendAcc = 0
  session.send({ k: 'board', s: match.left.snapshot() })
  if (role === 'host' && match.lane) session.send({ k: 'lane', s: match.lane.snapshot() })
  if (role === 'guest' && pending.length) session.send({ k: 'act', list: pending.slice(0, 24) })
}

function onNet(msg: NetMsg, id: string) {
  if (msg.k === 'hello') {
    if (role === 'host' && msg.role === 'host') {
      if (msg.nonce < nonce) void reroll()
      else if (msg.nonce > nonce) session?.send({ k: 'taken' }, id)
      return
    }
    if (role === 'host' && msg.role === 'guest') {
      if (opponent && opponent !== id) {
        session?.send({ k: 'full' }, id)
        return
      }
      const fresh = !opponent
      opponent = id
      session?.send({ k: 'welcome' }, id)
      if (fresh) startRound()
      return
    }
    if (role === 'guest') session?.send({ k: 'hello', role: 'guest', nonce }, id)
    return
  }
  if (msg.k === 'welcome' && role === 'guest' && mode !== 'play' && mode !== 'end') {
    opponent = id
    startRound()
    return
  }
  if (msg.k === 'full') return fail('That match is full.')
  if (msg.k === 'taken' && role === 'host') return void reroll()
  if (msg.k === 'taken' && role === 'guest') return fail('That code belongs to a different match.')
  if (!match || (mode !== 'play' && mode !== 'end')) return
  if (msg.k === 'board') match.rightSnap = msg.s
  else if (msg.k === 'lane') {
    match.laneSnap = msg.s
    pending = pending.filter((action) => action.id > msg.s.acks[me])
    if (msg.s.winner !== null) finish(msg.s.winner)
  } else if (msg.k === 'act' && role === 'host' && match.lane) {
    for (const action of msg.list) match.lane.apply(1, action)
  } else if (msg.k === 'fx') handleFx(msg.e, true)
  else if (msg.k === 'rematch' && msg.n > rematchN) {
    rematchN = msg.n
    startRound()
  }
}

function fail(message: string) {
  void closeNet()
  mode = 'attract'
  online = false
  role = 'solo'
  home.classList.remove('hidden')
  wait.classList.add('hidden')
  lobby.classList.remove('hidden')
  homeError.textContent = message
  updateTouch()
}

async function closeNet() {
  const current = session
  session = null
  opponent = null
  token++
  current?.leave()
}

async function openNet(nextCode: string, as: 'host' | 'guest') {
  await closeNet()
  const my = ++token
  code = nextCode
  nonce = Math.floor(Math.random() * 1_000_000_000)
  online = true
  role = as
  me = as === 'host' ? 0 : 1
  mode = as === 'host' ? 'waiting' : 'connecting'
  connectLeft = 18
  helloAcc = 0
  opponent = null
  home.classList.add('hidden')
  wait.classList.remove('hidden')
  lobby.classList.remove('hidden')
  codeView.textContent = `${nextCode.slice(0, 2)} ${nextCode.slice(2)}`
  waitText.textContent =
    as === 'host'
      ? 'Share this code. Your friend enters it on the home screen.'
      : 'Looking for that match. This can take a few seconds.'
  homeError.textContent = ''
  try {
    const next = await joinRoomCode(nextCode, {
      onPeer: (id) => {
        if (my !== token) return
        session?.send({ k: 'hello', role: as, nonce }, id)
      },
      onLeave: (id) => {
        if (my !== token) return
        if (mode === 'waiting' || mode === 'connecting') {
          if (opponent === id) opponent = null
          return
        }
        if ((mode === 'play' || mode === 'end') && (opponent === id || opponent === null)) showLeft()
      },
      onMsg: (msg, id) => {
        if (my !== token) return
        onNet(msg, id)
      },
      onError: (message) => {
        if (my !== token) return
        if (mode === 'play') showBanner(message)
        else fail(message)
      },
    })
    if (my !== token) {
      next.leave()
      return
    }
    session = next
  } catch {
    if (my === token) fail('Could not open a connection. Try again.')
  }
}

async function reroll() {
  const next = makeCode()
  showBanner('NEW CODE')
  await openNet(next, 'host')
}

function startRound() {
  mode = 'play'
  winner = null
  pending = []
  sendAcc = 0
  seenFx.clear()
  resetView()
  lobby.classList.add('hidden')
  end.classList.add('hidden')
  const lane = role === 'guest' ? null : new Lane()
  match = {
    left: humanBoard(),
    right: role === 'solo' ? new Pinball() : null,
    rightSnap: null,
    lane,
    laneSnap: null,
    aiL: createAi(),
    aiR: createAi(),
  }
  if (role === 'guest') me = 1
  else me = 0
  updateTouch()
}

function currentSnap(): { left: BoardSnap; right: BoardSnap; lane: LaneSnap; hint: string } {
  const playing = (mode === 'play' || mode === 'end') && match
  if (!playing || !match) {
    return {
      left: attract.left.snapshot(),
      right: attract.right!.snapshot(),
      lane: attract.lane!.snapshot(),
      hint: '',
    }
  }
  const hint = mode === 'play' && match.left.held ? 'HOLD SPACE TO LAUNCH' : ''
  return {
    left: match.left.snapshot(),
    right: match.right ? match.right.snapshot() : (match.rightSnap ?? idleSnap),
    lane: match.lane ? match.lane.snapshot() : (match.laneSnap ?? blankLane),
    hint,
  }
}

function scene(dt: number, now: number): Scene {
  const view = currentSnap()
  const playing = mode === 'play' || mode === 'end'
  const coarse = matchMedia('(pointer: coarse)').matches || innerWidth < 980
  return {
    w: canvas.clientWidth,
    h: canvas.clientHeight,
    time: now / 1000,
    dt,
    me,
    left: view.left,
    right: view.right,
    lane: view.lane,
    smoothLane: playing && role === 'guest',
    smoothRight: playing && online,
    names: playing ? ['YOU', role === 'solo' ? 'RIVAL' : 'FRIEND'] : ['WEST', 'EAST'],
    hint: coarse && view.hint ? 'HOLD LAUNCH' : view.hint,
    code: playing && online ? code : '',
    shake,
    flash,
    debug,
    bottom: touch.classList.contains('hidden') ? 18 : 104,
  }
}

function frame(now: number) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000))
  last = now
  if (mode === 'attract' || mode === 'connecting' || mode === 'waiting') stepAttract(dt)
  else if (mode === 'play') stepPlay(dt)
  if ((mode === 'connecting' || mode === 'waiting') && session) {
    helloAcc += dt
    connectLeft -= dt
    if (helloAcc > 1.1) {
      helloAcc = 0
      session.send({ k: 'hello', role: role === 'host' ? 'host' : 'guest', nonce })
    }
    if (role === 'guest' && mode === 'connecting' && connectLeft <= 0) fail('No match found for that code.')
  }
  if (shake > 0) shake = Math.max(0, shake - dt)
  if (flash > 0) flash = Math.max(0, flash - dt * 2.4)
  if (bannerLife > 0) {
    bannerLife -= dt
    if (bannerLife <= 0) bannerEl.classList.remove('show')
  }
  const dpr = Math.min(2, devicePixelRatio || 1)
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr)
    canvas.height = Math.floor(h * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  draw(ctx, scene(dt, now))
  requestAnimationFrame(frame)
}

function updateTouch() {
  const show = mode === 'play' && (matchMedia('(pointer: coarse)').matches || innerWidth < 980)
  touch.classList.toggle('hidden', !show)
}

function bindHold(el: HTMLElement, set: (down: boolean) => void) {
  el.addEventListener('pointerdown', (event) => {
    event.preventDefault()
    el.setPointerCapture(event.pointerId)
    set(true)
    unlock()
  })
  const up = () => set(false)
  el.addEventListener('pointerup', up)
  el.addEventListener('pointercancel', up)
}

function watchKeys() {
  addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
    keys.add(event.key.toLowerCase())
    if ([' ', 'arrowleft', 'arrowright', 'arrowdown'].includes(event.key.toLowerCase())) event.preventDefault()
  })
  addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()))
  addEventListener('blur', () => keys.clear())
}

function wireUi() {
  document.querySelector('#create')!.addEventListener('click', () => {
    unlock()
    void openNet(makeCode(), 'host')
  })
  document.querySelector('#join')!.addEventListener('click', () => {
    unlock()
    joinFromInput()
  })
  codeInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      joinFromInput()
    }
  })
  document.querySelector('#practice')!.addEventListener('click', () => {
    unlock()
    void closeNet()
    online = false
    role = 'solo'
    code = ''
    startRound()
  })
  document.querySelector('#cancel')!.addEventListener('click', () => {
    void closeNet()
    online = false
    role = 'solo'
    mode = 'attract'
    wait.classList.add('hidden')
    home.classList.remove('hidden')
    homeError.textContent = ''
  })
  document.querySelector('#copy')!.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code)
      showBanner('COPIED')
    } catch {
      showBanner(code)
    }
  })
  document.querySelector('#again')!.addEventListener('click', () => {
    unlock()
    if (online && session) {
      rematchN += 1
      session.send({ k: 'rematch', n: rematchN })
    }
    startRound()
  })
  document.querySelector('#menu')!.addEventListener('click', () => {
    void closeNet()
    online = false
    role = 'solo'
    mode = 'attract'
    match = null
    end.classList.add('hidden')
    home.classList.remove('hidden')
    wait.classList.add('hidden')
    lobby.classList.remove('hidden')
    resetView()
    updateTouch()
  })
  document.querySelector('#help')!.addEventListener('click', () => {
    unlock()
    help.classList.toggle('hidden')
  })
  document.querySelector('#helpClose')!.addEventListener('click', () => help.classList.add('hidden'))
  soundBtn.addEventListener('click', () => {
    unlock()
    setMuted(!isMuted())
    soundBtn.textContent = isMuted() ? 'SOUND OFF' : 'SOUND ON'
  })
  bindHold(document.querySelector('#flipL')!, (down) => {
    pointers.left = down
  })
  bindHold(document.querySelector('#flipR')!, (down) => {
    pointers.right = down
  })
  bindHold(document.querySelector('#launch')!, (down) => {
    pointers.launch = down
  })
  addEventListener('pointerdown', () => unlock())
  addEventListener('resize', updateTouch)
}

function joinFromInput() {
  const raw = codeInput.value
  const upper = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (upper.length !== 4) {
    homeError.textContent = 'Enter the 4 letter code.'
    return
  }
  if ([...upper].some((ch) => 'IO01'.includes(ch))) {
    homeError.textContent = 'Skip I, O, 0, and 1. Those characters are left out so codes stay clear.'
    return
  }
  const next = cleanCode(raw)
  if (!next) {
    homeError.textContent = 'Enter the 4 letter code.'
    return
  }
  homeError.textContent = ''
  void openNet(next, 'guest')
}

watchKeys()
wireUi()
updateTouch()
requestAnimationFrame(frame)
