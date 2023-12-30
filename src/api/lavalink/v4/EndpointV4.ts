import { PreparePathOptions, RouteManager, RouteOptions } from '../../RouteManager'
import { EndpointInterface } from '../EndpointInterface'


export class EndpointV4 extends RouteManager implements EndpointInterface {
  constructor(options: RouteOptions) {
    super(options)
    this.addRoute('/loadtracks', {
      name: 'loadTracks',
      requiredAuth: true,
      query: {
        identifier: 'string'
      },
    })
    this.addRoute('/decodeTrack', {
      name: 'decodeTrack',
      requiredAuth: true,
      query: {
        encodedTrack: 'string'
      },
    })
    this.addRoute('/version', {
      name: 'version'
    })

    this.addRoute('/sessions', {
      name: 'getPlayers',
      contentType: 'application/json',
      requiredAuth: true,
      path: {
        sessionId: 'string',
        players: 'pathEnd'
      }
    })
    this.addRoute('/sessions', {
      name: 'getPlayer',
      contentType: 'application/json',
      requiredAuth: true,
      path: {
        sessionId: 'string',
        players: 'pathEnd',
        player: 'string'
      },
      query: {
        noReplace: 'boolean'
      }
    })
    this.addRoute('/sessions', {
      name: 'updateSession',
      contentType: 'application/json',
      requiredAuth: true,
      path: {
        sessionId: 'string'
      }
    })
    this.addRoute('/stats', { name: 'stats' })
    this.addRoute('/plugins', { name: 'plugins' })
    this.addRoute('/info', { name: 'info' })
    this.addRoute('/routeplannerStatus', { name: 'routeplannerStatus' })
  }
  getPlayers(options: PreparePathOptions): string | null {
    const route = this.getRouteByName('getPlayers')
    return route!!.preparePath(options ?? {})
  }

  stats(options: PreparePathOptions): string | null {
    const route = this.getRouteByName('stats')
    return route!!.preparePath(options ?? {})
  }

  plugins(options: PreparePathOptions): string | null {
    const route = this.getRouteByName('plugins')
    return route!!.preparePath(options ?? {})
  }

  routeplannerStatus(options: PreparePathOptions): string | null {
    const route = this.getRouteByName('routeplannerStatus')
    return route!!.preparePath(options ?? {})
  }

  version(options: PreparePathOptions): string | null {
    const route = this.getRouteByName('version')
    return route!!.preparePath(options ?? {})
  }

  info(options: PreparePathOptions): string | null {
    const route = this.getRouteByName('info')
    return route!!.preparePath(options ?? {})
  }

  updateSession(options: PreparePathOptions): string | null {
    const route = this.getRouteByName('updateSession')
    return route!!.preparePath(options ?? {})
  }

  loadTrack(options: PreparePathOptions): string {
    const route = this.getRouteByName('loadTracks')
    return route!!.preparePath(options ?? {})
  }

  getPlayer(options: PreparePathOptions): string {
    const route = this.getRouteByName('getPlayer')
    return route!!.preparePath(options ?? {})
  }

  decodetrack(options: PreparePathOptions): string {
    const route = this.getRouteByName('decodeTrack')
    return route!!.preparePath(options ?? {})
  }

  decodetracks(options: PreparePathOptions): string {
    const route = this.getRouteByName('decodeTracks')
    return route!!.preparePath(options ?? {})
  }

}