import EventEmitter from 'events'
import { WebSocket } from 'ws'
import { ConfigLavalink, validateConfig, VersionAPI } from './config'
import { LavalinkManager } from './manager'
import { LavalinkPlayer } from './player'
import { LavalinkRest } from './rest'
import { LavalinkNode } from './types'
import { MessageLavalink, TypeReady, TypeStats } from './typesWebsocket'
import { clientLibrary } from './utils'

const reformNameForEvent = (str: string) => {
  const s = str.split('')

  if (s[0] != undefined) {
    s[0] = s[0].toLocaleLowerCase()
  }

  return s.join('')
}


export type TypeCreatePlayer<VoiceChannelLibraryGeneric> = { player: LavalinkPlayer<VoiceChannelLibraryGeneric>, position: number }


export class LavalinkNodeConnection<VoiceChannelLibraryGeneric> extends EventEmitter {
  private ws?: WebSocket | null
  public sessionInfo: TypeReady | null
  public connected: boolean
  public reconnecting: boolean
  private tryReconnect: number = 0
  public stats: TypeStats | null
  public config!: ConfigLavalink
  public library: string
  public players: Array<LavalinkPlayer<VoiceChannelLibraryGeneric>>
  public lavalinkManager: LavalinkManager
  public rest: LavalinkRest | undefined | null = null
  public lavalinkNode: LavalinkNode | null = null

  constructor(config: ConfigLavalink, clientLibrary: any, lavalinkNode: LavalinkNode, rest?: LavalinkRest) {
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
    this.lavalinkManager = new LavalinkManager(clientLibrary)
    this.players = new Array<LavalinkPlayer<VoiceChannelLibraryGeneric>>()
    if (rest !== null) {
      this.rest = rest
    }
    if (lavalinkNode !== undefined && lavalinkNode !== null) {
      this.lavalinkNode = lavalinkNode
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

    return getPlayer <= -1 ? null : this.players.slice(getPlayer, 1)
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
    const protocol = this.lavalinkNode!!.secure ? 'wss://' : 'ws://'
    const prefixVersion = `/${this.getVersionApi}/`
    const port = `:${this.lavalinkNode!!.port}`
    return protocol + this.lavalinkNode!!.host + port + prefixVersion
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
  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.connected) return resolve(false)
      this.ws = new WebSocket(this.baseUrl + 'websocket', {
        headers: {
          Authorization: this.config.auth.authorization,
          'User-Id': this.lavalinkManager.user,
          'Client-Name': this.getLibrary,
          'Content-Type': 'application/json',
          ...this.getResumeKey
        }
      })

      this.ws.on('open', () => {
        resolve(true)
        this.connected = true
        this.reconnecting = false
        this.tryReconnect = 0
      })
      this.ws.on('unexpected-response', (...args) => this.emit('unexpected-response', ...args))
      this.ws.on('upgrade', (...args) => this.emit('upgrade', ...args))
      this.ws.on('error', (...args) => {
        if (args[0].message.startsWith('connect ECONNREFUSED')) {
          this.reconnecting = false
          return this.reconnect()
        }
        this.emit('error', ...args)
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
    this.emit('debug', (json))
    if (json.op !== undefined)
      this.emit(json.op, (json))


    if (json?.op === 'ready') {
      this.sessionInfo = json
    } else if (json?.op === 'stats') {
      this.stats = json
    } else if (json.op === 'event') {
      const player = this.getPlayer(json.guildId)
      if (player == null) return

      player.emit(reformNameForEvent(json.type), (json))
    } else if (json.op === 'playerUpdate') {
      const player = this.getPlayer(json.guildId)
      if (player == null) return

      player.emit(json.op, (json))
    }
  }
}