import EventEmitter from 'events'
import { WebSocket } from 'ws'
import { ConfigLavalink, validateConfig, VersionAPI } from './config'
import { LavalinkRest } from './rest'
import { AudioTrack, TrackSearch, VoiceState, VolumePlayer } from './types'
import { IRequestUpdatePlayer, LavalinkPacketVoice, LoadType } from './typesRest'
import { MessageLavalink, PlayingTrack, TypePlayerUpdate, TypeReady, TypeStats } from './typesWebsocket'
import { clientLibrary } from './utils'

const reformNameForEvent = (str: string) => {
  let n = 0
  const s = str.split('')

  if (s[0] != undefined) {
    s[0] = s[0].toLocaleLowerCase()
  }

  return s.join('')
}

export class LavalinkPlayer<VoiceChannelLibraryGeneric> extends EventEmitter {
  private guildId: string
  public player: TypePlayerUpdate | null
  public playingTrack: PlayingTrack | null
  public voiceChannel: VoiceChannelLibraryGeneric | any | null
  public lavalinkNodeConnection!: LavalinkNodeConnection<VoiceChannelLibraryGeneric>
  public restLavalink: LavalinkRest | undefined | null = null
  public paused: boolean = false
  public volume: number = 100
  public created: boolean = false
  constructor(
    guildId: string,
    data: TypePlayerUpdate | null,
    lavalinkNodeConnection: LavalinkNodeConnection<VoiceChannelLibraryGeneric>,
    restLavalink?: LavalinkRest | null
  ) {
    super()
    if (guildId == undefined && guildId == null)
      throw new Error('guildId is required!')
    if (typeof guildId != 'string')
      throw new Error('guildId is string!')
    if (data === undefined) {
      throw new Error('Data provided to LavalinkPlayer is invalid.')
    } else if (data !== null) {
      if (typeof data?.guildId !== 'string')
        throw new Error('data.guildId is string.')
      if (typeof data?.op !== 'string')
        throw new Error('data.op is string')
      if (typeof data?.state !== 'object')
        throw new Error('data.state is object')
      if (typeof data?.state.connected !== 'boolean')
        throw new Error('data.state.connected is boolean')
      if (typeof data?.state.ping !== 'number')
        throw new Error('data.state.ping is number')
      if (typeof data?.state.position !== 'number')
        throw new Error('data.state.position is number')
      if (typeof data?.state.time !== 'number')
        throw new Error('data.state.time is number')
    }
    if (!(lavalinkNodeConnection == undefined && lavalinkNodeConnection == null) && !(lavalinkNodeConnection instanceof LavalinkNodeConnection))
      throw new Error('Parameter of lavalinkNodeConnection is not a structure of LavalinkNodeConnection')


    this.guildId = guildId
    this.player = data
    this.playingTrack = null
    this.voiceChannel = null
    this.volume = 100
    if (restLavalink != undefined && restLavalink != null) {
      this.restLavalink = restLavalink
    }
    this.lavalinkNodeConnection = lavalinkNodeConnection
  }

  private get getSessionId(): string | undefined | null {
    return this.lavalinkNodeConnection.sessionInfo?.sessionId
  }

  private get isBeta() {
    return this.lavalinkNodeConnection.config.version == VersionAPI.V4
  }

  async sendPlayerWs(op: string, returns: string | null, data: any) {
    if (this.isBeta)
      throw new Error('Due to Lavalink changes and using Endpoint V4. There will be no commands to run on Websocket. Then try using LavalinkPlayer<VoiceChannelLibraryGeneric>.updatePlayer()')

    return new Promise((resolve) => {

      // To not control players from other guilds.

      this.lavalinkNodeConnection.send({
        op,
        guildId: this.guildId,
        ...(data != undefined ? data : {})
      })

      if (returns !== null) {
        this.lavalinkNodeConnection.once(returns, (...args) => resolve(args))
      } else {
        resolve(null)
      }
    })
  }

