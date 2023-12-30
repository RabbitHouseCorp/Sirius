import { Equalizer } from '../../../interface/IPlayer'
import { TrackV3 } from './TrackV3'

export type PluginObjectV3<T> = T

export type TypeFiltersV3 = {
  volume?: number
  equalizer?: Equalizer
  karaoke?: {
    level?: number
    monoLevel?: number
    filterBand?: number
    filterWidth?: number
  }
  timescale?: {
    speed?: number
    pitch?: number
    rate?: number
  }
  tremolo?: {
    frequency?: number
    depth?: number
  }
  rotation?: {
    rotationHz?: number
  }
  distortion?: {
    sinOffset?: number
    sinScale?: number
    cosOffset?: number
    cosScale?: number
    tanOffset?: number
    tanScale?: number
    offset?: number
    scale?: number
  }
  channelMix?: {
    leftToLeft?: number
    leftToRight?: number
    rightToLeft?: number
    rightToRight?: number
  }
  lowPass?: {
    smoothing?: number
  }
}

export type FiltersV3<T> = TypeFiltersV3 & PluginObjectV3<T>

export type PlayerV3<T> = {
  guildId?: string | null
  track?: TrackV3 | null
  volume?: number | null
  paused?: boolean | null
  voice?: {
    token?: string | null
    endpoint?: string | null
    sessionId?: string | null
    connected?: boolean | null
    ping?: number | null
  } | null
  filters: FiltersV3<T> 
}