import EventEmitter from 'events'
import { VersionAPI } from './config'
import { VoiceBot } from './manager'
import { LavalinkRest } from './rest'
import { AudioTrack, TrackSearch, VoiceState, VolumePlayer } from './types'
import { IRequestUpdatePlayer, LavalinkPacketVoice, LoadType } from './typesRest'
import { PlayingTrack, TypePlayerUpdate } from './typesWebsocket'
import { LavalinkNodeConnection } from './websocket'


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
    this.on('playerUpdate', (data) => {
      this.player = data
    })
  }
  private get getLavalinkManager() {
    return this.lavalinkNodeConnection.lavalinkManager
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


  joinChannel(channelId: string, voiceSettings: VoiceBot) {
    if (typeof channelId !== 'string')
      throw new Error('channelId parameter is a string.');
    if (typeof voiceSettings !== 'object' && !Array.isArray(voiceSettings))
      throw new Error('voiceSettings parameter is a object.');
    this.getLavalinkManager.joinChannel(this.getGuildId, channelId, voiceSettings)
  }
}
