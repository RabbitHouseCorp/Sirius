import EventEmitter from 'events'
import { RawData, WebSocket } from 'ws'
import { RequestManager } from '../api/RequestManager'
import { TrackResultBase } from '../api/impl/TrackRest'
import { VersionHeader, getVersion } from '../api/lavalink/VersionHeader'
import { EndpointV2 } from '../api/lavalink/v2/EndpointV2'
import { EndpointV3 } from '../api/lavalink/v3/EndpointV3'
import { EndpointV4 } from '../api/lavalink/v4/EndpointV4'
import {
  INode,
  INodeClient,
  INodeConnectionState,
  INodeListeners,
  INodeState,
  INodeStats,
  INodeVoiceState,
  MessageNode,
  NodeMessageClient,
  NodeOPClient,
  VersionNode
} from '../interface/INode'
import { formatTime } from '../lib/time'
import { Track } from '../types/Track'
import { format } from '../utils'
import { ErrorGenerator } from '../utils/error'
import { Player } from './player'

const ReadyState = [3, 2, 0]

export interface ChannelMessageNode {
  getPlayer: (guildId: string) => Player | null
  player: (guildId: string, type: string, emit: boolean, data: any) => void
  voice: (guildId: string | null, type: string, emit: boolean, data: any) => void
  rest: (event: string, emit: boolean, ...args: any) => void
}

export type NodeClientOptions = {
  secure?: boolean
  host?: string
  port?: number | null
  password?: string
  get sessionID (): string | null
}

export class NodeClient implements INodeClient {
  #send: (data: NodeMessageClient) => boolean
  #version: 2 | 3 | 4 | 'custom'
  requestManager: RequestManager
  #sessionID: string = ''
  constructor(send: (data: NodeMessageClient) => boolean, version: 2 | 3 | 4 | 'custom', options: NodeClientOptions) {
    this.#send = send
    this.#version = version
    if (options?.sessionID && typeof options.sessionID === 'string')
      this.#sessionID = options.sessionID
    this.requestManager = new RequestManager({
      packageHttp: 'http',
      version: this.#version,
      password: options?.password ?? '',
      routes: this.#selectRoute(options as any)
    })
  }
  loadTrack<A, B, C> (identifier: string): Promise<TrackResultBase<A, B, C>> {
    return new Promise((resolve, reject) => {
      this.requestManager.loadTrack<A, B, C>(identifier)
        .then((data) => resolve(data))
        .catch((error) => reject(error))
    })
  }

