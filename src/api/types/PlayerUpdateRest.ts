import { ITrack } from '../../types/Track'

export interface PlayerUpdateRest {
  guildID: string | null
  sessionID: string | null
  track: ITrack | null
  volume: number
  paused: boolean
  filters: any

  get voice(): { token: string; endpoint: string; sessionId: string } | null
  get time(): number
  get position(): number
  get connected(): boolean


}