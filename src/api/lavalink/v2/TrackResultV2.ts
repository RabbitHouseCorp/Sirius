export interface TrackV2 {
  track: string
  info: {
    identifier?: string | null
    isSeekable: string
    author?: string | null
    length: number
    isStream: boolean
    position: number
    title: string
    uri?: string | null
  }
}

export interface TrackBaseV2 {
  track?: TrackV2 | null
  from?: string | null
}

export enum LoadTypesV2 {
  TrackLoaded = "TRACK_LOADED",
  PlaylistLoaded = "PLAYLIST_LOADED",
  SearchResult = "SEARCH_RESULT",
  NoMatches = "NO_MATCHES",
  LoadFailed = "LOAD_FAILED"
}

export interface PlaylistInfoV2 {
  name?: string | null
  selectedTrack?: number | null
  tracks?: TrackV2[] | null
}

export interface TrackResultV2 {
  loadType?: 'TRACK_LOADED' | 'PLAYLIST_LOADED' | 'SEARCH_RESULT' | 'NO_MATCHES' | 'LOAD_FAILED' | null
  playlistInfo?: PlaylistInfoV2 | null
  tracks?: TrackV2[] | null
} 