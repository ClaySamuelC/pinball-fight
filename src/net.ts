import type { BoardSnap } from './pinball'
import type { LaneSnap } from './lane'
import type { FxEvent, GameAction, Side } from './data'

export type NetMsg =
  | { k: 'hello'; role: 'host' | 'guest'; nonce: number }
  | { k: 'welcome' }
  | { k: 'full' }
  | { k: 'taken' }
  | { k: 'board'; s: BoardSnap }
  | { k: 'lane'; s: LaneSnap }
  | { k: 'act'; list: GameAction[] }
  | { k: 'fx'; e: FxEvent }
  | { k: 'rematch'; n: number }

type Handlers = {
  onPeer: (id: string) => void
  onLeave: (id: string) => void
  onMsg: (msg: NetMsg, id: string) => void
  onError: (message: string) => void
}

export type Session = {
  send: (msg: NetMsg, target?: string) => void
  leave: () => void
}

type ActionLike = {
  send: (data: NetMsg, opts?: { target?: string }) => Promise<unknown>
  onMessage: ((data: NetMsg, ctx: { peerId: string }) => void) | null
}

type RoomLike = {
  leave: () => void
  onPeerJoin: ((id: string) => void) | null
  onPeerLeave: ((id: string) => void) | null
  makeAction: (name: string) => ActionLike
}

export async function joinRoomCode(code: string, handlers: Handlers): Promise<Session> {
  const mod = (await import('trystero')) as {
    joinRoom: (config: object, roomId: string, callbacks?: object) => RoomLike
  }
  const room = mod.joinRoom(
    { appId: 'pinball-nexus-fight', relayConfig: { redundancy: 4 } },
    `pnx-${code}`,
    {
      onJoinError: () => {
        handlers.onError('Could not open a connection. Try the code again.')
      },
    },
  )
  const action = room.makeAction('m')
  action.onMessage = (data, ctx) => {
    if (!data || typeof data !== 'object' || !('k' in data)) return
    handlers.onMsg(data, ctx.peerId)
  }
  room.onPeerJoin = (id) => handlers.onPeer(id)
  room.onPeerLeave = (id) => handlers.onLeave(id)
  return {
    send(msg, target) {
      void action.send(msg, target ? { target } : undefined).catch(() => {})
    },
    leave() {
      action.onMessage = null
      room.onPeerJoin = null
      room.onPeerLeave = null
      room.leave()
    },
  }
}

export type Role = 'host' | 'guest'
export type OnlineSide = { role: Role; me: Side }
