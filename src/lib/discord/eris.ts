import { AnyChannel, Client, Guild } from 'eris'
import { format } from 'util'
import { LibraryChannel, LibraryStruct } from '../LibraryStruct'


export class ErisLibrary implements LibraryStruct<Guild, AnyChannel> {
  #client: Client | null | undefined
  #libraryChannel: LibraryChannel | null = null

  constructor(libraryChannel: LibraryChannel, client: Client | null = null) {
    if (typeof client === 'object') {
      this.#client = client
      this.onListener()
    }

    if (libraryChannel && typeof libraryChannel === 'object')
      this.#libraryChannel = libraryChannel
  }


  countUsersConnected(guildID: string, channelID: string): number | null {
    const guild = this.getGuild(guildID)
    if (!guild) return null
    const users = guild.voiceStates.filter((user) => user.channelID === channelID).length
    return users - 1 < 0 ? 0 : users - 1
  }


  private onListener() {
    if (typeof this.#client?.on !== 'function') return
    this.#client
      .on('rawWS', ({ t, d }: any, shardID) => {
        if (!t && !d) return

        if (t == 'VOICE_SERVER_UPDATE') {
          if (this.#libraryChannel && typeof this.#libraryChannel?.voiceServer === 'function') {
            if (d?.guild_id != null && typeof this.#libraryChannel?.shardID === 'function')
              this.#libraryChannel?.shardID(shardID, { guildID: d?.guild_id ?? null })
            this.#libraryChannel.voiceServer(d?.token ?? null, d?.guild_id ?? null, d?.endpoint ?? null)
          }
        } else if (t == 'VOICE_STATE_UPDATE') {
          if (this.#client?.user.id != d?.user_id || this.#client?.user.id != d?.member?.user?.id) return
          if (this.#libraryChannel && typeof this.#libraryChannel?.voiceState === 'function') {
            if (d?.channel_id != null && typeof this.#libraryChannel?.shardID === 'function')
              this.#libraryChannel?.shardID(shardID, { channelID: d?.channel_id ?? null })
            this.#libraryChannel.voiceState(d?.session_id ?? null, d?.channel_id ?? null, {
              suppress: typeof d?.suppress === 'boolean' ? d.suppress : false,
              deaf: typeof d?.deaf === 'boolean' ? d.deaf : false,
              mute: typeof d?.mute === 'boolean' ? d.mute : false,
              selfMute: typeof d?.selfMute === 'boolean' ? d.selfMute : false,
              selfDeaf: typeof d?.selfDeaf === 'boolean' ? d.selfDeaf : false,
              sessionID: typeof d?.session_id === 'string' ? d.session_id : null,
              joined: typeof d?.channel_id === 'string' ? true : false
            })
          } else {
           
          }
        }
      })
      .on('shardDisconnect', (_, id) => {
        if (this.#libraryChannel && typeof this.#libraryChannel?.shardVoice === 'function') {
          this.#libraryChannel.shardVoice(id, 'disconnect')
        }
      })
      .on('shardResume', (id) => {
        if (this.#libraryChannel && typeof this.#libraryChannel?.shardVoice === 'function') {
          this.#libraryChannel.shardVoice(id, 'resume')
        }
      })
      .on('shardReady', (id) => {
        if (this.#libraryChannel && typeof this.#libraryChannel?.shardVoice === 'function') {
          this.#libraryChannel.shardVoice(id, 'ready')
        }
      })
      .once('ready', () => {
        if (this.#libraryChannel && typeof this.#libraryChannel?.defineClient === 'function') {
          if (this.#client?.user?.id != undefined) {
            this.#libraryChannel?.defineClient({ botID: this.#client.user.id })
          }
        }
      })
  }

  connectVoice(guildID: string, channelID: string, options: {
    selfMute?: boolean
    selfDeaf?: boolean
  } = { selfDeaf: false, selfMute: false }): boolean {
    if (typeof guildID != 'string')
      throw new Error('guildID requires a string type')
    else if (typeof channelID != 'string')
      throw new Error('channelID requires a string type')
    const guild = this.getGuild(guildID)

    if (guild == null) return false

    if (typeof guild?.shard?.sendWS === 'function' && guild?.shard?.ready === true) {
      guild.shard.sendWS(4, {
        guild_id: guildID,
        channel_id: channelID,
        ...(options && typeof options === 'object' ? {
          self_mute: typeof options.selfMute === 'boolean' ? options.selfMute : false,
          self_deaf: typeof options.selfDeaf === 'boolean' ? options.selfDeaf : false
        } : {})
      }, true)
      return true
    }
    return false
  }


  reconnectVoice(guildID: string, channelID: string, options: {
    selfMute?: boolean
    selfDeaf?: boolean
  } = { selfDeaf: false, selfMute: false }): boolean {

    return this.connectVoice(guildID, channelID, options)
  }

  disconnectVoice(guildID: string, options: {
    selfMute?: boolean
    selfDeaf?: boolean
  } = { selfDeaf: false, selfMute: false }): boolean {

    if (typeof guildID != 'string')
      throw new Error('guildID requires a string type')
    const guild = this.getGuild(guildID)
    if (guild == null) return false
    if (typeof guild?.shard?.sendWS === 'function' && guild?.shard?.ready === true) {
      guild.shard.sendWS(4, {
        guild_id: guildID,
        channel_id: null,
        ...(options && typeof options === 'object' ? {
          self_mute: typeof options.selfMute === 'boolean' ? options.selfMute : false,
          self_deaf: typeof options.selfDeaf === 'boolean' ? options.selfDeaf : false
        } : {})
      })
      return true
    }
    return false
  }

  switch(guildID: string, channelID: string, options: {
    selfMute?: boolean
    selfDeaf?: boolean
  } = { selfDeaf: false, selfMute: false }): boolean {

    if (typeof guildID != 'string')
      throw new Error('guildID requires a string type')
    else if (typeof channelID != 'string')
      throw new Error('guildID requires a string type')
    return this.connectVoice(guildID, channelID, options)
  }

  public getGuild(id: string): Guild | null {
    if (this.#client?.guilds == undefined && this.#client?.guilds == null)
      throw new Error(format('ErisGuild: There is something wrong with guild mapping in the Eris library.'))

    return this.#client?.guilds?.get(id) ?? null
  }

  public getChannel(id: string): AnyChannel | null {
    if (this.#client?.guilds == undefined && this.#client?.guilds == null)
      throw new Error(format('ErisGuild: There is something wrong with channels mapping in the Eris library.'))
    return this.#client?.guilds.find((guild) => this.#isUndefinedOrNull(guild?.channels) === false &&
      guild.channels?.get(id) != undefined)?.channels.get(id) ?? null
  }

  #isUndefinedOrNull(prop: any | null | undefined): boolean {
    return prop === undefined || prop === null
  }
}