  #selectRoute (options: { secure: boolean, host: string, port: number | null, password: string }): EndpointV2 | EndpointV3 | EndpointV4 {
    if (this.#version === 2) {
      return new EndpointV2({
        secure: options?.secure ?? false,
        host: options?.host ?? '',
        port: options?.port ?? null,
        version: 2
      })
    } else if (this.#version === 3) {
      return new EndpointV3({
        secure: options?.secure ?? false,
        host: options?.host ?? '',
        port: options?.port ?? null,
        version: 3
      })

    } else if (this.#version === 4) {
      return new EndpointV4({
        secure: options?.secure ?? false,
        host: options?.host ?? '',
        port: options?.port ?? null,
        version: 4
      })
    }
    return new EndpointV2({
      secure: options?.secure ?? false,
      host: options?.host ?? '',
      port: options?.port ?? null,
      version: 2
    })
  }

  async asyncPlayTrack (playerID: string, track: Track, options?: {
    startTime?: number
    endTime?: number
    noReplace?: boolean
  }): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.requestManager.checkEndpoint('getPlayer')) {
        this.requestManager.playerUpdate(this.#sessionID, playerID, {
          track,
          ...(typeof options?.startTime === 'number' ? { startTime: options.startTime } : {}),
          ...(typeof options?.endTime === 'number' ? { startTime: options.endTime } : {})
        }, typeof options?.noReplace === 'boolean' ? options?.noReplace : false)
          .then(() => resolve(true))
          .catch((error) => reject(error))
      } else {
        this.playTrack(playerID, track, options)
        resolve(true)
      }
    })
  }

  async asyncSeek (playerID: string, seek: number): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this.requestManager.checkEndpoint('getPlayer')) {
        this.requestManager.playerUpdate(this.#sessionID, playerID, {
          position: seek
        })
          .then((data) => resolve(data?.position ?? -1))
          .catch((error) => reject(error))
      } else {
        this.seekPlayer(playerID, seek)
        resolve(seek)
      }
    })
  }

  changeVolumePlayer (playerID: string, volume: number): Promise<null> {
    return new Promise((resolve, reject) => {
      if (this.requestManager.checkEndpoint('getPlayer')) {
        this.requestManager.playerUpdate(this.#sessionID, playerID, {
          volume: typeof volume === 'number' ? volume : 100
        })
          .then((_) => resolve(null))
          .catch((error) => reject(error))
        return
      }
      this.#send({
        op: NodeOPClient.Volume,
        guildId: playerID,
        volume: typeof volume === 'number' && !Number.isNaN(volume) ? volume : 100
      })
      resolve(null)
    })
  }
  setEqualizerPlayer<T = any[]> (playerID: string, equalizer: T): Promise<null> {
    return new Promise((resolve, reject) => {
      if (this.requestManager.checkEndpoint('getPlayer')) {
        this.requestManager.playerUpdate(this.#sessionID, playerID, {
          filters: {
            equalizer
          }
        })
          .then((_) => resolve(null))
          .catch((error) => reject(error))
        return
      }
      this.#send({
        op: NodeOPClient.Equalizer,
        guildId: playerID,
        equalizer: Array.isArray(equalizer) ? equalizer : Array.from(
          {
            length: 15
          },
          (_, index) => ({
            band: index, gain: 0.0
          })
        )
      }) as unknown as T[]
      resolve(null)
    })
  }

  setFiltersPlayer (playerID: string, filters: any): Promise<null> {
    return new Promise((resolve, reject) => {
      if (this.requestManager.checkEndpoint('getPlayer')) {
        this.requestManager.playerUpdate(this.#sessionID, playerID, {
          filters
        }).then((_) => resolve(null))
          .catch((error) => reject(error))
        return
      }
      this.#send({
        op: NodeOPClient.Filters,
        guildId: playerID,
        ...(filters)
      })
      resolve(null)
    })
  }
  playTrack (playerID: string, track: Track, options?: {
    startTime?: number
    endTime?: number
    noReplace?: boolean
  }): Promise<null> {
    return new Promise((resolve, reject) => {
      if (this.requestManager.checkEndpoint('getPlayer')) {
        this.requestManager.playerUpdate(this.#sessionID, playerID, {
          track,
          ...(typeof options?.startTime === 'number' ? { startTime: options.startTime } : {}),
          ...(typeof options?.endTime === 'number' ? { startTime: options.endTime } : {})
        }, typeof options?.noReplace === 'boolean' ? options?.noReplace : false)
          .then((_) => resolve(null))
          .catch((error) => reject(error))
        return
      }
      this.#send({
        op: NodeOPClient.Play,
        guildId: playerID,
        track: track.trackEncoded,
        ...(typeof options === 'object' ? options : {})
      })
      resolve(null)
    })
  }
  stopPlayer (playerID: string): Promise<null> {
    return new Promise((resolve, reject) => {
      if (this.requestManager.checkEndpoint('getPlayer')) {
        this.requestManager.playerUpdate(this.#sessionID, playerID, {
          track: null
        })
          .then((_) => resolve(null))
          .catch((error) => reject(error))
        return
      }
      this.#send({
        op: NodeOPClient.Stop,
        guildId: playerID
      })
      resolve(null)
    })
  }
  pausePlayer (playerID: string, pause: boolean): Promise<null> {
    return new Promise((resolve, reject) => {
      if (this.requestManager.checkEndpoint('getPlayer')) {
        this.requestManager.playerUpdate(this.#sessionID, playerID, {
          paused: pause
        }).then((_) => resolve(null))
          .catch((error) => reject(error))
        return
      }
      this.#send({
        op: NodeOPClient.Pause,
        guildId: playerID,
        pause: typeof pause === 'boolean' ? pause : false
      })
      resolve(null)
    })
  }
  destroyPlayer (playerID: string): Promise<null> {
    return new Promise((resolve, reject) => {
      if (this.requestManager.checkEndpoint('getPlayer')) {
        this.requestManager.destroyPlayer(this.#sessionID, playerID)
          .then((_) => resolve(null))
          .catch((error) => reject(error))
        return
      }
      this.#send({
        op: NodeOPClient.Destroy,
        guildId: playerID
      })
      resolve(null)
    })
  }
  seekPlayer (playerID: string, seek: number): Promise<null> {
    return new Promise((resolve, reject) => {
      if (this.requestManager.checkEndpoint('getPlayer')) {
        this.requestManager.playerUpdate(this.#sessionID, playerID, {
          position: typeof seek === 'number' ? seek : 0
        }).then((_) => resolve(null))
          .catch((error) => reject(error))
        return
      }
      this.#send({
        op: NodeOPClient.Seek,
        guildId: playerID,
        seek: typeof seek === 'number' ? seek : 0
      })
      resolve(null)
    })
  }

  connectPlayer (playerID: string, voiceState: INodeVoiceState): Promise<null> {
    return new Promise((resolve, reject) => {
      if (this.requestManager.checkEndpoint('getPlayer')) {
        this.requestManager.playerUpdate(this.#sessionID, playerID, {
          voice: {
            endpoint: typeof voiceState.endpoint === 'string' ? voiceState.endpoint : '',
            sessionId: typeof voiceState.sessionId === 'string' ? voiceState.sessionId : '',
            token: typeof voiceState.token === 'string' ? voiceState.token : ''
          }
        }).then((_) => resolve(null))
          .catch((error) => reject(error))
        return
      }
      this.#send({
        op: NodeOPClient.VoiceUpdate,
        guildId: playerID,
        endpoint: typeof voiceState.endpoint === 'string' ? voiceState.endpoint : '',
        sessionId: typeof voiceState.sessionId === 'string' ? voiceState.sessionId : '',
        token: typeof voiceState.token === 'string' ? voiceState.token : ''
      })
      resolve(null)
    })
  }

  updateStatePlayer (playerID: string, data: any) {
    if (this.requestManager.checkEndpoint('getPlayer')) {
      this.requestManager.playerUpdate(this.#sessionID, playerID, data)
      return
    }

    if (typeof data.volume === 'number') {
      this.changeVolumePlayer(playerID, data.volume)
    }

    if (data.track instanceof Track) {
      this.playTrack(playerID, data.track)
    }

    if (typeof data.paused === 'boolean') {
      this.pausePlayer(playerID, data.paused)
    }

    if (typeof data.position === 'number') {
      this.seekPlayer(playerID, data.position)
    }
  }

  destroyThis () {
    this.requestManager.destroy()
  }
}

