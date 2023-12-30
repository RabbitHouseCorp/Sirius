import EventEmitter from 'events'
import { IManager } from '../interface/IManager'
import { LibraryStruct } from '../lib/LibraryStruct'
import { ErisLibrary } from '../lib/discord/eris'
import { Node } from './node'
import { Player } from './player'
import { VoiceManager, VoiceManagerOptions } from './voice'

export type ManagerNodeOptions = {
  ip: string
  port?: number | null
  version?: 'auto' | 2 | 3 | 4 | 'custom'
  password: string | null
  useSSL?: boolean | null
  maxReconnect?: number | null
  time?: number | null
}

export type ManagerOptions = {
  nodes?: ManagerNodeOptions[]
  voiceManager?: VoiceManagerOptions
  botID?: string | null
}

export class Manager<A = any, B = any> extends EventEmitter implements IManager {

  #library: LibraryStruct<any, any> | null = null
  #nodes: Array<Node> = new Array()
  #players: Array<{ channel: any; player: Player<A, B> }> = new Array()
  #options: ManagerOptions = {}
  #voiceManager: VoiceManager | null = null
  #id: string | null = null
  constructor(client: any, options: ManagerOptions) {
    super()
    if (client && typeof client === 'object') {
      if (options && typeof options === 'object') {
        this.#options = {
          nodes: Array.isArray(options.nodes) ?
            options.nodes.map((node) => ({
              ip: typeof node.ip === 'string' ? node.ip : '',
              port: typeof node.port === 'number' ? node.port : null,
              version: node.version && (node.version === 'auto' || node.version === 2 || node.version === 3 || node.version === 4
                || node.version === 'custom') ? node.version : 'auto',
              password: typeof node.password === 'string' ? node.password : '',
              maxReconnect: typeof node.maxReconnect === 'number' ? node.maxReconnect : null,
              time: typeof node.time === 'number' ? node.time : null
            })) : [],
          voiceManager: typeof options.voiceManager === 'object' ? options.voiceManager : {},
          botID: typeof options.botID === 'string' ? options.botID : null
        }
        if (this.#options.botID) {
          this.#id = this.#options.botID
        }
      }
      this.#library = new ErisLibrary({
        voiceServer: (token, guild, endpoint) => this.#voiceServer(token, guild, endpoint),
        voiceState: (sessionID, channelID, options) => this.#voiceState(sessionID, channelID, options),
        shardVoice: (shard, status) => this.#shardVoice(shard, status),
        defineClient: (data) => {
          if (typeof data.botID === 'string') {
            this.#id = data.botID
          }
        },
        shardID: (shardID, data) => this.#voiceManager?.updateState('shardID', { ...data }, shardID)
      }, client)
      this.#voiceManager = new VoiceManager(this.#options?.voiceManager ?? {}, {
        connect: (guildID, channelID, options) => {
          return this.#library?.connectVoice(guildID, channelID, options) ?? false
        },
        reconnect: (guildID, channelID, options) => {
          return this.#library?.reconnectVoice(guildID, channelID, options) ?? false
        },
        disconnect: (guildID, options) => {
          return this.#library?.disconnectVoice(guildID, options) ?? false
        },
        switch: (guildID, channelID, options) => {
          return this.#library?.switch(guildID, channelID, options) ?? false
        },
        countUsersConnected: (guildID) => {
          return this.#library?.countUsersConnected(guildID) ?? null
        }
      })

      this.#voiceManager.channel.listen((event: any, data: any) => this.#voiceEvent(event, data))
    }
    if (this.#idObtainedByOption) {
      this.#readNodes()
    }
    Object.seal(this)
  }

  get #idObtainedByOption(): boolean {
    return typeof this.#options?.botID === 'string'
  }

  get getBotID(): string | null {
    return this.#id
  }

  get nodes(): Array<Node> {
    return this.#nodes
  }

  get isAvailable(): boolean {
    return this.#nodes.filter((node) => node.connected === true).length != 0
  }


  get getNodeUnavailable(): number {
    return this.#nodes.filter((node) => !node.connected).length
  }

  async #readNodes() {
    return new Promise((resolve, _) => {
      let p = 0

      if (Array.isArray(this.#options.nodes))
        for (const nodeOptions of this.#options.nodes)
          this.createNode({
            nodeID: p++,
            ...nodeOptions
          })
      resolve(null)
    })
  }

  async connect() {
    if (!this.#idObtainedByOption) {
      await this.#readNodes()
    }
    for (const node of this.#nodes.filter((node) => !node.connected)) {
      try {
        await node.asyncConnect()
      } catch (error) {
        this.emit('error', (error))
      }
    }

    if (this.#nodes.filter((node) => node.connected).length > 0) {
      this.emit('ready')
    }
  }

  createNode(options: { nodeID: number } & ManagerNodeOptions) {
    const node = new Node(options.nodeID, this.getBotID ?? '', {
      addressNode: options?.ip ?? null,
      port: options?.port ?? null,
      password: options?.password ?? null,
      useSSL: options?.useSSL ?? false,
      version: options?.version ?? 'auto'
    }, {
      getPlayer: (id) => this.getPlayer(id),
      player: (...args) => { this.#playerState(...args) },
      voice: (guildID, type, _, data) => this.#voiceManager?.updateState(type, { guildID }, data),
      rest: (_event, _, ..._args) => { }
    })
      .once('ready', (...args) => this.emit('readyNode', ...args))
      .on('debug', (...args) => this.emit('debug', ...args))
      .on('trace', (...args) => this.emit('trace', ...args))
      .on('disconnect', (...args) => this.emit('disconnect', ...args))
      .on('reconnect', (...args) => this.emit('reconnect', ...args))
      .on('reconnecting', (...args) => this.emit('reconnecting', ...args))
      .on('destroy', (...args) => this.emit('destroy', ...args))
      .on('connected', (...args) => this.emit('connected', ...args))
    this.#nodes.push(node)
    return node
  }

  #voiceServer(token: string | null, guildID: string | null, endpoint: string | null) {
    this.#voiceManager?.updateState('voiceState', { guildID }, {
      token,
      endpoint
    })
  }

  #voiceState(sessionID: string | null, channelID: string | null, options?: {
    suppress: boolean
    deaf: boolean
    mute: boolean
    selfMute: boolean
    selfDeaf: boolean
  }) {
    this.#voiceManager?.updateState('voiceState', { channelID }, {
      sessionID,
      ...options
    })
  }

  #shardVoice(shardID: number, status: 'disconnect' | 'resume' | 'ready') {
    this.#voiceManager?.updateState('shardVoice', { shardID }, status)
  }

  #selectNode(): Node | null {
    return this.nodes
      .filter((node) => node.connected === true)
      .sort((a, b) => (a.stats?.cpu?.lavalinkLoad ?? NaN) - (b.stats?.cpu?.lavalinkLoad ?? NaN))
      .at(0) ?? null
  }

  #voiceEvent(event: string, data: any) {
    if (event === 'sessionReady') {
      if (data.guild && typeof data.guild === 'string')
        this.#players.find((state) => state.player.getPlayerID === data.guild)?.channel.state('sessionVoice', data)
    }
    data = null
  }

  #playerState(guildId: string, type: string, _: boolean, data: any) {
    this.#players.find((state) => state.player.getPlayerID === guildId)?.channel.state(type, data)
    if (type === 'updatePlayer') {
      this.#voiceManager?.updateState('voiceUpdate', { guildID: guildId }, {
        connected: typeof data.connected === 'boolean' ? data.connected :
          typeof data?.state?.connected === 'boolean' ? data.state.connected : false,
        ping: typeof data.ping === 'number' ? data.ping :
          typeof data?.state?.ping === 'number' ? data.state.ping : false
      })
    }
  }

  getPlayer(playerID: string): Player<any, any> | null {
    return this.#players.find((state) => state.player.getPlayerID === playerID)?.player ?? null
  }

  createPlayer<A = any, B = any>(playerID: string): Player<A, B> {
    if (!this.isAvailable)
      throw new Error('There is no node available. Debug events to track reconnection or generated error.')
    const channel = Player.createChannel()
    const player = new Player(playerID, this.#selectNode()!!, {
      connectVoice: (guildID, channel, options) => {
        if (!this.#voiceManager?.getVoice(guildID)) this.#voiceManager?.createVoice(guildID)
        this.#voiceManager?.getVoice(guildID)?.connect(channel, options)
      },
      reconnect: (guildID) => this.#voiceManager?.getVoice(guildID)?.reconnect(),
      disconnectVoice: (guildID) => this.#voiceManager?.getVoice(guildID)?.disconnect(),
      moveVoiceChannel: (guildID, channel) => {
        this.#voiceManager?.getVoice(guildID)?.moveChannel(channel)
      },
      voiceInfo: (guildID) => this.#voiceManager?.getVoice(guildID) ?? null
    }, channel)
    this.#players.push({ channel: channel, player })
    return player
  }

  removePlayer(playerID: string): boolean {
    let index = this.#players.findIndex((state) => state.player.getPlayerID === playerID)
    if (index == -1) return false
    this.#players.splice(index, 1)
    return true
  }

  moveNodePlayer(_playerID: string | string[]): boolean {
    throw new Error('Method not implemented.');
  }

}