import { EventEmitter } from 'node:stream'
import { Track } from '../types/Track'
import { TrackResultBase } from '../api/impl/TrackRest'


export type ObjectHeaders<V = ObjectHeader | (string | number | boolean | Buffer)> = {
  [key: string]: V
}

export type ObjectHeader = {
  readonly base64Encoded?: boolean
  readonly base64Decoded?: 'string' | number | null | boolean | ((base64Decoded: string) => boolean)
} | null

export interface INodeState {
  tryReconnect: number
  maxReconnect: number
  destroyed: boolean
  ping?: boolean
  useRest?: boolean
}

export interface INodeConnectionState {
  addressNode: string
  port?: number | null
  password?: string | null
  useSSL?: boolean
  maxReconnect?: number
  time?: number
  version?: string | number
}

export interface INodeSyncState {
  useRest?: boolean
  addressNode?: string
  port?: string
  useSSL?: boolean
}

export interface INodeListeners<T> {
  (event: 'ready', listener: (sessionId: string | null, resumed: boolean) => void): T
  (event: 'debug', listener: (id: string, message: string) => void): T
  (event: 'trace', listener: (id: string, message: string) => void): T
  (event: 'connected', listener: (id: string, timestamp: number) => void): T
  (event: 'reconnect', listener: (id: string, timestamp: number) => void): T
  (event: 'reconnecting', listener: (id: string, timestamp: number) => void): T
  (event: 'disconnect', listener: (id: string, timestamp: number) => void): T
  (event: 'destroy', listener: (id: string, timestamp: number) => void): T
}
export interface INodeVoiceState {
  token: string
  endpoint: string
  sessionId: string
}

export interface INodeClient {
  changeVolumePlayer(playerID: string, volume: number): Promise<null>
  setEqualizerPlayer<T = any[]>(playerID: string, equalizer: T): Promise<null>
  setFiltersPlayer(playerID: string, filters: any): Promise<null>
  playTrack(playerID: string, track: Track, options?: {
    startTime?: number
    endTime?: number
    noReplace?: boolean
  }): Promise<null>
  stopPlayer(playerID: string): Promise<null>
  pausePlayer(playerID: string, pause: boolean): Promise<null>
  destroyPlayer(playerID: string): Promise<null>
  seekPlayer(playerID: string, seek: number): Promise<null>
  connectPlayer(playerID: string, voiceState: INodeVoiceState): Promise<null>
  loadTrack(identifier: string): Promise<TrackResultBase>
}

export interface INode extends EventEmitter {
  on: INodeListeners<this>
}

export interface INodeStats {
  players: number
  playingPlayers: number
  uptime: number
  memory: {
    free: number
    used: number
    allocated: number
    reservable: number
  }
  cpu: {
    cores: number
    systemLoad: number
    lavalinkLoad: number
  }
  frameStats: {
    send: number
    nulled: number
    deficit?: number | null
  }
}


export type VersionNode = ':auto' | ':v2' | ':v3' | ':v4' | ':custom'
export type OpTypes = 'ready' | 'playerUpdate' | 'stats' | 'event'
export type EventOpTypes = 'TrackStartEvent' | 'TrackEndEvent' | 'TrackExceptionEvent' | 'TrackStuckEvent' | 'WebSocketClosedEvent'
export type TrackMessage<T = null, R = null> = {
  encoded: string
  info: {
    identifier: string
    isSeekable: boolean
    author: string
    length: number
    isStream: boolean
    position: number
    title: string
    uri: string | null
    artworkUrl: string | null
    isrc: string | null
    sourceName: string | null
  }
  pluginInfo?: T,
  userData?: R
}

export type TrackException = {
  message?: string | null
  severity?: string | null
  cause?: string | null
}

export type MessageEventNode = |
{
  op: 'event'
  type: 'TrackStartEvent'
  guildId?: string
  track: TrackMessage | null
} | {
  op: 'event'
  type: 'TrackEndEvent'
  guildId?: string
  track?: TrackMessage | null
  reason?: 'finished' | 'loadFailed' | 'stopped' | 'replaced' | 'cleanup' | null
} | {
  op: 'event'
  type: 'TrackExceptionEvent'
  guildId?: string
  track?: TrackMessage | null
  exception?: TrackException | null
} | {
  op: 'event'
  type: 'TrackStuckEvent'
  guildId?: string
  track?: TrackMessage | null
  thresholdMs?: number | null
} | {
  op: 'event'
  type: 'WebSocketClosedEvent'
  guildId?: string
  code?: number
  reason?: string
  byRemote?: boolean
} | {
  op: 'ping'
  timestamp?: number | null
}



export type MessageNode = |
{
  op: 'ready'
  resumed: boolean
  sessionId: string | null
} | {
  op: 'playerUpdate'
  guildId: string
  state: {
    time?: number | null
    position?: number | null
    connected?: boolean | null
    ping?: number | null
  }
} | {
  op: 'stats'
  players: number
  playingPlayers: number
  uptime: number
  memory: {
    free: number
    used: number
    allocated: number
    reservable: number
  }
  cpu: {
    cores: number
    systemLoad: number
    lavalinkLoad: number
  }
  frameStats: {
    send: number
    nulled: number
    deficit?: number | null
  }
} | MessageEventNode

export type NodeMessageClient = |
{
  op: NodeOPClient.Play
  guildId: string
  track: string | null
  startTime?: number
  endTime?: number
  noReplace?: boolean
} | {
  op: NodeOPClient.Stop
  guildId: string
} | {
  op: NodeOPClient.Pause
  guildId: string
  pause: boolean
} | {
  op: NodeOPClient.Seek
  guildId: string
  seek: number
} | {
  op: NodeOPClient.Volume
  guildId: string
  volume: number
} | {
  op: NodeOPClient.PlayerUpdate
  volume?: number
  stop?: boolean
  seek?: number
  pause?: boolean
  destroy?: boolean
  voiceUpdate?: {
    endpoint: string
    guildId: string
    sessionId: string
  }
} | {
  op: NodeOPClient.VoiceUpdate
  endpoint: string
  guildId: string
  sessionId: string
  token: string
} | {
  op: NodeOPClient.Equalizer
  guildId: string
  equalizer: any[]
} | {
  op: NodeOPClient.Filters
  guildId: string
} | {
  op: NodeOPClient.Destroy
  guildId: string
} | {
  op: NodeOPClient.Ping
  timestamp?: number
}

export enum NodeOPClient {
  Play = "play",
  Stop = "Stop",
  Pause = "pause",
  Seek = "seek",
  Volume = "volume",
  Destroy = "destroy",
  PlayerUpdate = "playerUpdate",
  VoiceUpdate = "voiceUpdate",
  Ping = "ping",
  Equalizer = "equalizer",
  Filters = "filters"
}