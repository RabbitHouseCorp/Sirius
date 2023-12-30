import { PlaylistInfoV4, TrackV4 } from './TrackV4'

export type LoadTypesV4 = 'track' | 'playlist' | 'search' | 'empty' | 'error  '


export type LoadTrackResultV4<T = any> = |
  {
    loadType?: 'track'
    data?: TrackV4 | null
  } | {
    loadType?: 'playlist'
    data?: {
      info?: PlaylistInfoV4 | null
      pluginInfo?: T
      tracks?: TrackV4[] | null
    }
  } | {
    loadType?: 'search'
    data?: TrackV4[] | TrackV4 | null
  } | {
    loadType?: 'empty'
    data?: never
  } | {
    loadType?: 'error',
    data: {
      message?: string | null
      severity?: string | null
      cause?: string | null
    }
  }

