import { Equalizer } from '../../interface/IPlayer'
import { ITrack, Track } from '../../types/Track'
import { PlayerUpdateRest } from '../types/PlayerUpdateRest'

export interface PlayerSession {
  [x: string]: any
  track?: ITrack | null
  identifier?: string
  userData?: any
  position?: number
  endTime?: number | null
  volume?: number
  paused?: boolean
  filters?: {
    equalizer?: Equalizer
  } | any
  voice?: {
    token: string
    endpoint: string
    sessionId: string
  }
}

export class PlayerUpdateData implements PlayerUpdateRest {
  guildID: string | null = null
  sessionID: string | null = null
  track: ITrack<any, any> | null = null
  volume: number = 0
  paused: boolean = false
  filters: any = {}
  #voice: any = {}
  #time: number = 0
  #position: number = 0
  #connected: boolean = false

  constructor(guildID: string, sessionID: string, data: any) {
    if (guildID && typeof guildID === 'string')
      this.guildID = guildID
    if (sessionID && typeof sessionID === 'string')
      this.sessionID = sessionID
    if (data?.track && typeof data?.track === 'object')
      this.track = new Track(data.track)
    else if (data?.playingTrack && typeof data?.playingTrack === 'object')
      this.track = new Track(data.playingTrack)
    else if (data?.playing && typeof data.playing === 'object')
      this.track = new Track(data.playing)
    if (data?.volume && typeof data.volume === 'number')
      if (data.volume < 0)
        this.volume = 0
      else if (!isFinite(data.volume))
        this.volume = 100
      else if (isNaN(data.volume))
        this.volume = 100
      else
        this.volume =
          typeof data.volume === 'string' ? parseInt(data.volume) :
            typeof data.volume === 'number' ? data.volume : 0
    if (data?.paused && typeof data.paused === 'boolean')
      this.paused = data.paused
    else if (data?.pause && typeof data.pause === 'boolean')
      this.paused = data.pause
    if (data?.filters && typeof data.filters === 'object')
      this.filters = data.filters
    else if (data?.filter && typeof data.filter === 'object')
      this.filters = data.filter
    if (data?.state?.voice && typeof data.state.voice === 'object')
      this.#voice = data.state.voice
    else if (data?.voice && typeof data.voice === 'object')
      this.#voice = data.voice
    if (data?.time && typeof data.time === 'number')
      if (!isFinite(data.time))
        this.#time = -1
      else if (isNaN(data.time))
        this.#time = -1
      else
        this.#time = data.time
    if (data?.state?.time && typeof data?.state?.time === 'number')
      if (!isFinite(data?.state?.time))
        this.#time = -1
      else if (isNaN(data?.state?.time))
        this.#time = -1
      else
        this.#time = data?.state?.time
    if (data?.position && typeof data.position === 'number')
      if (!isFinite(data.position))
        this.#position = -1
      else if (isNaN(data.position))
        this.#position = -1
      else
        this.#position = data.position
    if (data?.state?.position && typeof data?.state?.position === 'number')
      if (!isFinite(data?.state?.position))
        this.#position = -1
      else if (isNaN(data?.state?.position))
        this.#position = -1
      else
        this.#position = data?.state?.position
    if (data?.state?.connected && typeof data.state.connected === 'boolean')
      this.#connected = data.state.connected
    else if (data?.voice?.connected && typeof data.voice.connected === 'boolean')
      this.#connected = data.voice.connected
    else if (data?.connected && typeof data.connected === 'boolean')
      this.#connected = data.connected
  }

  get voice(): { token: string; endpoint: string; sessionId: string } | null {
    return this.#voice
  }
  get time(): number {
    return this.#time
  }
  get position(): number {
    return this.#position
  }
  get connected(): boolean {
    return this.#connected
  }

}