  async destroy() {
    this.removeAllListeners()
    if (this.isBeta) {
      await this.restLavalink?.destroyPlayer({
        sessionId: this.getSessionId!!,
        guildId: this.getGuildId
      })
    } else {
      this.lavalinkNodeConnection.send({
        op: 'destroy',
        guildId: this.guildId
      })
    }
    this.lavalinkNodeConnection.removePlayer(this.guildId)
  }

  async fetchPlayer() {
    return this.restLavalink?.getPlayer(this.lavalinkNodeConnection.sessionInfo?.sessionId!!, this.guildId)
  }

  async searchTrack(trackSearch: TrackSearch, search: string): Promise<LoadType> {
    return new Promise((resolve) => {
      this.restLavalink?.loadTrack(trackSearch, search)
        .then((rest) => {
          rest!!.tracks = rest!!.tracks.map((track) => new AudioTrack(track))
          resolve(rest)
        })
        .catch((error) => error)
    })
  }

  async setResume() {
    if (this.isBeta) {
      this.updatePlayer(false, {
        paused: false
      }).catch((e) => { throw new Error(e) });
      return true
    }

    await this.sendPlayerWs('pause', 'pause', { pause: false })
    this.paused = false
    return true
  }

  async setPause() {
    if (this.isBeta) {
      this.updatePlayer(false, {
        paused: true
      }).catch((e) => { throw new Error(e) });
      return true
    }

    await this.sendPlayerWs('pause', 'pause', { pause: true })
    this.paused = true
    return true
  }
  async stopPlayer() {
    if (this.isBeta) {
      await this.updatePlayer(false, {
        encodedPlayer: null,
      }).catch((e) => { throw new Error(e) });
      return true
    }
    await this.sendPlayerWs('stop', 'stop', {})

    return true
  }


  async playTrack(audioTrack: AudioTrack, noReplace: boolean): Promise<AudioTrack | null> {
    if (!(audioTrack instanceof AudioTrack))
      throw new Error(`This doesn't seem to be the AudioTrack class.`)
    if (this.isBeta) {
      this.updatePlayer(noReplace == undefined ? false : noReplace, {
        encodedPlayer: audioTrack.track!!,
      }).catch((e) => { throw new Error(e) });

      return audioTrack
    }
    return new Promise((resolve) => {
      // Send Track
      this.lavalinkNodeConnection.send({
        track: audioTrack.track,
        op: 'play',
        noReplace: noReplace == undefined ? false : noReplace,
        guildId: this.guildId
      })
      this.once('trackIsOk', (data) => data == null ? resolve(data) : resolve(null))
    })
  }

  setVoiceChannel(voiceChannel: VoiceChannelLibraryGeneric) {
    if (voiceChannel == undefined && voiceChannel == null)
      throw new Error('VoiceChannel parameter is incorrect or returning null or undefined.')
    this.voiceChannel = voiceChannel
  }

  async connectVoiceRest(voiceState: VoiceState): Promise<VoiceState | undefined> {
    return this.updatePlayer(false, {
      voice: voiceState
    })
      .then((player) => {
        return player?.data?.voice
      })
      .catch((error) => error)
  }

  async connectVoice(voiceState: LavalinkPacketVoice) {
    if (this.isBeta)
      throw new Error('You are using a recent API version, you can change it in the settings options of defineConfigLavalink({...options})');

    return this.sendPlayerWs('voiceUpdate', 'voiceUpdate', voiceState)
  }

  async updatePlayer(noReplace: boolean, options: IRequestUpdatePlayer) {
    return this.restLavalink?.updatePlayer({
      sessionId: this.lavalinkNodeConnection.sessionInfo?.sessionId!!,
      guildId: this.getGuildId,
      noReplace
    }, options)
  }

