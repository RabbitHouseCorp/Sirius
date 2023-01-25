import axios, { AxiosResponse, RawAxiosRequestConfig } from 'axios'
import EventEmitter from 'events'
import {
  ConfigLavalink,
  validateConfig
} from './config'
import {
  TrackInfoDecode,
  TrackSearch
} from './types'
import {
  LoadType,
  TypeInfoLavalink,
  TypePlayerRest,
  TypePlayersRest,
  TypeRequestUpdatePlayer,
  TypeStatsLavalink
} from './typesRest'
import { clientLibrary } from './utils'


const prefixSearch = (str: string) => {
  // Auto Search
  if (typeof str === 'undefined' && str == null) {
    return ''
  } else if (str === '') {
    return ''
  }
  if (str === TrackSearch.ytsearch) {
    return TrackSearch.ytsearch
  } else if (str === TrackSearch.ytmsearch) {
    return TrackSearch.ytmsearch
  } else if (str === TrackSearch.scsearch) {
    return TrackSearch.scsearch
  } else {
    if (!str.endsWith(':')) {
      str = str + ':'
    }
    if (!str.startsWith(':')) {
      str = str.substring(1, str.length - 1)
    }

    const prefix = str
      .replace(/^([A-Za-z0-9]+:)$|(:)(.+)/g, ':')
      .replace(/.+ :/g, (s) => s.replace(/\s+/, ''))

    return prefix
  }

  return str
}
export interface Data<T> {
  data: T | null
  error: any | null
  found: boolean
}



const defineData = <T>(options = { data: null, error: null, found: false } as Data<T>) => ({
  ...options
})
export interface UpdateSessionRequest {
  resumingKey?: string | null
  timeout?: number
}

export interface UpdateSessionResponse {
  resumingKey: string | null
  timeout: number
}

export interface IOptionsPlayerWithReplace {
  sessionId: string
  guildId: string
  noReplace?: boolean
}

export interface IOptionsPlayer {
  sessionId: string
  guildId: string
}

export class LavalinkRest extends EventEmitter {
  config!: ConfigLavalink
  library: string

  constructor(config: ConfigLavalink) {
    super()
    this.library = ''
    if (validateConfig(config)) {
      this.config = config
    }
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
    const protocol = this.config.auth.secure ? 'https://' : 'http://'
    const prefixVersion = `/${this.getVersionApi}/`
    const port = `:${this.config.auth.port}`
    return protocol + this.config.auth.ip + port + prefixVersion
  }

  private get path() {
    const prefixVersion = `/${this.getVersionApi}/`
    return prefixVersion
  }
  async request<T>(path: string, configAxios?: RawAxiosRequestConfig, notFound?: boolean): Promise<AxiosResponse<T, any>> {
    if (typeof path !== 'string') throw new Error(`It needs to be a string. This path that you inserted in the LavalinkRest.request(path: string) method is a ${typeof path}.`)
    return new Promise(async (resolve, reject) => {
      const axiosConfig = (typeof configAxios === 'object' && !Array.isArray(configAxios)) ? configAxios : {}
      if (this?.config?.rest?.timeout !== undefined) {
        axiosConfig.timeout = this.config.rest.timeout
      }

      axios({
        url: this.baseUrl + path,
        headers: {
          'Authorization': this?.config?.auth?.authorization,
          'User-Id': this?.config?.auth['user-id'],
          'Client-Name': this.getLibrary
        },
        validateStatus(status) {
          if (notFound !== undefined && notFound !== null) {
            if (notFound == true) {
              return status >= 200 && status != 404
            }
          }
          return status >= 200
        },
        ...axiosConfig
      }).then((res) => {

        this.emit('debugRequest', (res, { path, configAxios, notFound }))
        if (res.status == 403) throw new Error(`Status Code 403: Not authorized. Check the password you entered to access API.`);

        if (res.status > 201 && (notFound === undefined && notFound)) {
          let metadata: string = ''
          // To ensure data security, it is important for Lavalink to run eval and return an error in the string and not expose IP or Port or Password.
          const replaceToRegex = (text: string | number) => {
            return `${text}`.replace(/\.|\[|\]|\{|\}|\(|\)\$\^/g, (replace) => `\\${replace}`)
          }
          const hideSenstiveData = RegExp(`${replaceToRegex(this.config.auth.ip)}|${replaceToRegex(this.config.auth.port)}|${replaceToRegex(this.config.auth.authorization)}`, 'g')

          if (typeof res.data === 'string') {
            if (res.data.length >= 10) { // If the metadata contains more than that, we can show you what's going on.
              metadata = `\n\nMetadata Error ${res.data.length}: ${res.data}`.replace(hideSenstiveData, '[REDACTED]')
            }
          } else if (typeof res.data === 'object') {
            metadata = `\n\nMetadata Error:\n${JSON.stringify(res.data, undefined, 2)}`.replace(hideSenstiveData, '[REDACTED]')
          }
          this.emit('debug', (`Lavalink node returned an error with status code ${res.statusText} on endpoint ${`${this.path}/${path}`}.`))
          this.emit('requestError', (res.data, res, null))
          return reject(new Error(`Status Code Invalid: [${res.status}]${metadata}`))
        }
        this.emit('debug', (`Lavalink Node returned with status code: ${res.statusText} and at endpoint ${`${this.path}/${path}`}`))
        resolve(res)
      })
        .catch((error) => {
          this.emit('requestError', (null, null, error))
          reject(error)
        })
    })
  }

