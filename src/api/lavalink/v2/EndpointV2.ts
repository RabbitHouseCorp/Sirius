import { PreparePathOptions, RouteManager, RouteOptions } from '../../RouteManager'
import { EndpointInterface } from '../EndpointInterface'

export class EndpointV2 extends RouteManager implements EndpointInterface {
  constructor(options: RouteOptions) {
    super(options)
    this.addRoute('/loadtracks', {
      name: 'loadTracks',
      query: {
        identifier: 'string'
      },
    })
    this.addRoute('/decodeTrack', {
      name: 'loadTracks',
      query: {
        encodedTrack: 'string'
      },
    })

    this.addRoute('/decodeTracks', {
      name: 'loadTracks',
      contentType: 'application/json'
    })
  }
  getPlayers(_: PreparePathOptions): string | null {
    throw new Error('Endpoint not supported for this version: \'/sessions/:sessionId/players\'')
  }

  stats(_: PreparePathOptions): string | null {
    throw new Error('Endpoint not supported for this version: \'/stats\'')
  }

  plugins(_: PreparePathOptions): string | null {
    throw new Error('Endpoint not supported for this version: \'/plugins\'')
  }

  routeplannerStatus(_: PreparePathOptions): string | null {
    throw new Error('Endpoint not supported for this version: \'/routeplanner/status\'')
  }

  version(_: PreparePathOptions): string | null {
    throw new Error('Endpoint not supported for this version: \'/version\'')
  }

  info(_: PreparePathOptions): string | null {
    throw new Error('Endpoint not supported for this version: \'/info\'')
  }

  updateSession(_: PreparePathOptions): string | null{
    throw new Error('Endpoint not supported for this version: \'/session/:sessionId\'')
  }

  loadTrack(options: PreparePathOptions): string  {
    const route = this.getRouteByName('loadTracks')
    return route!!.preparePath(options ?? {})
  }

  getPlayer(_: PreparePathOptions): string {
    throw new Error('Endpoint not supported for this version: \'/session/:sessionId/:guildId\'')
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