  async setVolume(volume: number): Promise<VolumePlayer> {
    if (typeof volume !== 'number')
      throw new Error(`You have informed the volume parameter of ${typeof volume} instead of being number.`)

    let volumeChanged = 0

    volume = volume * 100

    if (this.isBeta) {
      await this.updatePlayer(false, {
        volume
      })

      volumeChanged = volume
    } else {
      const captureEvent = async () => new Promise((resolve) => {
        this.lavalinkNodeConnection.once('volume', (data) => {
          if (data.guildId === this.getGuildId) {
            resolve(null)
            volumeChanged = volume
          }
        })
      })
      await captureEvent()
    }

    this.volume = volumeChanged
    return { volume: volumeChanged }
  }

  get getGuildId() {
    return this.guildId
  }

  static createPlayer<T>(
    guildId: string,
    data: TypePlayerUpdate | null,
    lavalinkNodeConnection: LavalinkNodeConnection<T>,
    restLavalink?: LavalinkRest | null
  ) {
    return new LavalinkPlayer<T>(guildId, data, lavalinkNodeConnection, restLavalink)
  }

}


export type TypeCreatePlayer<VoiceChannelLibraryGeneric> = { player: LavalinkPlayer<VoiceChannelLibraryGeneric>, position: number }


export class LavalinkNodeConnection<VoiceChannelLibraryGeneric> extends EventEmitter {
  public ws?: WebSocket | null
  public sessionInfo: TypeReady | null
  public connected: boolean
  public reconnecting: boolean
  private tryReconnect: number = 0
  public stats: TypeStats | null
  public config!: ConfigLavalink
  public library: string
  public players: Array<LavalinkPlayer<VoiceChannelLibraryGeneric>>
  public rest: LavalinkRest | undefined | null = null

  constructor(config: ConfigLavalink, rest?: LavalinkRest) {
    super()
    if (validateConfig(config)) {
      this.config = config
    }

    this.library = ''
    this.tryReconnect = 0
    this.connected = false
    this.reconnecting = false
    this.sessionInfo = null
    this.stats = null
    this.players = new Array<LavalinkPlayer<VoiceChannelLibraryGeneric>>()
    if (rest !== null) {
      this.rest = rest
    }
  }

  getPlayerByIds(data: string[]): LavalinkPlayer<VoiceChannelLibraryGeneric>[] {
    return this.players.filter((player) => data.includes(player.getGuildId) && data.includes(player.player?.guildId!! ?? ''))
  }

  getPlayer(data: LavalinkPlayer<VoiceChannelLibraryGeneric> | string | number): LavalinkPlayer<VoiceChannelLibraryGeneric> | null {
    if (typeof data === 'string') {
      const player = this.players.findIndex((player) => player.getGuildId === data && player.player?.guildId === data)

      return this.players[player]
    } else if (data instanceof LavalinkPlayer) {
      const id = typeof data.getGuildId === 'string' ? data.getGuildId : data.player?.guildId
      const player = this.players.findIndex((player) => player.getGuildId === id && player.player?.guildId === id)

      return this.players[player]
    }

    return null
  }

  createPlayer(guildId: string): TypeCreatePlayer<VoiceChannelLibraryGeneric> {
    let player = LavalinkPlayer.createPlayer<VoiceChannelLibraryGeneric>(guildId, null, this, this.rest)

    return { player, position: this.players.push(player) }
  }

  removePlayer(guildId: string) {
    const getPlayer = this.players.findIndex((player) => player.getGuildId === guildId && player.player?.guildId === guildId)

    return getPlayer <= -1 ? this.players.slice(getPlayer, 1) : null
  }

  private get getLibrary() {
    if (this.library === '') {
      this.library = clientLibrary
    }

    return this.library
  }
  private get getVersionApi() {
    return this.config.rest.version
  }

  private get baseUrl() {
    if (this.config.auth.secure === undefined) this.config.auth.secure = false
    const protocol = this.config.auth.secure ? 'wss://' : 'ws://'
    const prefixVersion = `/${this.getVersionApi}/`
    const port = `:${this.config.auth.port}`
    return protocol + this.config.auth.ip + port + prefixVersion
  }

