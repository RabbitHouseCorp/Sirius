import { EventEmitter } from 'stream'
import { TrackException, TrackMessage } from '../interface/INode'
import { Equalizer, IEqualizer, IFilters, IPlayer, IPlayerEmit, IPlayerListener, IPlayerListenerCount } from '../interface/IPlayer'
import { Track } from '../types/Track'
import { format } from '../utils'
import { ErrorGenerator } from '../utils/error'
import { Node } from './node'
import { Voice, VoiceStatus } from './voice'



export type ChannelEventVoicePlayer =
  | {
    event: 'updateState'
    channelID?: string | null
    ping?: number | null
    status?: VoiceStatus | null
    connected?: boolean

    /**
     * Get number of listeners on the voice channel. askodmasklj dmkasmd klamsdklmaskld mklasmdklasmd klmaskdlmaskldmklasmd kaslmdk lmaskldm akslmd
     */
    get countUsersConnected(): number
  }
  | {
    event: 'playerConnect'
    channelID: string | null
  }
  | {
    event: 'playerDisconnected'
    byRemote: boolean
    reestablishAConnection: boolean
  }

export type ChannelEventPlayer =
  | {
    event: 'TrackStartEvent'
    track: TrackMessage | null
    exception?: TrackException | null
  }

export interface PlayerState {
  volume: number
  playingTrack: Track | null
  paused: boolean
  equalizer: Equalizer | null
  filters: IFilters | null
  voiceInfo: Voice | null
  nodeID: number | null
}


export interface Channel {
  connectVoice(guildID: string, channelID: string, options?: { selfMute?: boolean, selfDeaf?: boolean }): void
  reconnect(guildID: string): void
  disconnectVoice(guildID: string): void
  moveVoiceChannel(guildID: string, channelID: string, options?: { selfMute?: boolean, selfDeaf?: boolean }): void
  voiceInfo(guildID: string): Voice | null
}


export class PlayerStateChannel {
  state: (event: string, data: any) => void = () => { }

  listen(f: any): void {
    this.state = f
  }
}


/**
 * Variable of {@link Player} are very limited and additional
 *  functions during change for example change the {@link Player.volume}

  ```ts
  // It's the same logic as the `setVolume` function
  // This works for lavalink-v2, lavalink-v3 or or a custom node
  player.volume = 20

  // Execute function 
  player.setVolume(20)
  ```

 * This class also includes a seal to prevent addition or modification, 
 * removal of properties to prevent circulating classes 
 * that end up adding more bytes to the class.
 * 
 * 
 * If you want to add some type of state to this class to save channel
 * IDs or a class that provides faster access for development, it is not yet supported.
 * 
 * **Remember**: If you are using Lavalink V4, you must be having value change actions on variables such as {@link Player.pause}, {@link Player.volume}, 
 * {@link Player.filters}, {@link Player.equalizer} 
 * which are directed to creating a request via HTTP to the Node to
 * make changes of the player, because recent updates indicate a 
 * change in the {@link Player}, which used to be via WebSocket and is now via HTTP. 
 * So use this carefully, as it may require more memory allocations for requests.
 * If you want to control player modifications, the recommendation is to execute
 * by functions or asynchronous functions.

 */
