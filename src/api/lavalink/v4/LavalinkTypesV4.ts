import { Equalizer } from '../../../interface/IPlayer'


export type InfoV4 = {
  version?: VersionV4 | null
  buildTime?: number | null
  git?: GitV4 | null
  jvm?: string | null
  lavaplayer?: string | null
  filters?: Array<string> | null
  sourceManagers?: Array<string> | null
  plugins?: Array<PluginMetaV4> | null
}

export type VersionV4 = {
  semver?: string | null
  major?: number | null
  minor?: number | null
  patch?: number | null
  preRelease?: string | null
}

export type GitV4 = {
  branch?: string | null
  commit?: string | null
  commitTime?: string | null
}

export type PluginMetaV4 = {
  name?: string | null
  version?: string | null
}

export type TypeFiltersV4<T = any | null> = {
  volume?: number
  equalizer?: Equalizer | null
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
  pluginFilters?: T
}