  send(d: any) {
    // https://github.com/freyacodes/Lavalink/blob/master/IMPLEMENTATION.md#future-breaking-changes-for-v4
    if (this.config.version == VersionAPI.V4) return;
    if (this.ws !== null && this.ws !== undefined) {
      if (this.ws instanceof WebSocket) {
        this.ws.send(JSON.stringify(d))
      }
    }
  }


  resume() {
    // https://github.com/freyacodes/Lavalink/blob/master/IMPLEMENTATION.md#future-breaking-changes-for-v4
    if (this.config.version == VersionAPI.V4) return;
    if (this.getResumeKey['Resume-Key'] == undefined && this.getResumeKey['Resume-Key'] == null) return

    this.send({ op: 'configureResuming', key: this.getResumeKey['Resume-Key'] ?? '', timeout: 1 * 1000 })
  }


  private get getResumeKey() {
    const resumeKey = this.sessionInfo?.sessionId ? {
      'Resume-Key': this.sessionInfo?.sessionId
    } : {}

    return resumeKey
  }
  connect() {
    this.ws = new WebSocket(this.baseUrl + 'websocket', {
      headers: {
        Authorization: this.config.auth.authorization,
        'User-Id': '',
        'Client-Name': this.getLibrary,
        'Content-Type': 'application/json',
        ...this.getResumeKey
      }
    })

    this.ws.on('open', () => {
      this.connected = true
      this.reconnecting = false
      this.tryReconnect = 0
    })
    this.ws.on('unexpected-response', (...args) => this.emit('unexpected-response', args))
    this.ws.on('upgrade', (...args) => this.emit('upgrade', args))
    this.ws.on('error', (...args) => {
      if (args[0].message.startsWith('connect ECONNREFUSED')) {
        this.reconnecting = false
        return this.reconnect()
      }
      this.emit('error', args)
    })
    this.ws.on('close', (code, reason) => {
      if (code == 1006 && reason.toString('utf-8') === '')
        this.reconnect(code, reason)
      if (code !== 1000 && reason.toString('utf-8') !== 'destroy')
        this.reconnect(code, reason)

    })
    this.ws.on('message', (message) => {
      this.message(message.toString('utf-8'))
    })
  }

  reconnect(code?: number | null, reason?: Buffer) {
    if (this.reconnecting) return
    if (this.tryReconnect + 1 >= 100) return this.emit('failed', ({ tryReconnect: this.tryReconnect }))
    if (code === 1006 && this.connected) {
      this.connected = false
      this.emit('debugMessage', `It looks like a Node suddenly disconnected. I'm trying to reconnect it again.`)
    } else if (code !== 1000 && code !== undefined) {
      this.emit('debugMessage', `LavalinkNode: Closed with code ${code ?? -1} with reason "${reason?.toString('utf-8') ?? ''}"`)
    }
    this.reconnecting = true
    this.tryReconnect++
    this.ws?.removeAllListeners()
    this.ws = null
    this.emit('reconnect', (code ?? null, reason ?? null, {
      tryReconnect: this.tryReconnect,
      reconnecting: this.reconnecting
    }))
    setTimeout(() => {
      this.connect()
    }, 1 * 1000)
  }

  disconnect(shutdown?: boolean) {
    if (shutdown !== undefined && shutdown !== undefined) {
      if (shutdown === true) {
        this.ws?.removeAllListeners()
        this.connected = false
        this.sessionInfo = null
        this.stats = null
        this.ws = null
        return
      }
    }
  }

  private message(data: string) {
    const json = JSON.parse(data) as MessageLavalink
    this.emit('debug', json)
    if (json.op !== undefined)
      this.emit(json.op, json)


    if (json?.op === 'ready') {
      this.resume()
      this.sessionInfo = json
    } else if (json?.op === 'stats') {
      this.stats = json
    }
  }

  private ready() {

  }
}

export class LavalinkNodeManager {
  constructor() {

  }
}