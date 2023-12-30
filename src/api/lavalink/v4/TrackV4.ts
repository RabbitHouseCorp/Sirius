export interface TrackV4<R = any, T = any> {
  encoded?: string | null
  info?: {
    identifier?: string | null
    isSeekable?: boolean
    author?: string | null
    length?: number | null
    isStream?: boolean
    position?: number
    title?: string
    uri?: string
    artworkUrl?: string
    isrc?: string
    sourceName?: string
  } | null
  pluginInfo?: R | null
  userData?: T | null
}

export interface PlaylistInfoV4 {
  name?: string
  selectedTrack?: number
}