import { PlaylistInfoV3, TrackV3 } from './TrackV3'

export type Exception = {
  message: string | null
}

export type Severity = 'COMMON' | 'SUSPICIOUS' | 'FAULT'

export type TrackResultV3 = {
  loadType?: 'TRACK_LOADED' | 'PLAYLIST_LOADED' | 'SEARCH_RESULT' | 'NO_MATCHES' | 'LOAD_FAILED' | null
  playlistInfo?: PlaylistInfoV3 | null
  tracks?: Array<TrackV3> | null
  exception?: Exception | null
}