export class Player<T = any, R = any> extends EventEmitter implements IPlayer {
  #id: number = Math.floor(Math.random() * 10000000000000)
  #playerID: string
  #node: Node | null = null
  #nodeID: number | null = null
  #paused: boolean = false
  #playingTrack?: Track<T, R> | null = null
  #endTrack: number | null = 0
  #equalizer: Equalizer = Array.from(
    {
      length: 15
    },
    (_, index) => ({
      band: index, gain: 0.0
    })
  ) as Equalizer
  #filters: IFilters = {
    karaoke: {
      level: 0.0,
      monoLevel: 0.0,
      filterBand: 0.0,
      filterWidth: 0.0
    },
    timescale: {
      speed: 0.0,
      pitch: 0.0,
      rate: 0.0
    },
    tremolo: {
      frequency: 0.0,
      depth: 0.0
    },
    rotation: {
      rotationHz: 0.0
    },
    distortion: {
      sinOffset: 0.0,
      sinScale: 0.0,
      cosOffset: 0.0,
      cosScale: 0.0,
      tanOffset: 0.0,
      tanScale: 0.0,
      offset: 0.0,
      scale: 0.0
    },
    channelMix: {
      leftToLeft: 0.0,
      leftToRight: 0.0,
      rightToLeft: 0.0,
      rightToRight: 0.0,
    },
    lowPass: {
      smoothing: 0.0
    }
  }
  #volume: number = 100
  #channel: Channel | null = null
  #timeSeek: number = 0
  //@ts-ignore
  #awaitSyncSeek: boolean = false
  on!: IPlayerListener<this, T, R>
  once!: IPlayerListener<this, T, R>
  emit!: IPlayerEmit<T, R>
  addListener!: IPlayerListener<this, T, R>
  listenerCount!: IPlayerListenerCount
  constructor(playerID: string, node: Node, channel: Channel, stateChannel: PlayerStateChannel) {
    super()
    this.emit
    if (typeof playerID === 'string') {
      this.#playerID = playerID
    } else
      throw new Error('Player: [playerID] argument is a string.')
    if (node instanceof Node) {
      this.#node = node
    } else
      throw new Error('Player: [node] argument is a Node')
    if (stateChannel instanceof PlayerStateChannel)
      stateChannel.listen((event: string, data: any) => this.#state(event, data))
    if (typeof channel === 'object')
      this.#channel = channel
    Object.seal(this)
  }

  static developer() {
    return true
  }

  static createChannel(): PlayerStateChannel {
    return new PlayerStateChannel()
  }

  #state(event: string, d: any) {
    if (event === 'nodeWasMoved') {
      if (this.listenerCount('nodeWasMoved') != 0)
        this.emit(
          'nodeWasMoved',
          this.#nodeID ?? -1,
          typeof d?.id === 'number' ? d.id as number : -1,
          typeof d?.remoted === 'boolean' ? d?.remoted : false)
    }

    if (event === 'nodeDisconnected') {
      if (this.listenerCount('nodeDisconnected') != 0)
        this.emit('nodeDisconnected', this.#nodeID ?? -1)
    }

    if (event === 'nodeReconnected') {
      if (this.listenerCount('nodeReconnected') != 0)
        this.emit('nodeReconnected', this.#nodeID ?? -1)
    }

    if (event === 'updateNode') {
      if (d instanceof Node)
        this.#node = d
      if (this.voiceInfo?.channelID) {
        this.connectVoice(this.voiceInfo?.channelID)
      }
      this.#node?.client?.updateStatePlayer(this.getPlayerID, {
        track: this.#playingTrack,
        position: this.position,
        volume: this.volume,
        paused: this.paused,
        filters: {
          equalizer: this.#equalizer,
          ...(this.#filters)
        }
      })
    }
    if (event === 'sessionVoice') {
      this.#node?.client?.connectPlayer(this.getPlayerID, {
        sessionId: typeof d.sessionID === 'string' ? d.sessionID : '',
        endpoint: typeof d.endpoint === 'string' ? d.endpoint : '',
        token: typeof d.token === 'string' ? d.token : ''
      })
    }

    if (event === 'eventTrack') {
      if (d.type === 'TrackStartEvent') {
        if (this.listenerCount('onTrackStart')) {
          this.emit('onTrackStart', (new Track(d.track)))
        }
        this.#awaitSyncSeek = true
        this.#playingTrack = new Track(d.track)
        this.#endTrack = Date.now() + this.#playingTrack.info.length
      }
      if (d.type === 'TrackEndEvent') {
        let reason = d.reason === 'string' ? null : d.reason.toLowerCase()
        if (this.listenerCount('onTrackEnd')) {
          this.emit('onTrackEnd', new Track(d.track),
            reason,
            reason === 'finished' || reason === 'loadFailed')
        }
        switch (reason) {
          case 'replaced':
          case 'cleanup':
          case 'stopped':
            this.#endTrack = null
        }
        this.#awaitSyncSeek = false
      }
      if (d.type === 'TrackExceptionEvent') {
        if (this.listenerCount('onTrackException')) {
          this.emit('onTrackException', new Track(d.track), (d?.exception as any) ?? null)
        }
        this.#awaitSyncSeek = false
        this.#playingTrack = null
      }
      if (d.type === 'TrackStuckEvent') {
        if (this.listenerCount('onTrackStuck')) {
          this.emit('onTrackStuck', new Track(d.track), typeof d?.thresholdMs === 'number' ? d.thresholdMs : null)
        }
        this.#awaitSyncSeek = false
      }
    }

    if (event === 'updatePlayer') {
      if (typeof d?.state?.position === 'number' && this.#playingTrack != null) {
        if (d.state.position > 1 && this.#awaitSyncSeek === true) {
          this.#awaitSyncSeek = false
          this.#endTrack = Date.now() + ((this.#playingTrack.info.length ?? 0) - d.state.position)
        }
      }

      if (typeof d?.position === 'number' && this.#playingTrack != null) {
        if (d.position > 1 && this.#awaitSyncSeek === true) {
          this.#awaitSyncSeek = false
          this.#endTrack = Date.now() + ((this.#playingTrack.info.length ?? 0) - d.position)
        }
      }

      if (typeof d?.seek === 'number' && this.#playingTrack != null) {
        if (d.seek > 1 && this.#awaitSyncSeek === true) {
          this.#awaitSyncSeek = false
          this.#endTrack = Date.now() + ((this.#playingTrack.info.length ?? 0) - d.seek)
        }
      }
    }

    d = null
  }

  get isPlayingTrack(): boolean {
    return this.#playingTrack != null
  }
  get position(): number {
    if (this.#paused === true)
      return this.#timeSeek
    if ((this.#startTrack ?? 0) - (this.#endTrack ?? 0) < 0)
      return 0
    if ((this.#startTrack ?? 0) - (this.#endTrack ?? 0) > (this.playingTrack?.info?.length ?? 0))
      return this.playingTrack?.info?.length ?? 0
    return (this.#startTrack ?? 0) - (this.#endTrack ?? 0)
  }

  get volume(): number {
    return this.#volume
  }

  get pause(): boolean {
    return this.#paused
  }

  set pause(value: boolean) {
    if (typeof value !== 'boolean') value = false
    if (value === true && this.#playingTrack != null) {
      this.#timeSeek = this.position
    }
    else if (value === false && this.#playingTrack != null) {
      this.#timeSeek = 0
      this.#endTrack = Date.now() + (this.#playingTrack.info.length - this.#timeSeek)
    }
    this.#paused = value
    this.#setPause(value)
  }

  /**
   * Changing the value of this variable can trigger the execution
   * of a function that belongs to {@link Player.setVolume}
   */
  set volume(value: number) {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isInteger(value)) value = this.#volume
    this.#volume = value
    this.#setVolume(value)
  }

  get getPlayerID(): string {
    return this.#playerID
  }

  get getID(): number {
    return this.#id
  }

  get filters(): IFilters {
    return this.#filters
  }

  set filters(value: IFilters) {
    if (value?.karaoke && typeof value.karaoke === 'object') {
      if (value.karaoke.level || (value.karaoke.level < 0.0 || value.karaoke.level > 1.0))
        throw new ErrorGenerator(format('Filter.karaoke.level: minimum of 0.0f to 1.0f is acceptable. The provided value {}f is not acceptable.',
          value.karaoke.level))
      else if (value.karaoke.level && typeof value.karaoke.level === 'number')
        this.#filters.karaoke.level = value.karaoke.level

      if (value.karaoke.monoLevel || (value.karaoke.monoLevel < 0.0 || value.karaoke.monoLevel > 1.0))
        throw new ErrorGenerator(format('Filter.karaoke.monoLevel: minimum of 0.0f to 1.0f is acceptable. The provided value {}f is not acceptable.',
          value.karaoke.monoLevel))
      else if (value.karaoke.monoLevel && typeof value.karaoke.monoLevel === 'number')
        this.#filters.karaoke.monoLevel = value.karaoke.monoLevel

      if (value.karaoke.filterBand && typeof value.karaoke.filterBand === 'number')
        this.#filters.karaoke.filterBand = value.karaoke.filterBand

      if (value.karaoke.filterWidth && typeof value.karaoke.filterWidth === 'number')
        this.#filters.karaoke.filterWidth = value.karaoke.filterWidth
    }

    if (value?.timescale && typeof value.timescale === 'object') {
      if (value.timescale.speed || value.timescale.speed < 0.0)
        throw new ErrorGenerator(format('Filter.timescale.speed: minimum of 0.0f is acceptable. The provided value {}f is not acceptable.',
          value.timescale.speed))
      else if (value.timescale.speed && typeof value.timescale.speed === 'number')
        this.#filters.timescale.speed = value.timescale.speed

      if (value.timescale.pitch || value.timescale.pitch < 0.0)
        throw new ErrorGenerator(format('Filter.timescale.pitch: minimum of 0.0f is acceptable. The provided value {}f is not acceptable.',
          value.timescale.pitch))
      else if (value.timescale.pitch && typeof value.timescale.pitch === 'number')
        this.#filters.timescale.pitch = value.timescale.pitch

      if (value.timescale.rate || value.timescale.rate < 0.0)
        throw new ErrorGenerator(format('Filter.timescale.rate: minimum of 0.0f is acceptable. The provided value {}f is not acceptable.',
          value.timescale.rate))
      else if (value.timescale.rate && typeof value.timescale.rate === 'number')
        this.#filters.timescale.rate = value.timescale.rate
    }

    if (value?.rotation && typeof value.rotation === 'object') {
      if (value.rotation.rotationHz && typeof value.rotation.rotationHz === 'number')
        this.#filters.rotation.rotationHz = value.rotation.rotationHz
    }

    if (value?.distortion && typeof value.distortion === 'object') {
      if (value.distortion.sinOffset && typeof value.distortion.sinOffset === 'number')
        this.#filters.distortion.sinOffset = value.distortion.sinOffset

      if (value.distortion.sinScale && typeof value.distortion.sinScale === 'number')
        this.#filters.distortion.sinScale = value.distortion.sinScale

      if (value.distortion.cosOffset && typeof value.distortion.cosOffset === 'number')
        this.#filters.distortion.cosOffset = value.distortion.cosOffset

      if (value.distortion.cosScale && typeof value.distortion.cosScale === 'number')
        this.#filters.distortion.cosScale = value.distortion.cosScale

      if (value.distortion.tanOffset && typeof value.distortion.tanOffset === 'number')
        this.#filters.distortion.tanOffset = value.distortion.tanOffset

      if (value.distortion.tanScale && typeof value.distortion.tanScale === 'number')
        this.#filters.distortion.tanScale = value.distortion.tanScale

      if (value.distortion.offset && typeof value.distortion.offset === 'number')
        this.#filters.distortion.offset = value.distortion.offset

      if (value.distortion.scale && typeof value.distortion.scale === 'number')
        this.#filters.distortion.scale = value.distortion.scale
    }

    if (value?.tremolo && typeof value.channelMix === 'object') {
      if (value.tremolo.depth && (value.tremolo.depth < 0.0 || value.tremolo.depth > 1.0))
        throw new ErrorGenerator(format('Filter.tremolo.depth: minimum of 0.0f to 1.0f is acceptable. The provided value {}f is not acceptable.',
          value.tremolo.depth))
      else if (value.tremolo.depth && typeof value.tremolo.depth === 'number')
        this.#filters.tremolo.depth = value.tremolo.depth

      if (value.tremolo.frequency && value.tremolo.frequency < 0.0)
        throw new ErrorGenerator(format('Filter.tremolo.frequency: minimum of 0.0f to 1.0f is acceptable. The provided value {}f is not acceptable.',
          value.tremolo.frequency))
      else if (value.tremolo.frequency && typeof value.tremolo.frequency === 'number')
        this.#filters.tremolo.frequency = value.tremolo.frequency
    }

    if (value?.channelMix && typeof value.channelMix === 'object') {
      if (value.channelMix.leftToLeft && (value.channelMix.leftToLeft < 0.0 || value.channelMix.leftToLeft > 1.0))
        throw new ErrorGenerator(format('Filter.channelMix.leftToLeft: minimum of 0.0f to 1.0f is acceptable. The provided value {}f is not acceptable.',
          value.channelMix.leftToLeft))
      else if (value.channelMix.leftToLeft && typeof value.channelMix.leftToLeft === 'number')
        this.#filters.channelMix.leftToLeft = value.channelMix.leftToLeft

      if (value.channelMix.leftToRight && (value.channelMix.leftToRight < 0.0 || value.channelMix.leftToRight > 1.0))
        throw new ErrorGenerator(format('Filter.channelMix.leftToRight: minimum of 0.0f to 1.0f is acceptable. The provided value {}f is not acceptable.',
          value.channelMix.leftToRight))
      else if (value.channelMix.leftToRight && typeof value.channelMix.leftToRight === 'number')
        this.#filters.channelMix.leftToRight = value.channelMix.leftToRight

      if (value.channelMix.rightToLeft && (value.channelMix.rightToLeft < 0.0 || value.channelMix.rightToLeft > 1.0))
        throw new ErrorGenerator(format('Filter.channelMix.rightToLeft: minimum of 0.0f to 1.0f is acceptable. The provided value {}f is not acceptable.',
          value.channelMix.rightToLeft))
      else if (value.channelMix.rightToLeft && typeof value.channelMix.rightToLeft === 'number')
        this.#filters.channelMix.rightToLeft = value.channelMix.rightToLeft

      if (value.channelMix.rightToRight && (value.channelMix.rightToRight < 0.0 || value.channelMix.rightToRight > 1.0))
        throw new ErrorGenerator(format('Filter.channelMix.rightToRight: minimum of 0.0f to 1.0f is acceptable. The provided value {}f is not acceptable.',
          value.channelMix.rightToRight))
      else if (value.channelMix.rightToRight && typeof value.channelMix.rightToRight === 'number')
        this.#filters.channelMix.rightToRight = value.channelMix.rightToRight
    }

    if (this.#filters && typeof this.#filters === 'object') {
      // Mention important fields in the list to change values
      // ​​and the function will automatically be triggered. 
      // Use planned value changes to avoid memory leaks.
      // Of course if your node is using HTTP to change.
      // 
      //  Using WebSocket sending does not use as much RAM.
      if ((!Array.isArray(value) && typeof value === 'object')
        && Object.keys(value).find(((key) => ['karaoke', 'timescale', 'tremlo', 'rotation', 'distortion', 'channelMix', 'lowPass'].includes(key))))
        this.#node?.client?.setFiltersPlayer(this.getPlayerID, this.#filters)
    }
  }


  set equalizer(eq: IEqualizer | Equalizer) {
    if (Array.isArray(eq) && eq.length > 0) {
      let eqList = eq.filter((equalizer) => typeof equalizer.band === 'number' && typeof equalizer.gain === 'number')
      for (let e of eqList) {
        let index = this.#equalizer?.findIndex((b) => b.band === e?.band)
        let eq
        if (index != -1)
          if (e.gain < -0.25)
            throw new ErrorGenerator(format("equalizer[band: {}]: This band only supports down to -0.25 and the provided value of {}f is not acceptable.", e.band, e.gain));
          else if (e.gain > 1.0)
            throw new ErrorGenerator(format("equalizer[band: {}]: This band only supports up to a maximum of 1.0f and the provided value of {}f has exceeded it.", e.band, e.gain))
          else if (eq = this.#equalizer?.at(index ?? -1))
            eq.gain = e.gain
        eq = null
      }
      this.#setEqualizer(this.#equalizer)
    } else if (typeof eq === 'object'
      && (typeof (eq as IEqualizer).band === 'number'
        && typeof (eq as IEqualizer).gain === 'number')) {
      let e = eq as (IEqualizer | null)
      const bandIndex = this.#equalizer?.findIndex((b) => b.band === e?.band)
      let eqObj
      if (e && bandIndex != -1) {
        if (e.gain < -0.25)
          throw new ErrorGenerator(format("equalizer[band: {}]: This band only supports down to -0.25 and the provided value of {}f is not acceptable.", e.band, e.gain));
        else if (e.gain > 1.0)
          throw new ErrorGenerator(format("equalizer[band: {}]: This band only supports up to a maximum of 1.0f and the provided value of {}f has exceeded it.", e.band, e.gain))
        if (eqObj = this.#equalizer?.at(bandIndex ?? -1))
          eqObj.gain = e?.gain
      }

      this.#setEqualizer(this.#equalizer)
      e = null, eqObj = null
    }
  }

  get equalizer(): Equalizer {
    return this.#equalizer
  }

  get voiceInfo(): Voice | null {
    return this.#channel?.voiceInfo(this.getPlayerID) ?? null
  }

  get playingTrack(): Track<T, R> | null {
    return this.#playingTrack ?? null
  }

  get paused(): boolean {
    return this.#paused
  }

  get playerIsUnavailable(): boolean {
    return (this.#node?.nodeDestroyed ?? true) === true
      && (this.#node?.connected ?? false) === false
  }

  get #startTrack(): number | null {
    if (this.#endTrack === null && this.playingTrack === null) return null
    return Date.now() + (this.#playingTrack?.info.length ?? 0)
  }


  /**
   * 
   * 
   */
  #setVolume(volume: number): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.playerIsUnavailable) {
        this.#node?.client?.changeVolumePlayer(this.getPlayerID, volume)
          .then((_) => {
            if (this.listenerCount('volume') != 0)
              this.emit('volume', volume)
            resolve(volume)
          })
          .catch((error) => reject(error))
        return
      }

      reject(Error('The Node is unavailable!'))
    })
  }

  #setPause(pause: boolean): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.playerIsUnavailable) {
        this.#node?.client?.pausePlayer(this.getPlayerID, pause)
          .then((_) => {
            this.#awaitSyncSeek = true
            if (this.listenerCount('pause') != 0)
              this.emit('pause', pause)
            resolve(pause)
          })
          .catch((error) => reject(error))
        return
      }
      reject(Error('The Node is unavailable!'))
    })

  }
  #setEqualizer(eq: Equalizer): Promise<Equalizer> {
    return new Promise((resolve, reject) => {
      if (!this.playerIsUnavailable) {
        const filterCheck = eq
          .filter((equalizer) => (equalizer.gain < -0.25 || equalizer.gain > 1.0) ? true : false)
          .map((value) => value.gain < -0.25 ?
            format("equalizer[band: {}]: This band only supports down to -0.25 and the provided value of {}f is not acceptable.", value.band, value.gain) :
            format("equalizer[band: {}]: This band only supports up to a maximum of 1.0f and the provided value of {}f has exceeded it.", value.band, value.gain))
          .flatMap((value) => value)
        if (filterCheck.length > 0) {
          return reject(new ErrorGenerator('Values not supported in bands.', filterCheck))
        }
        this.#node?.client?.setEqualizerPlayer(this.getPlayerID, eq)
          .then((_) => {
            if (this.listenerCount('filters') != 0)
              this.emit('filters', { ...(this.#filters), equalizer: this.#equalizer })
            resolve(eq)
          })
          .catch((error) => reject(error))
        return
      }
      reject(Error('The Node is unavailable!'))
    })
  }

  async loadTrack(identifier: string) {
    return this.#node?.client?.loadTrack(identifier)
  }

  setVolume(volume: number, limit?: number | undefined) {
    if (volume <= 0)
      volume = 0
    if (typeof limit === 'number' && volume >= limit)
      volume = limit
    return this.#setVolume(volume)
  }

  stopPlayer(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.playerIsUnavailable) {
        this.#node?.client?.stopPlayer(this.getPlayerID)
          .then((_) => {
            if (this.listenerCount('stop') != 0)
              this.emit('stop')
            resolve(true)
          })
          .catch((error) => reject(error))
        return
      }
      reject(Error('The Node is unavailable!'))
    })
  }

  pausePlayer(pause: boolean): Promise<boolean> {
    if (typeof pause != 'boolean') throw new Error('Player.pausePlayer(boolean): The argument must be a boolean');
    return this.#setPause(pause)
  }

  setEqualizer(equalizer: Equalizer): Promise<Equalizer> {
    return this.#setEqualizer(equalizer)
  }

  destroyPlayer(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.playerIsUnavailable) {
        this.#node?.client?.destroyPlayer(this.getPlayerID)
          .then((_) => {
            if (this.listenerCount('destroy') != 0)
              this.emit('destroy')
            resolve(true)
          })
          .catch((error) => reject(error))
        return
      }
      reject(Error('The Node is unavailable!'))
    })
  }


  playTrack(track: Track, options?: {
    startTime?: number | undefined
    endTime?: number | undefined
    noReplace?: boolean | undefined
  } | undefined): Promise<boolean> {

    if (track instanceof Track) {
      return new Promise((resolve, reject) => {
        if (!this.playerIsUnavailable) {
          this.#node?.client?.playTrack(
            this.#playerID,
            track,
            options && typeof options === 'object' ? options : undefined
          )
            .then((_) => resolve(true))
            .catch((error) => reject(error))
          return
        }

        reject(Error('The Node is unavailable!'))
      })
    } else throw new Error('Player.playTrack: [track] argument is an AudioTrack type.')
  }

  seek(position: number): Promise<number> {
    if (isNaN(position) || !isFinite(position))
      position = 0
    if (position < 0)
      position = 0
    if (position > (this.playingTrack?.info?.length ?? 0))
      position = (this.playingTrack?.info?.length ?? 0)
    if (this.#playingTrack) {
      this.#endTrack = Date.now() + ((this.#playingTrack.info.length ?? 0) - position)
    }

    return new Promise((resolve, reject) => {
      if (!this.playerIsUnavailable) {
        this.#node?.client?.seekPlayer(this.getPlayerID, position)
          .then((_) => {
            this.#awaitSyncSeek = true
            if (this.listenerCount('seek') != 0)
              this.emit('seek', position)
            resolve(position)
          })
          .catch((error) => reject(error))
        return
      }
      reject(Error('The Node is unavailable!'))
    })

  }

  connectVoice(
    channelID: string,
    options: {
      selfMute?: boolean;
      selfDeaf?: boolean
    } = {}): void {

    this.#channel?.connectVoice(this.getPlayerID, channelID, options)
  }

  reconnectVoice(): void {
    this.#channel?.reconnect(this.getPlayerID)
  }

  disconnectVoice(): void {
    this.#channel?.disconnectVoice(this.getPlayerID)
  }

  get state(): PlayerState {
    return {
      volume: this.volume,
      playingTrack: this.#playingTrack ?? null,
      paused: this.#paused,
      equalizer: this.#equalizer,
      filters: this.#filters,
      voiceInfo: this.voiceInfo,
      nodeID: this.#nodeID
    }
  }
}


