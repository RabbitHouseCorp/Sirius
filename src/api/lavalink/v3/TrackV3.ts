export type TrackV3 = {
  encoded: string
  info?: TrackInfoV3
}

export type PlaylistInfoV3 = {
  name?: string | null
  selectedTrack?: number | null 
}

export type TrackInfoV3 = {
  identifier: string
  author: string
  length: number
  isSeekable: boolean
  isStream: boolean
  position: number
  title: string
  uri?: string | null
  sourceName?: string | null
}