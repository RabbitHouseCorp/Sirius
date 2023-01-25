import EventEmitter from 'events'
import { LavalinkPlayer } from './player'

export interface IVoiceState {
  token: string
  guild_id: string
  endpoint: string
}

export interface VoiceBot {
  selfMute: boolean
  selfDeaf: boolean
}

export class VoiceStateManager {
  public guildId: string = ''
  private state: IVoiceState | null = null
  private sessionId: string | null = null
  public lavalinkPlayer: LavalinkPlayer<VoiceStateManager> | null = null
  public connected: boolean = false
  public latency: number = 0
  public LavalinkStructVoice: LavalinkStructVoice | null = null

  constructor(guildId: string, lavalinkPlayer: LavalinkPlayer<VoiceStateManager> | null, LavalinkStructVoice: LavalinkStructVoice | null) {
    if (typeof guildId === 'string') {
      this.guildId = guildId
    }
    if (lavalinkPlayer !== undefined && lavalinkPlayer !== null) {
      if (lavalinkPlayer instanceof LavalinkPlayer) {
        this.lavalinkPlayer = lavalinkPlayer
        this.addListener()
      }
    }
    if (LavalinkStructVoice !== undefined && LavalinkStructVoice !== null) {
      this.LavalinkStructVoice = LavalinkStructVoice
    }
  }

  private addListener() {
    if (this.lavalinkPlayer !== null) {
      this.lavalinkPlayer.on('playerUpdate', (data) => {
        this.connected = data.state.connected

        if (data.state.connected) {
          if (data.state.ping <= -1) return this.latency = 0
          this.latency = data.state.ping
        }
      })
    }
  }
  get getState() {
    if (this.state == null) return null
    return this.state
  }
  get getSessionId() {
    if (this.sessionId == null) return null
    return this.sessionId?.length <= 6 ? null : this.sessionId
  }

  setSessionId(id: string) {
    if (typeof id === 'string') {
      this.sessionId = id
    }
  }

  private joinChannel(mode: string) {
    if (this.getSessionId == undefined && this.getSessionId == null)
      throw new Error('Session is invalid')
    if (this.getState == undefined && this.getState == null)
      throw new Error('State property is invalid.')

    if (mode == 'rest') {
      // Todo:
      // this.lavalinkPlayer?.connectVoiceRest({
      //   sessionId: this.getSessionId!!,
      //   token: this.getState!!.token,
      //   endpoint: this.getState!!.endpoint,
      // })
    } else {
      this.lavalinkPlayer?.connectVoice({
        sessionId: this.getSessionId!!,
        event: {
          guildId: this.guildId,
          endpoint: this.getState!!.endpoint,
          token: this.getState!!.token
        }
      })
    }
  }
}

export class LavalinkStructVoice extends EventEmitter {
  public voiceStates: Array<VoiceStateManager> = new Array()
  public client: any
  public library: string | null = null


  constructor(client: any) {
    super()
    this.voiceStates = new Array()
    if (client !== undefined) {
      this.client = client
    }
  }

  getVoiceState(id: string): VoiceStateManager | null {
    const voice = this.voiceStates.filter((i) =>
      (i.guildId == id && i.getSessionId == id) && (i.lavalinkPlayer?.getGuildId == id && i.getState?.guild_id == id)
    )

    return voice == undefined ? voice : null
  }

  removeVoiceState(id: string) {
    const voice = this.voiceStates.findIndex((i) =>
      (i.guildId == id && i.getSessionId == id) && (i.lavalinkPlayer?.getGuildId == id && i.getState?.guild_id == id)
    )

    return voice <= -1 ? null : this.voiceStates.slice(voice, 1)
  }

  joinChannel(guildId: string, voiceChannelId: string, options?: VoiceBot) {
    if (this.library == 'Eris') {
      const shardId = this.client.options?.maxShards == undefined ? 0 : (Number(guildId) >> 22) % this.client.options.maxShards
      this.client.shards.get(shardId).sendWS(4, {
        'guild_id': guildId,
        'channel_id': voiceChannelId,
        'self_mute': typeof options?.selfMute === 'boolean' ? false : options?.selfMute,
        'self_deaf': typeof options?.selfDeaf === 'boolean' ? false : options?.selfDeaf,
      })
    }
  }



}



export class LavalinkManager extends LavalinkStructVoice {
  public shards: number = 1
  public user: string = ''

  constructor(client: any) {
    super(client)
    this.addReadyOnce()
  }


  private setLibrary(name: string) {
    this.library = name
  }

  addReadyOnce() {
    if (typeof this.client.once !== 'function') throw new Error('Unable to parse the client.');
    
    this.client.once('ready', () => {
      if (typeof this.client.user.id === 'string' && this.client.user.id != '') {
        this.user = this.client.user.id
      }

      if (this.client.shards.size) {
        this.shards = this.client.shards.size || 1
        this.setLibrary('Eris')
        this.emit('debugMessage', (`Library detected! You are using ${this.library}`))
      } else if (this.client.options.shardCount !== undefined) {
        this.shards = this.client.options.shardCount || 1
        this.setLibrary('Discord.js')
        this.emit('debugMessage', (`Library detected! You are using ${this.library}`))
        this.emit('debugMessageError', (`${this.library} not supported for now.`))
      }

      this.addListen()
    })
  }


  addListen() {
    if (this.library === 'Eris') {
      this.client.on('rawWs', (data: any) => {
        if (data.t === 'VOICE_SERVER_UPDATE') {
          this.emit('voiceServerUpdate', (data.d, false))
        } else if (data.t === 'VOICE_STATE_UPDATE') {
          this.emit('voiceStateUpdate', (data.d, false))
        } else if (data.t === 'GUILD_CREATE') {
          if (data.d.voice_states !== undefined) return
          for (const voiceState of data.d.voice_states) {
            this.emit('voiceStateUpdate', (voiceState, true))
          }
        }
      })
    }
  }
}