  /**
* @link https://github.com/freyacodes/Lavalink/blob/master/IMPLEMENTATION.md#get-players
* @param sessionId
* @returns Returns a list of players in this specific session.
*/
  async getPlayers(sessionId: string): Promise<Data<TypePlayersRest>> {
    if (typeof sessionId !== 'string') throw new Error(`It needs to be a string. This path that you inserted in the LavalinkRest.getPlayers(sessionId: string) method is a ${typeof sessionId}.`)
    if (sessionId.length <= 5) {
      sessionId = '{sessionId}'
    }

    return new Promise(async (resolve, reject) => {
      this.request<TypePlayersRest>(`sessions/${sessionId}/players`, { method: 'get' }, true)
        .then((rest) => resolve(defineData({
          data: rest.status === 404 ? rest.data : null,
          error: rest.status === 404 ? null : rest.data,
          found: rest.status === 404
        })))
        .catch((err) => reject(err))
    })
  }

  /**
 * @link https://github.com/freyacodes/Lavalink/blob/master/IMPLEMENTATION.md#get-player
 * @param sessionId
 * @param guildId
 * @returns Returns the player for this guild in this session.
 */
  async getPlayer(sessionId: string, guildId: string): Promise<Data<TypePlayerRest>> {
    if (typeof sessionId !== 'string')
      throw new Error(`It needs to be a string. This path that you inserted in the LavalinkRest.getPlayer(sessionId: string, guildId: string) method is a ${typeof sessionId}.`)
    if (typeof guildId !== 'string')
      throw new Error(`It needs to be a string. This path that you inserted in the LavalinkRest.getPlayer(sessionId: string, guildId: string) method is a ${typeof guildId}.`)
    if (sessionId.length <= 5) {
      sessionId = '{sessionId}'
    }
    if (guildId.length <= 5) {
      guildId = '{guildId}'
    }
    return new Promise(async (resolve, reject) => {
      this.request<TypePlayerRest>(`sessions/${sessionId}/players/${guildId}`, { method: 'get' }, true)
        .then((rest) => resolve(defineData({
          data: rest.status === 404 ? rest.data : null,
          error: rest.status === 404 ? null : rest.data,
          found: rest.status === 404
        })))
        .catch((err) => reject(err))
    })
  }

