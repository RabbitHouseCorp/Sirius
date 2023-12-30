import { TypeFiltersV4 } from './LavalinkTypesV4';
import { TrackV4 } from './TrackV4';

export interface PlayerV4<T = any | null> {
  guildId?: string | null
  track?: TrackV4 | null
  endTime?: number | null
  volume?: number 
  position?: number
  paused?: boolean
  state?: {
    time?: number | null
    position?: number | null
    connected?: boolean | null
    ping?: number | null
  }
  voice?: {
    token?: string | null
    endpoint?: string | null
    session?: string | null
  } | null
  filters?: TypeFiltersV4<T>
}
