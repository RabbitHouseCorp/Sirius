import {
  AudioTrack,
  FailingAddress,
  Filters,
  InfoResponse,
  IpBlock,
  LavalinkStats,
  LoadResultType,
  PlaylistInfo,
  RoutePlannerTypes,
  Track,
  TrackException,
  VoiceState
} from './types'


export interface ErrorResponse {
  timestamp: number
  status: number
  error: string
  trace?: string
  message: string
  path: string
}


export interface IPlayerRest {
  guildId: string
  track: Track | null
  volume: number
  paused: boolean
  voice: VoiceState
  filters: Filters
}

export interface IRequestUpdatePlayer {
  encodedPlayer?: string | null
  identifier?: string
  position?: number
  endTime?: number
  volume?: number
  paused?: boolean
  filters?: Filters
  voice?: VoiceState
}

export interface IUpdateSession {
  resumingKey?: string | null
  timeout?: number
}


export interface RoutePlanner {
  class: RoutePlannerTypes | null
  details: RoutePlannerDetails | null
}

export interface RoutePlannerDetails {
  ipBlock: IpBlock
  failingAddresses: FailingAddress[]
  rotateIndex: string
  ipIndex: string
  currentAddress: string
  currentAddressIndex: string
  blockIndex: string
}


export interface LavalinkVoiceState {
  op?: number
  d?: LavalinkVoiceStateData
  event?: LavalinkVoiceEvent
}

export interface LavalinkPacketVoice {
  sessionId: string
  event: LavalinkVoiceEvent
}

export interface LavalinkVoiceEvent {
  token: string
  guildId: string
  endpoint: string
}

export interface LavalinkVoiceStateData {
  selfDeaf: boolean
  selfMute: boolean
  guildId: string
  channelId: string | null
}



export type LoadType =
  | { 'loadType': LoadResultType.trackLoaded | 'TRACK_LOADED', 'playlistInfo': PlaylistInfo, 'tracks': Track[] | AudioTrack[] }
  | { 'loadType': LoadResultType.playlistLoaded | 'PLAYLIST_LOADED', 'playlistInfo': PlaylistInfo | {}, 'tracks': Track[] | AudioTrack[] }
  | { 'loadType': LoadResultType.searchResult | 'SEARCH_RESULT', 'playlistInfo': PlaylistInfo | {}, 'tracks': Track[] | AudioTrack[] }
  | { 'loadType': LoadResultType.noMatches | 'NO_MATCHES', 'playlistInfo': PlaylistInfo | {}, 'tracks': Track[] | AudioTrack[] }
  | { 'loadType': LoadResultType.loadFailed | 'LOAD_FAILED', 'playlistInfo': PlaylistInfo | {}, 'tracks': Track[] | AudioTrack[], 'exception'?: TrackException | null }


/**
 * @endpoint GET /{versionApi}/sessions/{sessionId}/players
 */
export type TypePlayersRest = IPlayerRest[]
/**
 * @endpoint GET /{versionApi}/sessions/{sessionId}/players/{guildId}
 */
export type TypePlayerRest = IPlayerRest
/**
 * @endpoint PATCH /{versionApi}/sessions/{sessionId}/players/{guildId}?noReplace=true
 * @query {noReplace} Whether to replace the current track with the new track. Defaults to `false`
 */
export type TypeRequestUpdatePlayer = IRequestUpdatePlayer
/**
 * @endpoint GET /{versionApi}/info
 */
export type TypeInfoLavalink = InfoResponse
export type TypeStatsLavalink = LavalinkStats


