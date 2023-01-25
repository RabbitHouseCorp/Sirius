export enum RoutePlannerTypes {
  rotatingIpRoutePlanner = 'RotatingIpRoutePlanner',
  nanoIpRoutePlanner = 'NanoIpRoutePlanner',
  notatingNanoIpRoutePlanner = 'RotatingNanoIpRoutePlanner',
  balancingIpRoutePlanner = 'BalancingIpRoutePlanner'
}


export enum LoadResultType {
  trackLoaded = 'TRACK_LOADED',
  playlistLoaded = 'PLAYLIST_LOADED',
  searchResult = 'SEARCH_RESULT',
  noMatches = 'NO_MATCHES',
  loadFailed = 'LOAD_FAILED'
}

export enum IPBlockType {
  Inet4Address = 'Inet4Address',
  Inet6Address = 'Inet6Address'
}

export enum Severity {
  COMMON = 'COMMON',
  SUSPICIOUS = 'SUSPICIOUS',
  FATAL = 'FATAL'
}

export enum TrackSearch {
  ytsearch = 'ytsearch:',
  ytmsearch = 'ytmsearch:',
  scsearch = 'scsearch:',
  auto = ''
}

export interface LavalinkMemoryStats {
  free: number
  used: number
  allocated: number
  reservable: number
}

export interface LavalinkCPUStats {
  cores: number
  systemLoad: number
  lavalinkLoad: number
}

export interface LavalinkFrameStats {
  sent: number
  nulled: number
  deficit: number
}

export interface Player {
  guildId: string
  track: Track | null
  volume: number
  paused: boolean
  voice: VoiceState
  filters: Filters
}

export interface Track {
  encoded: string
  track: string
  info: TrackInfo
}

export interface TrackInfo {
  identifier: string
  isSeekable: boolean
  author: string
  length: number
  position: number
  title: string
  uri: string | null
  sourceName: string
}


export interface TrackInfoDecode {
  encoded: string
  info: TrackInfo
}


export interface VoiceState {
  token: string
  endpoint: string
  sessionId: string
  connected?: boolean
  ping?: number
}


export interface Filters {
  volume?: number
  equalizer?: EqualizerFilter
  karaoke?: KaraokeFilter
  timescale?: TimescaleFilter
  tremolo?: TremoloFilter
  vibrato?: VibratoFilter
  rotation?: RotationFilter
  distortion?: DistortionFilter
  channelMix?: ChannelMixFilter
  lowPass?: LowPassFilter
}


export interface EqualizerFilter {
  bands: number
  gain: number
}

export interface KaraokeFilter {
  level?: number
  monoLevel?: number
  filterBand?: number
  filterWidth?: number
}

export interface TimescaleFilter {
  speed?: number
  pitch?: number
  rate?: number
}

export interface TremoloFilter {
  frequency?: number
  depth?: number
}

export interface VibratoFilter {
  frequency?: number
  depth?: number
}

export interface RotationFilter {
  rotationHz?: number
}

export interface DistortionFilter {
  sinOffset?: number
  sinScale?: number
  cosOffset?: number
  cosScale?: number
  tanOffset?: number
  tanScale?: number
  offset?: number
  scale?: number
}

export interface ChannelMixFilter {
  leftToLeft?: number
  leftToRight?: number
  rightToLeft?: number
  rightToRight?: number
}

export interface LowPassFilter {
  smoothing?: number
}


export interface TrackException {
  message?: string | null
  severity: Severity
  cause: string
}

export interface PlaylistInfo {
  name?: string | undefined
  selectedTrack?: number | undefined
  exception?: TrackException | undefined
}

export interface InfoResponse {
  version: VersionLavalink
  buildTime: number
  git: GitLavalink
  jvm: string
  lavaplayer: string
  sourceManagers: string[]
  filters: Filters[]
  plugins: PluginLavalink[]
}


export interface VersionLavalink {
  semver: string
  major: number
  minor: number
  patch: number
  preRelease: string | null
}

export interface GitLavalink {
  branch: string
  commit: string
  commitTime: number
}

export interface PluginLavalink {
  name: string
  version: string
}


export interface FailingAddress {
  address: string
  failingTimestamp: number
  failingTime: string
}

export interface IpBlock {
  type: IPBlockType
  size: string
}


export interface LavalinkNode {
  /**
   * Enable secure Websocket connection. Which will use protocol of "WSS" equals "HTTPS"
   */
  secure?: boolean
  id: string
  host: string
  port: number | string
  password: string
}

export interface LavalinkStats {
  players: number;
  playingPlayers: number;
  uptime: number;
  memory: LavalinkMemoryStats
  cpu: LavalinkCPUStats
  frameStats?: LavalinkFrameStats | null
}
export type LavalinkNodes = LavalinkNode[]
export type LavalinkNodeList = Array<LavalinkNode>
export type VolumePlayer = { volume: number }

export class AudioTrack {
  public encoded: string | null = null
  public track: string | null = null
  public info: TrackInfo | any = {}
  constructor(data: Track | AudioTrack) {
    if (data.encoded != undefined) {
      this.encoded = data.encoded
    }
    if (data.track !== undefined) {
      this.track = data.track
    }
    if (data.info !== undefined) {
      this.info = data.info
    }
  }
}