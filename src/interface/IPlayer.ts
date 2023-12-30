import { PlayerUpdateState } from '..'
import { Voice } from '../internal/voice'
import { Exception, Track, TrackEndReasons } from '../types/Track'
import { VoiceDebug } from '../types/VoiceTypes'

export interface IPlayerListenerCount {
  (eventName: 'onTrackStart'): number
  (eventName: 'onTrackEnd'): number
  (eventName: 'onTrackException'): number
  (eventName: 'onTrackStuck'): number

  (eventName: 'playerConnected'): number
  (eventName: 'playerDisconnected'): number

  (eventName: 'pause'): number
  (eventName: 'volume'): number
  (eventName: 'filters'): number
  (eventName: 'state'): number
  (eventName: 'destroy'): number
  (eventName: 'seek'): number
  (eventName: 'stop'): number

  (eventName: 'nodeWasMoved'): number
  (eventName: 'nodeDisconnected'): number
  (eventName: 'nodeReconnected'): number
}

export interface IPlayerListener<R, T, C> {
  // Track
  (event: 'onTrackStart', listener: (track: Track<T, C> | null) => void): R
  (event: 'onTrackEnd', listener: (track: Track<T, C> | null, reason: TrackEndReasons, mayStartNext: boolean) => void): R
  (event: 'onTrackException', listener: (track: Track<T, C> | null, exception: Exception | null) => void): R
  (event: 'onTrackStuck', listener: (track: Track<T, C> | null, thresholdMs: number) => void): R

  // Voice
  (event: 'playerConnected', listener: (voiceInfo: Voice, debug: {} & VoiceDebug) => void): R
  (event: 'playerDisconnected', listener: (voiceInfo: Voice, debug: {} & VoiceDebug) => void): R

  // Player
  (event: 'pause', listener: (pause: boolean) => void): R
  (event: 'stop', listener: () => void): R
  (event: 'volume', listener: (volume: number) => void): R
  (event: 'seek', listener: (seek: number) => void): R
  (event: 'destroy', listener: (volume: number) => void): R
  (event: 'filters', listener: (filters: IFilters & { equalizer: Equalizer }) => void): R
  (event: 'state', listener: (state: PlayerUpdateState) => void): R
  
  // Node
  (event: 'nodeWasMoved', listener: (nodeOld: number, nodeNew: number, remoted: boolean) => void): R
  (event: 'nodeDisconnected', listener: (nodeID: number) => void): R
  (event: 'nodeReconnected', listener: (nodeID: number) => void): R
}


export interface IPlayerEmit<T, C> {
  // Track
  (event: 'onTrackStart', ...args: [Track<T, C> | null]): boolean
  (event: 'onTrackEnd', ...args: [Track<T, C> | null, TrackEndReasons, boolean]): boolean
  (event: 'onTrackException', ...args: [Track<T, C> | null, Exception | null]): boolean
  (event: 'onTrackStuck', ...args: [Track<T, C> | null, number]): boolean

  // Voice
  (event: 'playerConnected', ...args: [Voice, {} & VoiceDebug]): boolean
  (event: 'playerDisconnected', ...args: [Voice, {} & VoiceDebug]): boolean

  // Player
  (event: 'pause', ...args: [boolean]): boolean
  (event: 'volume', ...args: [number]): boolean
  (event: 'seek', ...args: [number]): boolean
  (event: 'stop', ...args: []): boolean
  (event: 'destroy', ...args: []): boolean
  (event: 'filters', ...args: [IFilters & { equalizer: Equalizer }]): boolean
  (event: 'state', ...args: [PlayerUpdateState]): boolean

  // Node
  (event: 'nodeWasMoved', ...args: [number, number, boolean]): boolean
  (event: 'nodeDisconnected', ...args: [number]): boolean
  (event: 'nodeReconnected', ...args: [number]): boolean
}

export interface IVoiceInfo {
  readonly ping?: number
  readonly guildID?: string
  readonly endpoint?: string
  readonly sessionID?: string
  readonly voiceChannel?: string
  readonly connected?: boolean
}

export interface IEqualizer {
  band: number
  gain: number
}

export interface IFilters {
  karaoke: {
    level: number
    monoLevel: number
    filterBand: number
    filterWidth: number
  }
  timescale: {
    speed: number
    pitch: number
    rate: number
  }
  tremolo: {
    frequency: number
    depth: number
  }
  rotation: {
    rotationHz: number
  }
  distortion: {
    sinOffset: number
    sinScale: number
    cosOffset: number
    cosScale: number
    tanOffset: number
    tanScale: number
    offset: number
    scale: number
  }
  channelMix: {
    leftToLeft: number
    leftToRight: number
    rightToLeft: number
    rightToRight: number
  }
  lowPass: {
    smoothing: number
  }
}

export interface IPlayerState {
  track?: Track | null
  paused?: boolean | null
  latency?: number
  equalizer?: Equalizer | null
  filters?: IFilters | null
}

export interface IPlayer {
  get playerIsUnavailable(): boolean

  stopPlayer(): Promise<boolean>
  pausePlayer(pause: boolean): Promise<boolean>
  setEqualizer(equalizer: Equalizer): Promise<Equalizer>
  destroyPlayer(): Promise<boolean>
  setVolume(volume: number, limit?: number): Promise<number>
  seek(position: number): Promise<number>

  get isPlayingTrack(): boolean
  get position(): number

  connectVoice(channelID: string): void
  reconnectVoice(): void
  disconnectVoice(): void

}


export type Equalizer = [
  IEqualizer, IEqualizer,
  IEqualizer, IEqualizer,
  IEqualizer, IEqualizer,
  IEqualizer, IEqualizer,
  IEqualizer, IEqualizer,
  IEqualizer, IEqualizer,
  IEqualizer, IEqualizer,
  IEqualizer
]