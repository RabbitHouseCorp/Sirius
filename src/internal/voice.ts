/**
 * **Connecting**:
 * 
 * This means that the library is still working to obtain sessionID, endpoint, guildID
 * which are information needed to connect to the voice channel.
 * 
 * **waitingSession**:
 * 
 * Discord API may have returned invalid sessionID and the library may be trying to obtain session,
 * If this happens, it is because the Discord API is having problems or the library issued events with invalid data.
 * 
 * **waitingForShard**:
 * 
 * It means that the library is waiting for a `ready` event from the shard.
 * 
 * **waitingForShardToBeReady**:
 * 
 * The library is waiting for the shard to be ready for safe reasons before sending the necessary payload.
 * 
 * **voiceConnectionInterruptedByNode**:
 * 
 * It means that when the node is completely turned off, the voice connections are 
 * terminated, for a certain period of time the bot sometimes remains connected to 
 * the voice channel waiting for some type of expected response to recover the connection
 *  or recreate it.
 * 
 * **waitingNodeResponse**:
 * 
 * The library is waiting for a response from the node just to confirm that it is connected to the voice channel, 
 * as soon as it receives an event from the node called `playerUpdate`, this will be updated.
 *  
 */
export type VoiceStatus =
  | 'connecting'
  | 'waitingSession' | 'waitingForShard'
  | 'disconnected'
  | 'waitingForShardToBeReady'
  | 'connectionVoiceInRecovery'
  | 'voiceConnectionInterruptedByNode'
  | 'waitingNodeResponse'
  | 'connectionNotEstablished'
  | 'connected'



export interface IVoice {
  get shardID(): number | null
  get channelID(): string | null
  get guildID(): string
  get status(): VoiceStatus
  get ping(): number
  get endpoint(): string | null
  get countUsersConnected(): number
  get hostname(): string | null

  moveChannel(channelID: string): void

  disconnect(): void
  reconnect(): void
  connect(channelID?: string): void


}

export interface VoiceManagerOptions {
  voice?: {
    /**
     * Detects some player events that trigger inactivity.
     */
    inactivity?: {
      /**
       * How long the player can stay on the voice channel when a track is not playing.
       */
      time?: number | null
      detectInactivityInTrack?: boolean | null
      detectNoListenersOnVoiceChannel?: boolean | null
    } | null

    /**
     * This is a global configuration
     */
    audio?: {
      /**
       * When there is no track playing or when the player pauses or stops, the bot will automatically mute itself
       */
      mute?: boolean
      /**
       * Deafen the bot to protect the privacy of voice channel users.
       */
      deafen?: boolean
      /**
       * When mutating the bot manually on the server, it triggers an event for the player to immediately pause the player.
       */
      detectServerMute?: boolean
    } | null

    /**
     * When there is no user connected to the voice channel automatically disconnect from the channel.
     */
    autoDisconnectFromVoiceChannel?: boolean

    /**
     * The library will analyze and check, it will notify you when the connection is very bad.
     */
    checkVoiceChannelLatency?: boolean | [boolean, number]

    /**
     * When the bot or shard disconnects, the library will attempt to reestablish the connection as quickly as possible
     */
    listenDisconnectionOfBot?: boolean
  } | null
}



interface VoiceChannelManager {
  countUsersConnected(guildID: string): number | null
  connect(guildID: string, channelID: string, options: {
    selfMute?: boolean
    selfDeaf?: boolean
  }): boolean
  reconnect(guildID: string, channelID: string, options: {
    selfMute?: boolean
    selfDeaf?: boolean
  }): boolean
  disconnect(guildID: string, options: {
    selfMute?: boolean
    selfDeaf?: boolean
  }): boolean
  switch(guildID: string, channelID: string, options: {
    selfMute?: boolean
    selfDeaf?: boolean
  }): boolean
}



interface VoiceChannel {
  countUsersConnected(): number | null
  sessionReady(sessionID: string, endpoint: string, token: string, guildID: string): void
  connect(channelID: string, options: {
    selfMute?: boolean
    selfDeaf?: boolean
  }): boolean
  reconnect(channelID: string, options: {
    selfMute?: boolean
    selfDeaf?: boolean
  }): boolean
  disconnect(options: {
    selfMute?: boolean
    selfDeaf?: boolean
  }): boolean
  switch(channelID: string, options: {
    selfMute?: boolean
    selfDeaf?: boolean
  }): boolean
}

