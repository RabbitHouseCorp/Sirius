import { Track } from '.'
import { Equalizer, IFilters, Voice } from '..'

export type PlayerUpdateState = {
  volume: number
  track: Track | null
  filters: IFilters & { equalizer: Equalizer }
  position: number
  voice: Voice
  nodeConnected: boolean
}
