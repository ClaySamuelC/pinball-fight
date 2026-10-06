import { createAi, aiInput } from './ai'
import { SCORE } from './data'
import { Lane } from './lane'
import { BUMPERS, Pinball } from './pinball'

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message)
}

function finiteBoard(board: Pinball) {
  const ball = board.ball
  if (!ball) return
  assert(Number.isFinite(ball.x) && Number.isFinite(ball.y), 'ball position')
  assert(Number.isFinite(ball.vx) && Number.isFinite(ball.vy), 'ball velocity')
}

const none = { left: false, right: false, plunge: false }

function bumperHit() {
  const board = new Pinball()
  board.held = false
  board.combo = 3
  const bumper = BUMPERS[0]
  board.ball!.x = bumper.x - bumper.r - 8
  board.ball!.y = bumper.y
  board.ball!.vx = 500
  board.ball!.vy = 0
  for (let i = 0; i < 40; i++) board.step(1 / 60, none)
  assert(board.hits > 0, 'bumper should score')
  assert(board.combo >= 4, 'combo should rise')
  assert(board.charges[1] > 0 || board.summons > 0, 'soldier meter should move')
  finiteBoard(board)
}

function drainResetsCombo() {
  const board = new Pinball()
  board.held = false
  board.combo = 5
  board.ball!.x = 160
  board.ball!.y = 700
  board.ball!.vy = 300
  board.step(1 / 60, none)
  assert(board.ball === null, 'ball should leave')
  assert(board.combo === 0, 'combo should clear')
  assert(board.reload === 6, `reload ${board.reload}`)
  for (let i = 0; i < 400; i++) board.step(1 / 60, none)
  assert(board.held && board.ball !== null, 'a new ball should load')
  assert(board.reload === 0, 'reload should finish')
}

function ballSaveKeepsCombo() {
  const board = new Pinball()
  board.held = false
  board.combo = 4
  board.ballSave = true
  board.ball!.x = 160
  board.ball!.y = 700
  board.ball!.vy = 200
  board.step(1 / 60, none)
  assert(board.ball !== null, 'save should keep the ball')
  assert(board.combo === 4, 'save should keep the combo')
  assert(board.reload === 0, 'save should skip the wait')
  assert(!board.ballSave, 'save is spent')
}

function comboFloorAndDouble() {
  const board = new Pinball()
  board.combo = 1
  board.applyReward('comboFloor')
  assert(board.combo === 2, 'combo floor lifts the current combo')
  board.held = false
  board.ball!.x = 160
  board.ball!.y = 700
  board.ball!.vy = 200
  board.step(1 / 60, none)
  assert(board.combo === 0, 'drain still clears the combo')
  for (let i = 0; i < 400; i++) board.step(1 / 60, none)
  assert(board.combo === 2, 'the next ball starts at x2')
  board.doubleLeft = 10
  board.held = false
  board.combo = 1
  const bumper = BUMPERS[1]
  board.ball!.x = bumper.x
  board.ball!.y = bumper.y - bumper.r - 8
  board.ball!.vx = 0
  board.ball!.vy = 500
  const before = board.charges[1] + board.summons * SCORE.cap
  for (let i = 0; i < 30; i++) board.step(1 / 60, none)
  const after = board.charges[1] + board.summons * SCORE.cap
  assert(after > before, 'double charge should add charge')
}

function zoneAndPower() {
  const board = new Pinball()
  board.held = false
  board.ball!.x = 80
  board.ball!.y = 160
  board.ball!.vx = 0
  board.ball!.vy = 0
  board.step(1 / 60, none)
  const events = board.pullEvents()
  assert(events.some((event) => event.t === 'buff' && event.b === 'rush'), 'rush zone should buff')
  board.spawnGifts(2)
  assert(board.powerups.length >= 2, 'tower gifts spawn orbs')
}

function flipperKick() {
  const board = new Pinball()
  board.held = false
  board.ball!.x = 130
  board.ball!.y = 620
  board.ball!.vx = 0
  board.ball!.vy = 40
  let best = 40
  for (let i = 0; i < 30; i++) {
    board.step(1 / 120, { left: true, right: false, plunge: false })
    if (board.ball) best = Math.min(best, board.ball.vy)
  }
  assert(best < -80, `flipper should launch the ball upward, vy ${best}`)
}

function soak() {
  const board = new Pinball()
  const ai = createAi()
  let maxSpeed = 0
  for (let i = 0; i < 20 * 60; i++) {
    const input = aiInput(board, 1 / 60, ai)
    board.step(1 / 60, input)
    finiteBoard(board)
    if (board.ball) maxSpeed = Math.max(maxSpeed, Math.hypot(board.ball.vx, board.ball.vy))
  }
  console.log(`soak hits=${board.hits} summons=${board.summons} drains=${board.drains} nudges=${board.nudges} max=${maxSpeed.toFixed(0)}`)
  assert(board.nudges < 30, `too many nudges ${board.nudges}`)
  assert(board.hits > 0, 'the ball should hit scoring targets')
}

function laneBattle() {
  const lane = new Lane()
  for (let n = 0; n < 12; n++) lane.apply(0, { t: 'summon', unit: 'siege', id: n + 1 })
  lane.apply(0, { t: 'power', p: 'turret', id: 40 })
  lane.apply(0, { t: 'power', p: 'turret', id: 40 })
  assert(lane.turrets.length === 1, 'duplicate turret action is ignored')
  lane.apply(0, { t: 'buff', b: 'rush', combo: 4, id: 41 })
  lane.apply(1, { t: 'summon', unit: 'scout', id: 1 })
  lane.apply(0, { t: 'power', p: 'nuke', id: 42 })
  assert(lane.units.every((unit) => unit.o === 0), 'nuke removes enemy fighters')
  let sawSave = false
  let sawFloor = false
  let sawDouble = false
  let gifts = 0
  for (let i = 0; i < 50 * 60; i++) {
    lane.step(1 / 60)
    for (const event of lane.pullFx()) {
      if (event.t === 'reward' && event.reward === 'ballSave') sawSave = true
      if (event.t === 'reward' && event.reward === 'comboFloor') sawFloor = true
      if (event.t === 'reward' && event.reward === 'doubleCharge') sawDouble = true
      if (event.t === 'gifts') gifts++
    }
    if (lane.winner === 0) break
  }
  const enemyCore = lane.cores.find((core) => core.o === 1)!
  console.log(`lane winner=${lane.winner} core=${enemyCore.hp} gifts=${gifts} towers=${lane.towers.filter((t) => t.o === 1 && !t.alive).length}`)
  assert(sawSave && sawFloor && sawDouble, 'tower rewards follow ball save, combo, then double charge')
  assert(gifts >= 3, 'each fallen tower gifts the defender')
  assert(lane.winner === 0 || enemyCore.hp < enemyCore.max, 'siege should damage the enemy core or win')
}

bumperHit()
drainResetsCombo()
ballSaveKeepsCombo()
comboFloorAndDouble()
zoneAndPower()
flipperKick()
soak()
laneBattle()
console.log('selftest ok')