  /**
   * Updates or creates the player for this guild if it doesn't already exist.
   * @link https://github.com/freyacodes/Lavalink/blob/master/IMPLEMENTATION.md#update-player
   * @param sessionId 
   * @param guildId 
   * @param options 
   * @returns 
   */
  async updatePlayer(optionsPlayer: IOptionsPlayerWithReplace, options: TypeRequestUpdatePlayer): Promise<Data<TypePlayerRest>> {
    if (optionsPlayer == null && optionsPlayer == undefined)
      throw new Error('LavalinkRest.updatePlayer(optionsPlayer: IOptionsPlayerWithReplace, options: TypeRequestUpdatePlayer): You didn\'t inform the OptionsPlayer parameter.')
    if (typeof optionsPlayer?.guildId !== 'string')
      throw new Error(`It needs to be a string. This path that you inserted in the LavalinkRest.updatePlayer(optionsPlayer: IOptionsPlayerWithReplace, options: TypeRequestUpdatePlayer) method is a ${typeof optionsPlayer?.sessionId}.`)
    if (typeof optionsPlayer?.sessionId !== 'string')
      throw new Error(`It needs to be a string. This path that you inserted in the LavalinkRest.updatePlayer(optionsPlayer: IOptionsPlayerWithReplace, options: TypeRequestUpdatePlayer) method is a ${typeof optionsPlayer?.guildId}.`)
    if (typeof optionsPlayer?.noReplace !== 'boolean')
      throw new Error(`It needs to be a boolean. This path that you inserted in the LavalinkRest.updatePlayer(optionsPlayer: IOptionsPlayerWithReplace, options: TypeRequestUpdatePlayer) method is a ${typeof optionsPlayer?.noReplace}.`)
    if ((options !== undefined && options !== null) && typeof options !== 'object')
      throw new Error(`LavalinkRest.updatePlayer(optionsPlayer: IOptionsPlayerWithReplace, options: TypeRequestUpdatePlayer): You forgot or didn't return options in this function.`);
    if (optionsPlayer.sessionId.length <= 5) {
      optionsPlayer.sessionId = '{sessionId}'
    }
    if (optionsPlayer.guildId.length <= 5) {
      optionsPlayer.guildId = '{guildId}'
    }
    return new Promise(async (resolve, reject) => {
      this.request<TypePlayerRest>(`sessions/${optionsPlayer.sessionId}/player/${optionsPlayer.guildId}`, {
        method: 'patch',
        data: options,
        params: {
          noReplace: optionsPlayer.noReplace
        }
      }, true)
        .then((rest) => resolve(defineData({
          data: rest.status === 404 ? rest.data : null,
          error: rest.status === 404 ? null : rest.data,
          found: rest.status === 404
        })))
        .catch((err) => reject(err))
    })
  }

  /**
   * Destroys the player for this guild in this session.
   * @link https://github.com/freyacodes/Lavalink/blob/master/IMPLEMENTATION.md#destroy-player
   * @param optionsPlayer 
   * @returns 
   */
  destroyPlayer(optionsPlayer: IOptionsPlayer): Promise<any> {
    if (optionsPlayer == null && optionsPlayer == undefined)
      throw new Error('LavalinkRest.destroyPlayer(optionsPlayer: IOptionsPlayer, options: TypeRequestUpdatePlayer): You didn\'t inform the OptionsPlayer parameter.')
    if (typeof optionsPlayer?.guildId !== 'string')
      throw new Error(`It needs to be a string. This path that you inserted in the LavalinkRest.destroyPlayer(optionsPlayer: IOptionsPlayer, options: TypeRequestUpdatePlayer) method is a ${typeof optionsPlayer?.sessionId}.`)
    if (typeof optionsPlayer?.sessionId !== 'string')
      throw new Error(`It needs to be a string. This path that you inserted in the LavalinkRest.destroyPlayer(optionsPlayer: IOptionsPlayer, options: TypeRequestUpdatePlayer) method is a ${typeof optionsPlayer?.guildId}.`)
    if (optionsPlayer.sessionId.length <= 5) {
      optionsPlayer.sessionId = '{sessionId}'
    }
    if (optionsPlayer.guildId.length <= 5) {
      optionsPlayer.guildId = '{guildId}'
    }

    return new Promise(async (resolve, reject) => {
      this.request<TypePlayerRest>(`sessions/${optionsPlayer.sessionId}/player/${optionsPlayer.guildId}`, { method: 'delete' })
        .then((rest) => resolve(rest.data))
        .catch((err) => reject(err))
    })
  }

  /**
   * Updates the session with a resuming key and timeout.
   * @link https://github.com/freyacodes/Lavalink/blob/master/IMPLEMENTATION.md#update-session
   * @param sessionId 
   * @param options 
   * @returns 
   */
  updateSession(sessionId: string, options: UpdateSessionRequest): Promise<Data<UpdateSessionResponse>> {
    if (options == null && options == undefined)
      throw new Error('LavalinkRest.updateSession(sessionId: string, options: UpdateSessionRequest): You didn\'t inform the UpdateSessionRequest parameter.')
    if (typeof sessionId !== 'string')
      throw new Error(`It needs to be a string. This path that you inserted in the LavalinkRest.destroyPlayer(optionsPlayer: IOptionsPlayer, options: TypeRequestUpdatePlayer) method is a ${typeof sessionId}.`)
    if (sessionId.length <= 5) {
      sessionId = '{sessionId}'
    }

    return new Promise(async (resolve, reject) => {
      this.request<UpdateSessionResponse>(`sessions/${sessionId}`, { method: 'patch', data: options })
        .then((rest) => resolve(defineData({
          data: rest.status === 404 ? rest.data : null,
          error: rest.status === 404 ? null : rest.data,
          found: rest.status === 404
        })))
        .catch((err) => reject(err))
    })
  }

