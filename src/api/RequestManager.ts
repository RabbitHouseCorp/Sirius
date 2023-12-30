import EventEmitter from 'events'
import { Track } from '../types/Track'
import { format } from '../utils'
import { Method, RequestLibrary, RequestLibraryOptions as RequestOptionsLibrary, Response } from './RequestLibrary'
import { RouteManager } from './RouteManager'
import { PlayerSession, PlayerUpdateData } from './impl/PlayerSession'
import { TrackResultBase } from './impl/TrackRest'
import { getVersion } from './lavalink/VersionHeader'


export interface RequestOptions {
  packageHttp: 'http' | 'axios'
  version: 2 | 3 | 4 | 'custom'
  routes: RouteManager
  password: string
}

export class RequestManager extends EventEmitter {
  #routes: RouteManager | null = null
  #requestLibrary: RequestLibrary | null = null
  #version: 2 | 3 | 4 | 'custom' | null | number | 'string' = null
  constructor(options: RequestOptions) {
    super()
    if (options) {
      if (options.version && (typeof options.version === 'number' || typeof options.version === 'string'))
        this.#version = options.version
      if (options.packageHttp && typeof options.packageHttp === 'string') {
        if (options.packageHttp === 'http' || options.packageHttp === 'axios') {
          this.#requestLibrary = new RequestLibrary(options.packageHttp, {
            password: (options.password && typeof options.password === 'string') ? options.password : ''
          })
          this.#requestLibrary
            .on('trace', (message) => {
              if (this.listenerCount('trace') != 0)
                this.emit('trace', (message))
            })
            .on('debug', (message) => {
              if (this.listenerCount('debug') != 0)
                this.emit('debug', (message))
            })
            .on('error', (err) => {
              if (this.listenerCount('error') != 0)
                this.emit('error', (err))
            })
        }
      } else
        throw new Error('RequestManager: [packageHttp] is a string type.')
      if (options.routes && options.routes instanceof Array)
        this.#routes = options.routes
      else
        throw new Error('RequestManager: [routes] is a Array<IRoute> type.')
      if (!options.password)
        throw new Error('RequestManager: Request manager requires password.')
      else if (typeof options.password != 'string')
        throw new Error('RequestManager: [password] is a string type.')
    }
  }

  checkEndpoint(endpoint: string): boolean {
    return this.#routes?.getRouteByName(endpoint) != null
  }

  async requestBase<H = any>(path: string, options?: RequestOptionsLibrary<H>): Promise<Response<H>> {
    return new Promise((resolve, reject) => {
      this.#requestLibrary?.request<H>(this.#routes?.getAPI + path, options)
        .then((res) => resolve(res))
        .catch((err) => reject(err))
    })
  }

  async destroyPlayer(sessionID: string, guildID: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      let route = this.#routes?.getRouteByName('getPlayer')
      if (route) {

        const path = route?.preparePath({
          path: {
            ...(typeof sessionID === 'string' ? { sessionId: sessionID } : { sessionId: '' }),
            players: '',
            ...(typeof guildID === 'string' ? { player: guildID } : { player: '' })
          },
          query: {}
        }, true, true)
        this.requestBase(path, { requiredAuth: true, method: Method.Delete })
          .then((request) => {
            request.flush(request.data)
            resolve(true)
          })
          .catch((error) => reject(error))
      }
    })
  }

  async playerUpdate(sessionID: string, guildID: string, update: PlayerSession, noReplace?: boolean): Promise<PlayerUpdateData> {
    return new Promise((resolve, reject) => {
      let route = this.#routes?.getRouteByName('getPlayer')
      let data: any | null = {}
      if (route) {
        if (update?.track instanceof Track) {

          if (this.#version == 3) {
            data = {
              ...data,
              // If the node is customized, the library must deliver these three fields
              ...(update.track.trackEncoded ? {
                encodedTrack: update.track.trackEncoded,
                identifier: update.track.info.identifier,
                track: update.track.trackEncoded,
                play: update.track.trackEncoded
              } : {}),
            }
          } else if (this.#version === 4) {
            data = {
              // If the node is customized, the library must deliver these three fields
              ...(update.track.trackEncoded ? {
                track: {
                  encoded: update.track.trackEncoded,
                  userData: update.track.userData
                }
              } : {}),
            }
          } else {
            data = {
              ...data,
              // If the node is customized, the library must deliver these three fields
              ...(update.track.trackEncoded ? {
                encodedTrack: update.track.trackEncoded,
                track: update.track.trackEncoded,
                play: update.track.trackEncoded
              } : {}),
            }
          }
        } else if (update.track === null) {
          if (this.#version === 4) {
            data = {
              ...data,
              track: {
                encodedTrack: null
              }
            }
          } else {
            data = {
              ...data,
              encodedTrack: null,
              track: null,
              play: null
            }
          }
        }

        if (typeof update.endTime === 'number') {
          if (!isFinite(update.endTime) || isNaN(update.endTime))
            return reject(Error('Value cannot be infinite or NaN'))
          data = {
            ...data,
            endTime: update.endTime,
          }
        }

        if (typeof update.position === 'number') {
          if (!isFinite(update.position) || isNaN(update.position))
            return reject(Error('Value cannot be infinite or NaN'))
          data = {
            ...data,
            position: update.position,
          }
        }

        if (typeof update.paused === 'boolean') {
          data = {
            ...data,
            paused: update.paused,
          }
        } else if (typeof update.pause === 'boolean') {
          data = {
            ...data,
            paused: update.pause,
          }
        }

        if (typeof update.volume === 'number') {
          if (!isFinite(update.volume) || isNaN(update.volume))
            return reject(Error('Value cannot be infinite or NaN'))
          if (update.volume < 0)
            update.volume = 0
          data = {
            ...data,
            volume: typeof update.volume === 'number' ? update.volume : 100
          }
        }

        if (typeof update.identifier === 'string') {
          data.identifier = update.identifier
        }

        if (typeof update.voice === 'object') {
          if (update.voice.endpoint && typeof update.voice.endpoint === 'string') {
            data = {
              ...data,
              voice: {
                ...(data?.voice ?? {}),
                endpoint: update.voice.endpoint
              }
            }
          } else {
            return reject(Error('The voice object needs the field [endpoint]'))
          }

          if (update.voice.sessionId && typeof update.voice.sessionId === 'string') {
            data = {
              ...data,
              voice: {
                ...(data?.voice ?? {}),
                sessionId: update.voice.sessionId
              }
            }
          } else
            return reject(Error('The voice object needs the field [sessionId]'))

          if (update.voice.token && typeof update.voice.token === 'string') {
            data = {
              ...data,
              voice: {
                ...(data?.voice ?? {}),
                token: update.voice.token
              }
            }
          } else
            return reject(Error('The voice object needs the field [token]'))
        }

        if (typeof update.filters === 'object') {
          data.filters = update.filters
        }


        const path = route?.preparePath({
          path: {
            ...(typeof sessionID === 'string' ? { sessionId: sessionID } : { sessionId: '' }),
            players: '',
            ...(typeof guildID === 'string' ? { player: guildID } : { player: '' })
          },
          query: {
            ...(typeof noReplace === 'boolean' ? { noReplace } : {})
          }
        }, true, true)
        this.requestBase(path, { requiredAuth: true, json: data, method: Method.Patch })
          .then((response) => {
            if (response.headers['content-type'] === 'application/json') {
              const json = response.parse()
              if (response.status < 200 || response.status > 201) {
                response.flush(response.data)
                return reject(Error('Something happened when updating the player', {
                  cause: json
                }))
              }
              response.flush(response.data)
              resolve(new PlayerUpdateData(guildID, sessionID, json))
            }

          })
          .catch((error) => reject(error))
        route = null, data = null
      }
    })
  }

  async loadTrack<A = any, B = any, C = any>(identifier: string = ''): Promise<TrackResultBase<A, B, C>> {
    return new Promise((resolve, reject) => {
      let route = this.#routes?.getRouteByName('loadTracks')
      if (route) {
        let identifierObj = route?.path?.identifier ? { path: { identifier } } :
          route?.query?.identifier ? { query: { identifier } } : null
        let trackObj = route?.path?.track ? { path: { track: identifier } } :
          route?.query?.track ? { query: { track: identifier } } : null
        let encodedTrackObj = route?.path?.encodedTrack ? { path: { encodedTrack: identifier } } :
          route?.query?.encodedTrack ? { query: { encodedTrack: identifier } } : null
        let track = identifierObj ?? trackObj ?? encodedTrackObj ?? null

        this.requestBase(route?.preparePath({ ...(track ?? {}) }, true, true), {
          requiredAuth: route?.requiredAuth ?? false,
          headers: {
            ...(route.headers as any)
          }
        }).then((response) => {
          let data = {}
          if (response.headers['content-type'] === 'application/json') {
            data = response.parse()
          }
          if (response.status < 200 || response.status > 201)
            reject(Error('Status code is not acceptable for track loader.', { cause: data }))
          if (response.data.length != 0)
            resolve(new TrackResultBase(response.parse()))
          response.flush(response.data)
        }).catch((err) => reject(err))

        identifierObj = null,
          trackObj = null,
          encodedTrackObj = null,
          track = null,
          route = null
      } else {
        reject(Error(`The version (${this.#version}) is not supportable or route is not registered.`))
      }
    })
  }

  async getVersion(): Promise<string | number> {
    return new Promise((resolve, reject) => {
      let route = this.#routes?.getRouteByName('version')
      if (route) {
        this.requestBase(route?.preparePath({}, true, true), {
          requiredAuth: route?.requiredAuth ?? false,
          headers: {
            ...(route.headers as any)
          }
        }).then((response) => {
          response.flush(response.data)
          resolve(getVersion(response.headers))
        }).catch((err) => reject(err))
      } else {
        reject(Error(`The version (${this.#version}) is not supportable or route is not registered.`))
      }
    })
  }

  destroy() {
    if (this.listenerCount('trace') != 0) {
      this.emit('trace', format('Destroying the request manager'))
    }
    this.#requestLibrary?.removeAllListeners()
    this.removeAllListeners()
    this.#routes?.splice(0, this.#routes.length)
    this.#routes = null
    this.#requestLibrary = null
  }
}