export type StateUpdateFunction = (playerID: string, state: {
  time?: number | null
  position?: number | null
  connected?: boolean | null
  ping?: number | null
}) => void


export class Node extends EventEmitter implements INode {
  #nodeID: number = -1
  #sessionID: string | null = null
  #botID: string
  #version: VersionNode | null = null
  #state: INodeState = {
    tryReconnect: 0,
    maxReconnect: 0,
    destroyed: false
  }
  #client: NodeClient | null = null
  #stats: INodeStats | null = null
  #conn: WebSocket | null = null
  #connState: INodeConnectionState = {
    addressNode: '',
    port: null,
    password: null,
    useSSL: false,
  }
  #reconnectInfo = {
    reconnect: 0,
    start: 0,
    end: 2,
    maxReconnect: this.#connState.maxReconnect ?? 10,
    time: 0,
    timeDefault: this.#connState.time ?? 1 * 1000
  }
  #channel: ChannelMessageNode | null = null
  #startTimestamp: number | null = null
  #endTimestamp: number | null = null
  #connected: boolean = false
  #timeout: NodeJS.Timeout | null = null
  #defaultVersion: string | number | null = null
  on!: INodeListeners<this>
  #detectVersion: boolean = false

  constructor(
    nodeID: number,
    botID: string,
    conn: INodeConnectionState,
    channel: ChannelMessageNode
  ) {
    super()
    if (channel && typeof channel === 'object') {
      this.#channel = channel
    }
    if (typeof botID === 'string') {
      this.#botID = botID
    } else
      throw new Error('Node: [botID] argument is a type {string}.')
    if (typeof nodeID === 'number') {
      this.#nodeID = nodeID
    } else
      throw new Error('Node: [nodeID] argument is a type {string}.')
    if (conn, typeof conn === 'object') {
      if (typeof conn.addressNode === 'string') {
        this.#connState.addressNode = conn.addressNode
      } else
        throw new Error('Node: [conn.addressNode] argument is a type {string}.')
      if (typeof conn.password === 'string') {
        this.#connState.password = conn.password
      } else
        throw new Error('Node: [conn.password] argument is a type {string}.')
      if (conn?.port && typeof conn.port === 'number') {
        this.#connState.port = conn.port
      } else if (conn?.port)
        throw new Error('Node: [conn.port] argument is a type {number}.')
      if (conn?.useSSL && typeof conn.useSSL === 'boolean') {
        this.#connState.useSSL = conn.useSSL
      } else if (conn?.useSSL)
        throw new Error('Node: [conn.useSSL] argument is a type {boolean}.')
      if (conn?.maxReconnect && typeof conn.maxReconnect === 'number') {
        this.#connState.maxReconnect = conn.maxReconnect
      } else if (conn?.maxReconnect)
        throw new Error('Node: [conn.maxReconnect] argument is a type {number}.')
      if (conn?.time && typeof conn.time === 'number') {
        this.#connState.time = conn.time
      } else if (conn?.time)
        throw new Error('Node: [conn.time] argument is a type {number}.')
      if (conn?.version) {
        this.#setVersion(conn.version)
      }

    } else
      throw new Error('Node: [conn] argument is a type {object}.')
    Object.seal(this)
  }

  get stats (): INodeStats | null {
    return this.#stats
  }

  get latency (): number {
    return this.#startTimestamp != null && this.#endTimestamp != null
      ? this.#startTimestamp - this.#endTimestamp : 0
  }

  get client (): NodeClient | null {
    return this.#client
  }

  get nodeDestroyed (): boolean {
    return this.#state.destroyed
  }

  get connected (): boolean {
    return this.#connected
  }

  get #versionPath (): string {
    if (this.#version === ':v2') {
      return ''
    } else if (this.#version === ':v3') {
      return 'v3/websocket'
    } else if (this.#version === ':v4') {
      return 'v4/websocket'
    } else if (this.#version === ':custom') {
      return 'ws'
    }
    return ''
  }

  get #getUrl (): string {
    return `${(this.#connState?.useSSL ?? false) === false ? 'ws://' : 'wss://'}${this.#connState.addressNode}${this.#connState.port ? `:${this.#connState.port}` : ''}/${this.#versionPath}`
  }

  get sessionID (): string | null {
    return this.#sessionID
  }

  get isOpen (): boolean {
    if (this.#conn != null) {
      return this.#conn.readyState === 1 && this.connected
    }
    return false
  }

  get #ws (): WebSocket | null {
    return this.#conn
  }

  connect (): void {
    this.#connect()
  }

  sendNode (data: NodeMessageClient): boolean {
    this.emit('trace', (format("node({}) -> {}", this.#nodeID, data)))
    return this.#send(data)
  }


  #setVersion (version: string | number) {
    this.#client = null
    if (version === 'auto') {
      this.#client = new NodeClient((data) => this.sendNode(data), 2, {
        sessionID: this.sessionID,
        host: this.#connState.addressNode,
        port: this.#connState.port,
        password: this.#connState.password ?? '',
        secure: this.#connState.useSSL,
      })
      this.#version = ':auto'
    } else if (version === 2) {
      this.#client = new NodeClient((data) => this.sendNode(data), 2, {
        sessionID: this.sessionID,
        host: this.#connState.addressNode,
        port: this.#connState.port,
        password: this.#connState.password ?? '',
        secure: this.#connState.useSSL,
      })
      this.#version = ':v2'
    } else if (version === 3) {
      this.#client = new NodeClient((data) => this.sendNode(data), 3, {
        sessionID: this.sessionID,
        host: this.#connState.addressNode,
        port: this.#connState.port,
        password: this.#connState.password ?? '',
        secure: this.#connState.useSSL,
      })
      this.#version = ':v3'
    } else if (version === 4) {
      this.#client = new NodeClient((data) => this.sendNode(data), 4, {
        sessionID: this.sessionID,
        host: this.#connState.addressNode,
        port: this.#connState.port,
        password: this.#connState.password ?? '',
        secure: this.#connState.useSSL,
      })
      this.#version = ':v4'
    } else if (version === 'custom') {
      this.#version = ':custom'
      this.#client = new NodeClient((data) => this.sendNode(data), 2, {
        sessionID: this.sessionID,
        host: this.#connState.addressNode,
        port: this.#connState.port,
        password: this.#connState.password ?? '',
        secure: this.#connState.useSSL,
      })
    }

    if (this.#client != null) {
      this.#client.requestManager
        .on('debug', (...args) => this.emit('trace', ...[...args, this.#nodeID]))
        .on('trace', (...args) => this.emit('trace', ...[...args, this.#nodeID]))
    }

  }

  #emitErr (cause: string, message: string, ...args: any[]) {
    if (typeof message != 'string') message = ''
    if (typeof args !== 'object' || !Array.isArray(args)) args = []
    this.emit('error', (format(message, ...args), cause))
  }

  #create (): void {
    this.#conn = new WebSocket(this.#getUrl, {
      headers: {
        Authorization: this.#connState?.password ?? '',
        'User-Id': this.#botID,
        'Client-Name': 'sirius/nodejs',
        'Num-Shards': 0,
        ...(this.sessionID === null ? {} : ({ 'Session-Id': this.sessionID }))
      }
    })
    const time = performance.now()
    this.#conn
      .on('message', (message) => this.#wsMessage(message))
      .on('error', (error) => this.#error(error))
      .once('open', () => this.#open(this.#conn))
      .once('close', (code, reason) => this.#close(code, reason))
      .once('unexpected-response', (_, response) => {
        this.emit('debug', (format('The connection to node {} was established with an unexpected response that took {}', this.#nodeID, formatTime(performance.now() - time))))
        if (response.statusCode && ((response.statusCode < 200 || response.statusCode > 201) && response.statusCode != 101)) {
          if (response.statusCode === 404 && this.#detectVersion === false) {

            this.#detectVersion = true
            let version = getVersion((response?.headers ?? {}) as VersionHeader)
            if (typeof version === 'number' && version < 2)
              version = 2
            if (typeof version === 'number' && version > 4)
              version = 4
            if (typeof version === 'string')
              version = 'custom'
            this.#defaultVersion = version
            this.#setVersion(version)
            this.emit('debug', (format('Reconnecting because the endpoint was not detected, but the version header was identified and set to version: {}', version)))
            return this.#reconnect()
          }
          this.emit('debug', (format('Unable to establish a websocket connection because it received an invalid status code {}: {}!',
            response.statusCode ?? -1, response?.statusMessage ?? '')))
          return
        }
      })
      .once('upgrade', (request) => {
        this.emit('debug', (format('The request to connect to the node {} websocket server took {}', this.#nodeID, formatTime(performance.now() - time))))
        if (request.statusCode && ((request.statusCode < 200 || request.statusCode > 201) && request.statusCode != 101)) {
          this.emit('debug', (format('Unable to establish a websocket connection because it received an invalid status code {}: {}!',
            request.statusCode ?? -1, request?.statusMessage ?? '')))
          return
        }


        let version = getVersion(request.headers as VersionHeader)
        if (typeof version === 'number' && version < 2)
          version = 2
        if (typeof version === 'number' && version > 4)
          version = 4
        if (typeof version === 'string')
          version = 'custom'
        this.#defaultVersion = version
        this.#setVersion(version)
        if (!this.#detectVersion) {
          this.emit('debug', (format('Version {} was detected in the header, the library will direct resources to this version.', version)))
        }
      })



  }

  #error (error: Error) {
    if (error) {
      if (ReadyState.includes(this.#conn?.readyState ?? -1)) {
        this.emit('debug', (format('The {} node will try to connect.', this.#nodeID)))
        // Generally using this state means
        // that the connection was not made to the Node.
        this.#reconnect(true)
      }
    }
  }

  #send (d: string | any | null): boolean {
    let buffer = null
    if (this.isOpen) {
      if (d && typeof d === 'string') {
        buffer = Buffer.from(d)
      } else if (d && typeof d === 'object') {
        buffer = Buffer.from(JSON.stringify(d))
      }
      if (buffer) {
        this.#conn?.send(buffer, {
          compress: true,
          binary: true
        }, (err) => { err != undefined ? this.#emitErr('Websocket.send', err.message) : null })
      }
    }
    d = null
    return buffer != null
  }

  #open (_ws: WebSocket | null) {
    if (this.#conn) {
      this.#connected = true
      this.emit('connected')
    }
  }

  #connect (): void {
    if (this.#ws == null) {
      this.#create()
    }
  }

  #close (code: number = 1001, reason?: Buffer | string | null) {
    this.#conn?.removeAllListeners()
    if (this.#timeout != null) {
      clearTimeout(this.#timeout)
      this.#timeout = null
    }

    let reasonStr: string | null = null
    if (reason && reason instanceof Buffer) {
      if (reason.length != 0)
        reasonStr = reason.toString('utf-8')
      reason.fill(0)
    } else if (reason && typeof reason === 'string')
      if (reason.length != 0)
        reasonStr = reason
    if (code === 1001)
      this.emit('disconnect', (code, reasonStr ?? ''))
    if (reasonStr == null) {
      this.emit('debug', (
        format("The node {} disconnected with closing code {} with reason: {}", this.#nodeID, code, reasonStr)
      ))

    } else {
      this.emit('debug', (
        format("Node {} disconnected with code closure {} for no reason.", this.#nodeID, code)
      ))
    }
    reason = null
    this.#conn?.removeAllListeners()
    this.#conn?.terminate()
    this.#conn = null
    if (code === 1003)
      this.#create()
  }

  #reconnect (connect?: boolean): void {
    if (connect && typeof connect === 'boolean') {
      if (this.#reconnectInfo.reconnect++ < this.#reconnectInfo.maxReconnect) {
        if (this.#reconnectInfo.time > 15 * 1000) {
          this.#reconnectInfo.time = 0
        }
        setTimeout(() => this.connect(),
          Math.min(15 * 1000, this.#reconnectInfo.time += this.#reconnectInfo.timeDefault))

      } else if (this.#reconnectInfo.start++ < this.#reconnectInfo.end) {
        this.#reconnectInfo.reconnect = 0
        this.#reconnectInfo.time = 0
        this.#reconnect(true)
      } else {
        this.#reconnectInfo.start = 0
        this.#reconnectInfo.reconnect = 0
      }
    } else if (this.isOpen) {
      this.disconnect()
      this.#reconnect(true)
    } else if (this.#conn != null) {
      this.#conn?.removeAllListeners()
      this.#conn = null
      this.#create()
    } else {
      this.#create()
    }
  }
  disconnect (code: number = 1000, reason?: string | null): void {
    if (this.#conn != null) {
      if (typeof reason != 'string') reason = ''
      this.#conn.close(code, Buffer.from(reason ?? ''))
    }
  }
  #ping (): void {
    this.sendNode({
      op: NodeOPClient.Ping,
      timestamp: this.#startTimestamp = Math.floor(Date.now() / 1000)
    })
  }

  #pong (timestamp: string | number | null): void {
    this.#endTimestamp = Math.floor(Date.now() / 1000)
    if (typeof timestamp === 'string' && !Number.isNaN(parseInt(timestamp))) {
      let time: number | null = parseInt(timestamp)
      let resolveTimestamp: number | null = time - Math.floor(Date.now() / 1000) <= 0 ?
        15 * 1000 : time - Math.floor(Date.now() / 1000)
      this.#timeout = setTimeout(() => {
        this.#ping()
      }, resolveTimestamp)
      time = null
      resolveTimestamp = null
    }
  }

  destroy (): void {
    if (this.isOpen) {
      this.#close(1001)
    }
    this.#endTimestamp = null
    this.#startTimestamp = null
    this.#sessionID = null
    this.#channel = null
    this.#connected = false
  }

  #wsMessage (rawData: RawData | null = null) {
    let data: MessageNode
    if (rawData instanceof Buffer) {
      data = JSON.parse(rawData.toString('utf-8'))
      this.#onMessage(data)
      rawData.fill(0)
    } else if (rawData instanceof ArrayBuffer) {
      let textDecode = new TextDecoder()
      data = JSON.parse(textDecode.decode(rawData))
      this.#onMessage(data)
    } else if (Array.isArray(rawData)) {
      this.emit('error', (new ErrorGenerator('Buffer[] is not supported!'), 'wsMessage'))
    }

    rawData = null
  }

  #onMessage (message: MessageNode | null = null) {
    this.emit('trace', (format("node({}) <- {}", this.#nodeID, message)))
    if (message) {
      if (message.op == 'ready') {
        this.emit('ready', (message?.sessionId ?? null, message?.resumed ?? false))
        if (message?.resumed && message.resumed === true) {
          this.emit('debug', (
            format("Node {}, session {} has been successfully summarized.", this.#nodeID, message?.sessionId ?? null)
          ))
        } else {
          if (message.sessionId) {
            this.#sessionID = message.sessionId
            this.#setVersion(this.#defaultVersion ?? '')
          }
          this.emit('debug', (
            format("Node {} is ready, session {} has been created.", this.#nodeID, message?.sessionId ?? null)
          ))
        }
      } else if (message.op === 'playerUpdate') {
        if (message.guildId && typeof this.#channel?.player === 'function') {
          this.#channel?.player(message.guildId, 'updatePlayer', false, {
            time: message?.state?.time ?? null,
            position: message?.state?.position ?? null,
            connected: message?.state?.connected ?? null,
            ping: message.state?.ping ?? null,
          })
        }
      } else if (message.op === 'stats') {
        let { op, ...data } = message
        this.#stats = data
      } else if (message.op === 'event' && message.type === 'TrackStartEvent') {
        if (typeof message?.guildId === 'string' && typeof this.#channel?.player === 'function') {
          this.#channel?.player(message.guildId, 'eventTrack', true, message)
        }
      } else if (message.op === 'event' && message.type === 'TrackEndEvent') {
        if (typeof message?.guildId === 'string' && typeof this.#channel?.player === 'function') {
          this.#channel?.player(message.guildId, 'eventTrack', true, message)
        }
      } else if (message.op === 'event' && message.type === 'TrackExceptionEvent') {
        if (typeof message?.guildId === 'string' && typeof this.#channel?.player === 'function') {
          this.#channel?.player(message.guildId, 'eventTrack', true, message)
        }
      } else if (message.op === 'event' && message.type === 'TrackStuckEvent') {
        if (typeof message?.guildId === 'string' && typeof this.#channel?.player === 'function') {
          this.#channel?.player(message.guildId, 'eventTrack', true, message)
        }
      } else if (message.op === 'event' && message.type === 'WebSocketClosedEvent') {
        if (typeof message?.guildId === 'string' && typeof this.#channel?.voice === 'function') {
          this.#channel?.voice(message.guildId, 'voiceClose', true, message)
        }
      } else if (message.op === 'ping') {
        this.#pong(message?.timestamp ?? null)
      } else if (typeof (message as any)?.op === 'string') {
        if (this.listenerCount('opUnknown') != 0) {
          this.emit('opUnknown', (message))
        }
      }
    }
  }

  async asyncConnect (): Promise<boolean> {
    let tryResolve = 0
    return new Promise((resolve, _) => {
      this.connect()
      let callback = () => {
        if (tryResolve++ > 5) resolve(false)
      }
      this
        .once('connected', () => {
          resolve(true)
          this.removeListener('disconnect', callback)
        })
        .on('disconnect', callback)
    })
  }
}
