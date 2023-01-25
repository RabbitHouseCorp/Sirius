import { LavalinkCPUStats, LavalinkFrameStats, LavalinkMemoryStats, TrackException } from './types'

export enum EventPlayer {
  TrackStartEvent = 'TrackStartEvent',
  TrackEndEvent = 'TrackEndEvent',
  TrackExceptionEvent = 'TrackExceptionEvent',
  TrackStuckEvent = 'TrackStuckEvent',
  WebSocketClosedEvent = 'WebSocketClosedEvent'

}
export enum TrackEndReason {
  FINISHED = 'FINISHED',
  LOAD_FAILED = 'LOAD_FAILED',
  STOPPED = 'STOPPED',
  REPLACED = 'REPLACED',
  CLEANUP = 'CLEANUP'
}


export const TrackEndReasonConstants = {
  Finished: {
    reason: 'FINISHED',
    description: 'The track finished playing',
    mayStartNext: true
  },
  LoadFailed: {
    reason: 'LOAD_FAILED',
    description: 'The track failed to load',
    mayStartNext: true
  },
  Stopped: {
    reason: 'STOPPED',
    description: 'The track was stopped',
    mayStartNext: false
  },
  Replaced: {
    reason: 'REPLACED',
    description: 'The track was replaced',
    mayStartNext: false
  },
  Cleanup: {
    reason: 'CLEANUP',
    description: 'The track was cleaned up',
    mayStartNext: false
  },
}

export interface TrackStartEvent {
  encodedTrack: string
  track: string
}

export interface TrackEndEvent {
  encodedTrack: string
  track: string
  reason: string
}


export interface PlayerState {
  time: number
  position: number
  connected: boolean
  ping: number
}


export type TypeReady = {
  'op': 'ready',
  'resumed': boolean,
  'sessionId': string
}

export type TypePlayerUpdate = {
  'op': 'playerUpdate'
  'guildId': string,
  'state': PlayerState
}

export type TypeStats = {
  'op': 'stats',
  'players': number;
  'playingPlayers': number;
  'uptime': number;
  'memory': LavalinkMemoryStats
  'cpu': LavalinkCPUStats
  'frameStats'?: LavalinkFrameStats | null
}

export type TypeEvent =
  | { 'op': 'event', 'type': EventPlayer.TrackStartEvent | 'TrackStartEvent', 'guildId': string, 'encodedTrack': string, 'track': string }
  | { 'op': 'event', 'type': EventPlayer.TrackEndEvent | 'TrackEndEvent', 'guildId': string, 'encodedTrack': string, 'track': string, 'reason': TrackEndReason }
  | { 'op': 'event', 'type': EventPlayer.TrackExceptionEvent | 'TrackExceptionEvent', 'guildId': string, 'encodedTrack': string, 'track': string, 'exception': TrackException }
  | { 'op': 'event', 'type': EventPlayer.TrackStuckEvent | 'TrackStuckEvent', 'guildId': string, 'encodedTrack': string, 'track': string, 'thresholdMs': number }
  | { 'op': 'event', 'type': EventPlayer.WebSocketClosedEvent | 'WebSocketClosedEvent', 'guildId': string, 'encodedTrack': string, 'track': string, 'code': number, 'reason': string, 'byRemote': boolean }

export interface PlayingTrack {
  trackEncoded: string | null
  
}

export type MessageLavalink =
  | TypeReady
  | TypePlayerUpdate
  | TypeStats
  | TypeEvent


