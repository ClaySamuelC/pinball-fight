import type { Input } from './pinball'
import type { Pinball } from './pinball'

export type AiState = {
  hold: number
  wait: number
  planY: number
  goLeft: boolean
  goRight: boolean
}

export function createAi(): AiState {
  return { hold: 0, wait: 0.3, planY: -1, goLeft: false, goRight: false }
}

export function aiInput(board: Pinball, dt: number, ai: AiState): Input {
  if (board.held) {
    if (ai.hold === 0) ai.wait = 0.22 + Math.random() * 0.5
    ai.hold += dt
    ai.planY = -1
    return { left: false, right: false, plunge: ai.hold < ai.wait }
  }
  ai.hold = 0
  const ball = board.ball
  if (!ball) return { left: false, right: false, plunge: false }
  if (ball.vy > 0 && ball.y > 460 && ai.planY < 0) {
    ai.planY = ball.y
    ai.goLeft = ball.x < 176 && Math.random() > 0.12
    ai.goRight = ball.x > 144 && Math.random() > 0.12
  }
  if (ball.y < 430 || ball.vy < 0) ai.planY = -1
  if (ai.planY > 0 && ball.y > 500) {
    return { left: ai.goLeft, right: ai.goRight, plunge: false }
  }
  return { left: false, right: false, plunge: false }
}
