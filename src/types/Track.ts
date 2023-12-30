import { TrackV2 } from '../api/lavalink/v2/TrackResultV2'
import { TrackV3 } from '../api/lavalink/v3/TrackV3'
import { TrackV4 } from '../api/lavalink/v4/TrackV4'


export type Exception = {
  message?: string | null
  severity?: 'common' | 'suspicious' | 'fault' | null
  cause?: string | string[] | null
}

export type TrackEndReasons = 'finished' | 'loadFailed' | 'replaced' | 'cleanup' | 'stopped'


export type ITrackInfo = {
  identifier: string | null
  isSeekable: boolean
  isStream: boolean
  author: string | null
  length: number
  position: number
  title: string | null
  uri: string | null
  artworkUrl: string | null
  isrc: string | null
  sourceName: string | null
}

export interface ITrack<R = any, T = any> {
  /**
   * Recommendation for using this method is to use Node with the most recent version.
   */
  get userData(): R | null
  /**
   * Recommendation for using this method is to use Node with the most recent version.
   */
  get pluginInfo(): T | null
  get trackEncoded(): string | null
  get info(): ITrackInfo
}

export class Track<R = any, T = any> implements ITrack<R, T>  {
  #trackID: string = (Math.random() * 100000).toString(16)
    + (Math.random() * 100000).toString(16)
  #data: TrackV2 & TrackV3 & TrackV4 | null = null

  constructor(data: TrackV2 | TrackV3 | TrackV4 | null) {
    if (data)
      this.#data = data as TrackV2 & TrackV3 & TrackV4 | null
  }

  get trackID(): string {
    return this.#trackID
  }

  get userData(): R | null {
    if ((this.#data as TrackV4)?.userData) {
      return (this.#data as TrackV4)?.userData ?? null
    }
    return null
  }
  get pluginInfo(): T | null {
    if ((this.#data as TrackV4)?.pluginInfo) {
      return (this.#data as TrackV4)?.pluginInfo ?? null
    }
    return null
  }
  get trackEncoded(): string | null {
    if (typeof (this.#data as TrackV4)?.encoded === 'string') {
      return (this.#data as TrackV4)?.encoded ?? null
    } else if (typeof this.#data?.track === 'string') {
      return this.#data?.track ?? null
    } else if (typeof (this.#data as any)?.trackEncoded === 'string') {
      return (this.#data as any)?.trackEncoded
    } else if (typeof (this.#data as any)?.encodedTrack === 'string') {
      return (this.#data as any)?.trackEncoded
    }
    return null
  }
  get info(): ITrackInfo {
    return {
      identifier: (this.#data as any)?.info?.identifier ? (this.#data as any)?.info?.identifier : '',
      isSeekable: (this.#data as any)?.info?.isSeekable ? (this.#data as any)?.info?.isSeekable : false,
      isStream: (this.#data as any)?.info?.isStream ? (this.#data as any)?.info?.isStream : false,
      author: (this.#data as any)?.info?.author ? (this.#data as any)?.info?.author : null,
      length: (this.#data as any)?.info?.length ? (this.#data as any)?.info?.length : 0,
      position: (this.#data as any)?.info?.position ? (this.#data as any)?.info?.position : 0,
      title: (this.#data as any)?.info?.title ? (this.#data as any)?.info?.title : null,
      uri: (this.#data as any)?.info?.uri ? (this.#data as any)?.info?.uri : null,
      artworkUrl: (this.#data as any)?.info?.artworkUrl ? (this.#data as any)?.info?.artworkUrl : null,
      isrc: (this.#data as any)?.info?.isrc ? (this.#data as any)?.info?.isrc : null,
      sourceName: (this.#data as any)?.info?.sourceName ? (this.#data as any)?.info?.sourceName : null,
    }
  }

}