  /**
   * This endpoint is used to resolve audio tracks for use with the Update Player endpoint.
   * @param trackSearch TrackSearch
   * @param search string
   * @returns 
   */
  loadTrack(trackSearch: TrackSearch, search: string): Promise<LoadType> {
    if (trackSearch == null && trackSearch == undefined)
      throw new Error('LavalinkRest.loadTrack(trackSearch: TrackSearch, search: string): You didn\'t inform the TrackSearch parameter.')
    const typeSearch = prefixSearch(trackSearch)
    if (search == null && search == undefined)
      throw new Error('LavalinkRest.loadTrack(trackSearch: TrackSearch, search: string): You didn\'t inform the string parameter.')
    if (typeof typeSearch !== 'string')
      throw new Error('LavalinkRest.loadTrack(trackSearch: TrackSearch, search: string): `trackSearch` parameter is a string.')
    if (typeof search !== 'string')
      throw new Error('LavalinkRest.loadTrack(trackSearch: TrackSearch, search: string): `search` parameter is a string.')

    const identifier = typeSearch + search

    return new Promise((resolve, reject) => {
      this.request<LoadType>('loadtracks', { method: 'get', params: { identifier } }, true)
        .then((rest) => resolve(rest.data))
        .catch((err) => reject(err))
    })
  }

  /**
   * Decode a single track into its info, where `BASE64` is the encoded base64 data.
   * @param encodedTrack string | Buffer
   * @returns 
   */
  decodeTrack(encodedTrack: string | Buffer): Promise<TrackInfoDecode> {
    if (encodedTrack == null && encodedTrack == undefined)
      throw new Error('LavalinkRest.decodeTrack(encodedTrack: string | Buffer): You didn\'t inform the encodedTrack parameter.')
    return new Promise((resolve, reject) => {
      this.request<TrackInfoDecode>('decodetrack', { method: 'get', params: { encodedTrack } })
        .then((rest) => resolve(rest.data))
        .catch((err) => reject(err))
    })
  }

  /**
   * Decodes multiple tracks into their info
   * @param encodedTracks string | Buffer
   * @returns 
   */
  decodeTracks(encodedTracks: string[] | Buffer[]): Promise<TrackInfoDecode[]> {
    if (encodedTracks == null && encodedTracks == undefined)
      throw new Error('LavalinkRest.decodeTracks(encodedTracks: string[] | Buffer[]): You didn\'t inform the encodedTracks parameter.')
    if (!Array.isArray(encodedTracks))
      throw new Error(`LavalinkRest.decodeTracks(encodedTracks: string[] | Buffer[]): You entered the wrong ${encodedTracks} parameter. You need to inform Array for this parameter.`)

    const tracks = encodedTracks.map((i) => i.toString('utf-8'))

    return new Promise((resolve, reject) => {
      this.request<TrackInfoDecode[]>('decodetracks', { method: 'post', data: tracks })
        .then((rest) => resolve(rest.data))
        .catch((err) => reject(err))
    })
  }

  /**
   * Request Lavalink information.
   * @link https://github.com/freyacodes/Lavalink/blob/master/IMPLEMENTATION.md#get-lavalink-info
   * @returns 
   */
  async getInfo(): Promise<TypeInfoLavalink> {
    return new Promise((resolve, reject) => {
      this.request<TypeInfoLavalink>('info', { method: 'get' })
        .then((rest) => resolve(rest.data))
        .catch((err) => reject(err))
    })
  }


  /**
   * Request Lavalink statistics.
   * @link https://github.com/freyacodes/Lavalink/blob/master/IMPLEMENTATION.md#get-lavalink-stats
   */
  async getStats(): Promise<TypeStatsLavalink> {
    return new Promise((resolve, reject) => {
      this.request<TypeStatsLavalink>('stats', { method: 'get' })
        .then((rest) => resolve(rest.data))
        .catch((err) => reject(err))
    })
  }
}