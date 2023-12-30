import { ITrack, Track } from '../../types/Track'
import { TrackResultV2 } from '../lavalink/v2/TrackResultV2'
import { TrackResultV3 } from '../lavalink/v3/TrackResultV3'
import { LoadTrackResultV4 } from '../lavalink/v4/TrackResultV4'
import { ITrackResultBaseRest, LoadType } from '../types/TrackRest'



export class TrackResultBase<A = any, B = any, C = any> implements ITrackResultBaseRest<A> {
  #data: TrackResultV2 & TrackResultV3 & LoadTrackResultV4 & unknown | null = null
  #destroyed: boolean = false

  constructor(data: TrackResultV2 | TrackResultV3 | LoadTrackResultV4 | any) {
    if (data && typeof data === 'object')
      this.#data = data
    else
      this.#destroyed = true
  }


  get pluginInfo(): A | null {
    if (typeof (this.#data?.data as any)?.pluginInfo === 'object')
      return (this.#data?.data as any)?.pluginInfo ?? null
    else if (typeof (this.#data as any)?.data?.pluginInfo === 'object')
      return (this.#data as any)?.data?.pluginInfo
    return null
  }

  get nameOfPlaylist(): string | null {
    if (typeof this.#data?.playlistInfo?.name === 'string')
      return this.#data.playlistInfo.name
    else if (typeof (this.#data?.data as any)?.info?.name === 'object') {
      return (this.#data?.data as any)?.info?.name
    } else if (typeof (this.#data as any)?.data?.selectedTrack === 'number') {
      return (this.#data as any)?.data?.selectedTrack
    } else if (typeof (this.#data as any)?.data?.info?.name === 'string') {
      return (this.#data as any)?.data?.info?.name
    }
    return null
  }

  get selectedTrack(): number {
    if (this.#data?.playlistInfo?.selectedTrack && typeof this.#data?.playlistInfo?.selectedTrack === 'number') {
      return this.#data?.playlistInfo?.selectedTrack
    } else if (this.#data?.playlistInfo?.selectedTrack && typeof this.#data?.playlistInfo?.selectedTrack === 'string') {
      return Number.isNaN(parseInt(this.#data?.playlistInfo?.selectedTrack)) ? parseInt(this.#data?.playlistInfo?.selectedTrack) : 0
    } else if (typeof (this.#data as any)?.data?.info?.selectedTrack === 'number') {
      return (this.#data as any)?.data?.info?.selectedTrack
    }
    return -1
  }

  get loadType(): 'error' | 'track' | 'playlist' | 'search' | 'no-result' {
    if (this.#data?.loadType && typeof this.#data.loadType === 'string') {
      // There are a huge amount of names here because this library will support custom node.
      switch ((this.#data.loadType as string).toLowerCase()) {
        case 'track_loaded':
        case 'trackloaded':
        case 'track-loaded':
        case 'trackResult':
        case 'track-result':
        case 'track':
          return 'track'
        case 'playlist':
        case 'playlist_loaded':
        case 'playlistloaded':
        case 'playlist-loaded':
          return 'playlist'
        case 'search_loaded':
        case 'searchloaded':
        case 'search':
        case 'search-loaded':
          return 'search'
        case 'load_failed':
        case 'loadfailed':
        case 'trackError':
        case 'failed':
        case 'error':
        case 'track-error':
        case 'load-failed':
        case 'track-failed':
          return 'error'
        case 'empty':
        case 'notfound':
        case 'not-found':
        case 'notFound':
        case 'notTrack':
        case 'nottrack':
        case 'not_track':
        case 'no-track':
          return 'no-result'
        default:
          return 'no-result'
      }
    } else if (this.#data?.loadType && typeof this.#data.loadType === 'number') {
      switch (this.#data.loadType) {
        case LoadType.TRACK:
          return 'track'
        case LoadType.PLAYLIST:
          return 'playlist'
        case LoadType.SEARCH:
          return 'search'
        case LoadType.EMPTY:
          return 'no-result'
        case LoadType.ERROR:
          return 'error'
        default:
          return 'no-result'
      }
    }
    return 'no-result'
  }

  get track(): ITrack<B, C> | null {
    if (Array.isArray((this.#data)?.data))
      this.tracks.at(this.selectedTrack < 0 ? this.selectedTrack : 0) ?? null
    else if ((this.#data as any).track && typeof (this.#data as any).track === 'object')
      return new Track((this.#data as any).track)
    else if ((this.#data as any).data && typeof (this.#data as any).data === 'object')
      return new Track((this.#data as any).data)
    return this.tracks.at(this.selectedTrack < 0 ? this.selectedTrack : 0) ?? null
  }

  get tracks(): Track<B, C>[] {
    return [
      ...((this.loadType === 'playlist' || this.loadType === 'search') && Array.isArray(this.#data?.data)
        ?
        (this.#data?.data ?
          this.#data?.data
            ?.filter((data) => data && typeof data === 'object')
            ?.map((data) => new Track(data)) : [])
        : []),
      ...((this.loadType === 'playlist' || this.loadType === 'search') && Array.isArray((this.#data as any)?.data?.tracks)
        ? (this.#data as any)?.data?.tracks
          ?.filter((data: any) => data && typeof data === 'object')
          ?.map((data: any) => new Track(data))
        : []),
      ...((this.loadType === 'playlist' || this.loadType === 'search') && Array.isArray(this.#data?.playlistInfo?.tracks) ?
        (this.#data?.playlistInfo?.tracks ? this.#data?.playlistInfo?.tracks
          ?.filter((data) => data && typeof data === 'object')
          ?.map((data: any) => new Track(data)) : []) : []),
      ...((this.loadType === 'playlist' || this.loadType === 'search') && Array.isArray(this.#data?.tracks) ?
        (this.#data?.tracks ? this.#data?.tracks
          ?.filter((data) => data && typeof data === 'object')
          ?.map((data: any) => new Track(data)) : []) : []),
    ]
  }
  get tracksWithLargestDuration(): ITrack<B, C>[] {
    return this.tracks.sort((a, b) => b.info.position - a.info.position)
  }
  get hasAudioTrackInMetadata(): boolean {
    return this.track != null
  }
  get error(): boolean {
    return typeof this.#data?.exception === 'object' || this.loadType === 'error' ? true :
      typeof this.#data?.exception === 'string' ? true : false
  }
  get errorResult(): { message: string | null; severity: string | null; cause: string[]; stackTrace: string[] } | null {
    if (!this.error) return null
    let message = null,
      severity = null,
      stackTrace: string[] = [],
      cause: string[] = []
    if ((this.#data as any)?.friendlyException?.friendlyMessage && typeof (this.#data as any)?.friendlyException?.friendlyMessage === 'string') {
      message = (this.#data as any)?.friendlyException?.friendlyMessage
    } else if (this.#data?.exception?.message && typeof this.#data.exception.message === 'string') {
      message = this.#data.exception.message
    } else if (typeof (this.#data?.data as any)?.message === 'string') {
      message = (this.#data?.data as any)?.message
    } else if (this.#data?.exception?.message && typeof this.#data.exception === 'string') {
      message = this.#data.exception
    }

    if ((this.#data as any)?.friendlyException?.severity && typeof (this.#data as any)?.friendlyException?.severity === 'string') {
      severity = (this.#data as any)?.friendlyException?.severity
    } else if ((this.#data?.exception as any)?.severity && typeof (this.#data?.exception as any)?.severity === 'string') {
      severity = (this.#data?.exception as any)?.severity.toLowerCase()
    } else if (typeof (this.#data?.data as any)?.severity === 'string') {
      severity = (this.#data?.data as any)?.severity.toLowerCase()
    }

    if ((this.#data as any)?.friendlyException?.cause && typeof (this.#data as any)?.friendlyExceptioncauseseverity === 'string') {
      cause.push((this.#data as any)?.friendlyException?.cause)
    } else if ((this.#data?.exception as any)?.cause && typeof (this.#data?.exception as any)?.cause === 'string') {
      cause.push((this.#data?.exception as any)?.cause)
    } else if (typeof (this.#data?.data as any)?.cause === 'string') {
      cause.push((this.#data?.data as any)?.cause)
    } else if (Array.isArray((this.#data?.data as any)?.cause)) {
      cause.push(...((this.#data?.data as any)?.cause.filter((str: any) => typeof str === 'string')))
    } else if (Array.isArray((this.#data?.exception as any)?.cause)) {
      cause.push(...(this.#data?.exception as any)?.cause.filter((str: any) => typeof str === 'string'))
    }

    if ((this.#data as any)?.friendlyException?.stackTrace && typeof (this.#data?.exception as any)?.friendlyException?.stackTrace === 'string') {
      stackTrace.push((this.#data as any)?.friendlyException?.stackTrace)
    } else if (typeof (this.#data?.data as any)?.stackTrace === 'string') {
      stackTrace.push((this.#data?.data as any)?.stackTrace)
    } else if (Array.isArray((this.#data?.data as any)?.stackTrace)) {
      stackTrace.push(...((this.#data?.data as any)?.stackTrace.filter((str: any) => typeof str === 'string')))
    } else if (Array.isArray((this.#data as any)?.friendlyException?.stackTrace)) {
      stackTrace.push(...((this.#data as any)?.friendlyException?.stackTrace.filter((str: any) => typeof str === 'string')))
    } else if (Array.isArray((this.#data?.exception as any)?.stackTrace)) {
      stackTrace.push(...(this.#data?.exception as any)?.stackTrace.filter((str: any) => typeof str === 'string'))
    }

    return { message, severity, cause, stackTrace }
  }
  get resultIsDestroyed(): boolean {
    return this.#destroyed
  }
  searchTrackByTitle(title: string): ITrack<any, any>[] {
    if (typeof title != 'string')
      title = ''
    if (this.tracks.length < 1) return []
    return this.tracks.filter((track) => {
      if (track?.info?.title) {
        if (track.info.title.includes(title) || track.info.title.search(title) != -1 || track.info.title === title)
          return true
      }
      return false
    })
  }

  searchTrackByUri(uri: string): ITrack<any, any>[] {
    if (typeof uri != 'string')
      uri = ''
    if (this.tracks.length < 1) return []
    return this.tracks.filter((track) => {
      if (track?.info?.uri) {
        if (track.info.uri.includes(uri) || track.info.uri.search(uri) != -1 || track.info.uri === uri)
          return true
      }
      return false
    })
  }

  destroyResult(): void {
    this.#data = null
    this.#destroyed = true
  }

}