class VoiceStateChannel {
  state: (event: string, data: any) => void = () => { }

  listen(f: any): void {
    this.state = f
  }
}

export class Voice implements IVoice {
  #shardID: number | null = null
  #channelID: string | null = null
  #guildID: string = ''
  #status: VoiceStatus = 'waitingSession'
  #ping: number = -1
  #sessionID: string | null = null
  #token: string | null = null
  #endpoint: string | null = null
  //@ts-ignore
  #joined: boolean = false
  #bot: { selfMute: boolean; selfDeaf: boolean } = {
    selfDeaf: false,
    selfMute: false,
  }
  #channel: VoiceChannel | null = null
  #timeout: NodeJS.Timeout | null = null
  #shardConnectedRecently: boolean = false
  constructor(options: {
    selfMute: boolean
    selfDeaf: boolean
    guildID?: string
  } = { selfDeaf: false, selfMute: false },
    channels: VoiceChannel,
    stateChannel?: VoiceStateChannel) {
    if (options) {
      if (typeof options.guildID === 'string')
        this.#guildID = options.guildID
      if (typeof options.selfDeaf === 'boolean')
        this.#bot.selfDeaf = options.selfDeaf
      if (typeof options.selfMute === 'boolean')
        this.#bot.selfMute = options.selfMute
    }
    if (channels && typeof channels === 'object')
      this.#channel = channels
    if (stateChannel && typeof stateChannel === 'object') {
      stateChannel.listen((event: string, data: any) => this.#updateState(event, data))
    }
    Object.seal(this)
  }

  get selfDeaf(): boolean {
    return this.#bot.selfDeaf
  }

  set selfDeaf(value: boolean) {
    this.#bot.selfDeaf = value
  }

  get selfMute(): boolean {
    return this.#bot.selfMute
  }

  set selfMute(value: boolean) {
    this.#bot.selfMute = value
  }

  get shardID(): number | null {
    return this.#shardID
  }

  get channelID(): string | null {
    return this.#channelID
  }
  get guildID(): string {
    return this.#guildID
  }

  get status(): VoiceStatus {
    return this.#status
  }

  get ping(): number {
    return this.#ping
  }

  get endpoint(): string | null {
    return this.#endpoint
  }

  get countUsersConnected(): number {
    return this.#channel?.countUsersConnected() ?? 0
  }

  get hostname(): string | null {
    return this.#endpoint?.replace(/(https:\/\/|http:\/\/)|(discord|discordapp|discordmedia)\.[A-Za-z0-9]+|(:[0-9]+|\/.+)/, '') ?? null
  }

  #updateState(event: string, data: any) {
    if (event === 'shardID' && typeof data === 'number') {
      this.#shardID = data
    }

    if (event === 'shardDisconnect') {
      this.#shardConnectedRecently = true
    }

    if (event === 'shardVoice' && typeof data === 'string') {
      switch (data) {
        case 'disconnect':
          this.#shardConnectedRecently = true
          break
        case 'resume':
          this.#shardConnectedRecently = true
          if (typeof this.#channelID === 'string') {
            const channelID = this.#channelID
            this.#resetChannel()
            this.connect(channelID)
          }
          break
      }
    }
    if (event === 'playerVoiceUpdate') {
      if (data?.connected === true) {
        this.#status = 'connected'
      } else if (data?.connected === false) {
        this.#status = 'connectionNotEstablished'
      }

      if (typeof data?.ping === 'number') {
        if (!isNaN(data.ping) || !isFinite(data.ping))
          this.#ping = 99999
        else
          this.#ping = data.ping
      }
    }

    if (event === 'voiceState') {
      if (typeof data?.token === 'string') {
        this.#token = data.token
      }


      if (typeof data?.endpoint === 'string') {
        this.#endpoint = data.endpoint
      } else if (data?.endpoint == null && !data?.sessionID) {
        this.#resetChannel()
        if (this.#timeout) {
          clearTimeout(this.#timeout)
          this.#timeout = null
        }
        this.#timeout = setTimeout(() => {
          this.reconnect()
        }, 2 * 1000)
      }
      if (typeof data?.sessionID === 'string') {
        this.#sessionID = data.sessionID
      }

      if (typeof data?.joined === 'boolean') {
        this.#status = 'waitingNodeResponse'
        this.#joined = data.joined
      }
      this.#checkSession()
    }

    if (event === 'voiceClose') {
      if (typeof data?.code === 'number') {
        switch (data.code) {
          case 4009:
          case 1014:
          case 4009: {
            if (data?.byRemote === false) {
              this.#status = 'connectionVoiceInRecovery'
              this.disconnect()
              this.reconnect()
            }
            break
          }
          case 4006:
          case 4014:
            if (this.channelID != null && this.#shardConnectedRecently === true) {
              this.#resetChannel()
              this.connect(this.channelID)
            }
            break
          case 1001:
          case 1006:
            if (data?.byRemote === false) {
              this.#status = 'disconnected'
            }
            break
        }
      }
    }

    if (event === 'voiceUpdate') {
      if (typeof data?.ping === 'number') {
        if (!isFinite(data.ping) || isNaN(data.ping)) data.ping = 0
        this.#ping = data?.ping
      } else if (typeof data.ping === 'string') {
        this.#ping = parseFloat(data.ping)
      }
      if (typeof data?.connected === 'boolean') {
        this.#shardConnectedRecently = false
        this.#status = data?.connected ? 'connected' : 'waitingNodeResponse'
      }
    }

    if (event === 'nodeDisconnect') {
      this.#status = 'voiceConnectionInterruptedByNode'
    }
  }

  #checkSession() {
    if ((this.#token === null && this.#endpoint === null)) return
    if (this.#sessionID === null) return
    this.#shardConnectedRecently = false
    this.#status = 'waitingNodeResponse'
    this.#channel?.sessionReady(this.#sessionID!!, this.#endpoint!!, this.#token!!, this.#guildID)
  }

  #resetChannel() {
    this.#token = null
    this.#endpoint = null
    this.#sessionID = null
    this.#channelID = null
  }

  moveChannel(channelID: string): void {
    if (channelID && typeof channelID != 'string')
      throw new Error(`Voice(${this.#guildID}).moveChannel: [channelID] argument takes a string type`)
    if (!this.#channel?.connect && typeof this.#channel?.connect != 'function') return
    if (channelID == this.#channelID)
      throw new Error(`Voice(${this.#guildID}).moveChannel: The id you entered is the same as the one you are logged in to now.`)
    if (this.#timeout) {
      clearTimeout(this.#timeout)
      this.#timeout = null
    }
    this.#resetChannel()
    this.connect(channelID)
  }

  disconnect(): void {
    if (typeof this.#channel?.disconnect != 'function') return
    if (this.#timeout) {
      clearTimeout(this.#timeout)
      this.#timeout = null
    }
    this.#channel?.disconnect({
      selfMute: this.selfMute,
      selfDeaf: this.selfDeaf
    })
    this.#sessionID = null
    this.#endpoint = null
    this.#token = null
  }

  reconnect(): void {
    if (!this.#channel?.reconnect && typeof this.#channel?.reconnect != 'function') return
    if (this.#channelID == null) return
    if (this.#timeout) {
      clearTimeout(this.#timeout)
      this.#timeout = null
    }
    this.#channel?.reconnect(this.#channelID, {
      selfMute: this.selfMute,
      selfDeaf: this.selfDeaf
    })
  }

  connect(channelID?: string, options: {
    selfMute?: boolean
    selfDeaf?: boolean
  } = { selfDeaf: this.selfDeaf, selfMute: this.selfMute }): void {
    if (channelID && typeof channelID !== 'string')
      throw new Error(`Voice(${this.#guildID}).connect: [channelID] argument takes a string type`)
    if (!this.#channel?.connect && typeof this.#channel?.connect != 'function') return

    if (channelID) {
      this.#channelID = channelID
    }
    if (options?.selfDeaf) {
      this.#bot.selfDeaf = options.selfDeaf
    }
    if (options?.selfMute) {
      this.#bot.selfMute = options.selfMute
    }
    if (this.#timeout) {
      clearTimeout(this.#timeout)
      this.#timeout = null
    }

    this.#channel?.connect(
      channelID ? channelID : this.#channelID ?? '',
      {
        selfMute: options?.selfMute ? options.selfMute : this.selfMute,
        selfDeaf: options?.selfDeaf ? options.selfDeaf : this.selfDeaf
      })
  }
}

export class VoiceManager {
  #options: VoiceManagerOptions = {}
  #manager: VoiceChannelManager | null = null
  #voices: Array<{ state: VoiceStateChannel; voice: Voice }> = new Array()
  channel: VoiceStateChannel = new VoiceStateChannel()
  constructor(options: VoiceManagerOptions, manager: VoiceChannelManager) {
    if (manager && typeof manager === 'object')
      this.#manager = manager
    if (options && typeof options === 'object') {
      this.#options = {
        voice: typeof options?.voice === 'object' ? {
          inactivity: typeof options?.voice?.inactivity === 'object' ? {
            time: typeof options?.voice?.inactivity?.detectInactivityInTrack === 'number' ? options?.voice?.inactivity?.detectInactivityInTrack : null,
            detectNoListenersOnVoiceChannel: typeof options?.voice?.inactivity?.detectNoListenersOnVoiceChannel === 'boolean'
              ? options?.voice?.inactivity?.detectNoListenersOnVoiceChannel : false,
            detectInactivityInTrack: typeof options?.voice?.inactivity?.detectInactivityInTrack === 'boolean'
              ? options?.voice?.inactivity?.detectInactivityInTrack : false,
          } : null,
          audio: typeof options?.voice?.audio === 'object' ? {
            mute: typeof options?.voice?.audio?.mute === 'boolean'
              ? options?.voice?.audio?.mute : false,
            deafen: typeof options?.voice?.audio?.deafen === 'boolean'
              ? options?.voice?.audio?.deafen : false,
            detectServerMute: typeof options?.voice?.audio?.detectServerMute === 'boolean'
              ? options?.voice?.audio?.detectServerMute : false,
          } : null,
          autoDisconnectFromVoiceChannel: typeof options?.voice?.autoDisconnectFromVoiceChannel === 'boolean'
            ? options?.voice?.autoDisconnectFromVoiceChannel : false,
          checkVoiceChannelLatency: typeof options?.voice?.checkVoiceChannelLatency === 'boolean' ||
            (Array.isArray(options?.voice?.checkVoiceChannelLatency)
              && options?.voice?.checkVoiceChannelLatency.length == 2)
            ? options?.voice?.checkVoiceChannelLatency : false,
        } : null
      }
    }
  }

  updateState(event: string, { guildID, shardID, channelID }: {
    guildID?: string | null
    shardID?: number | null
    channelID?: string | null
  }, data: any) {
    if ((typeof guildID === 'string' && typeof channelID === 'string')) {
      this.#voices.find((voiceData) => voiceData.voice.guildID === guildID)?.state.state(event, data)
      return
    }
    if (typeof guildID === 'string')
      this.#voices.find((voiceData) => voiceData.voice.guildID === guildID)?.state.state(event, data)
    if (typeof channelID === 'string')
      this.#voices.find((voiceData) => voiceData.voice.channelID === channelID)?.state.state(event, data)
    if (typeof shardID === 'number')
      this.#voices
        .filter((voiceData) => voiceData.voice.shardID == shardID)
        .map((voiceData) => voiceData.state.state(event, data))
  }


  removeVoice(guildID: string): boolean {
    const index = this.#voices.findIndex((voiceData) => voiceData.voice.guildID === guildID)
    if (index == -1) return false
    this.#voices.splice(index, 1)
    return true
  }

  getVoice(guildID: string): Voice | null {
    return this.#voices.find((voiceData) => voiceData.voice.guildID === guildID)?.voice ?? null
  }

  createVoice(guildID: string): Voice {
    const state = new VoiceStateChannel()
    const voice = new Voice({
      selfDeaf: this.#options.voice?.audio?.deafen ?? false,
      selfMute: this.#options.voice?.audio?.mute ?? false,
      guildID
    }, {
      sessionReady: (sessionID, endpoint, token, guild) => {
        this.channel.state('sessionReady', { sessionID, endpoint, token, guild })
      },
      countUsersConnected: () => {
        return this.#manager?.countUsersConnected(guildID) ?? null
      },
      connect: (channelID, options = {
        selfDeaf: false,
        selfMute: false
      }) => {
        return this.#manager?.connect(guildID, channelID, options) ?? false
      },
      disconnect: (options = {
        selfDeaf: false,
        selfMute: false
      }) => {
        return this.#manager?.disconnect(guildID, options) ?? false
      },
      reconnect: (channelID, options = {
        selfDeaf: false,
        selfMute: false
      }) => {
        return this.#manager?.reconnect(guildID, channelID, options) ?? false
      },
      switch: (channelID, options = {
        selfDeaf: false,
        selfMute: false
      }) => {
        return this.#manager?.switch(guildID, channelID, options) ?? false
      },
    }, state)
    this.#voices.push({
      state,
      voice
    })
    return voice
  }
}