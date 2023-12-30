import { parse } from 'node:url'
import { format } from '../utils'
export type ContentType = 'application/json' |
{
  name: 'application/json' | 'none'
  maxLength?: number
  clearBuffer?: boolean
} | ('application/json')[]

export interface PreparePathOptions {
  path?: { [key: string]: string | boolean | number | null }
  query?: { [key: string]: string | boolean | number | null }
}

export interface RouteOptions {
  secure?: boolean
  host: string
  port?: number | null
  version?: string | number | null
}

export interface RouteRegisterOptions<T = any> {
  name?: string | null
  headers?: { [key: string]: RouteHeader }
  query?: { [key: string]: 'boolean' | 'number' | 'string' | 'json' }
  path?: { [key: string]: 'boolean' | 'number' | 'string' | 'json' | 'pathEnd' }
  metadata?: T | null
  requiredAuth?: boolean
  contentType?: ContentType | null
}

export interface RouteHeader {
  type: any,
  required?: boolean
}

export interface IRoute<T = any> {
  name?: string | null
  route: string
  headers?: { [key: string]: RouteHeader }
  query?: { [key: string]: 'boolean' | 'number' | 'string' | 'json' }
  metadata?: T | null
  path?: { [key: string]: 'boolean' | 'number' | 'string' | 'json' | 'pathEnd' }
  requiredAuth?: boolean
  contentType?: ContentType[]

  preparePath(options: PreparePathOptions, withoutDomain?: boolean, withoutPath?: boolean): string
}

export class RouteManager extends Array<IRoute> {
  #options: RouteOptions = {
    host: '',
    version: null,
  }


  constructor(options?: RouteOptions) {
    super()
    if (options && typeof options === 'object') {
      this.#options = {
        host: (options.host && typeof options.host === 'string') ? options.host :
          (() => { throw new Error('RouterManager: [options.host]: You must inform the host to use route manager.') })(),
        port: (options.port && typeof options.port === 'number') ? options.port : null,
        secure: (options.secure && typeof options.secure === 'string') ? options.secure : false,
        version: (options.version && (
          typeof options.version === 'string' ||
          typeof options.version === 'number')) ? options.version : null,
      }
    } else {
      throw new Error('RouterManager: [options] Route Manager needs options.')
    }
  }

  get #getProtocol(): string {
    return this.#options.secure ? 'https://' : 'http://'
  }

  get #getPort(): string {
    return this.#options.port ? `:${this.#options.port}` : ''
  }

  get #getVersionPath(): string {
    if (this.#options.version && typeof this.#options.version === 'number')
      return '/' + 'v' + this.#options.version
    else if (this.#options.version && typeof this.#options.version === 'string')
      if (this.#options.version.startsWith('/') ||
        this.#options.version.endsWith('/'))
        throw new Error(`Do not put "/" in the version: "${this.#options.version}"`)
      else
        return '/' + this.#options.version
    return ''
  }

  get #getPath(): string {
    return this.#getVersionPath
  }

  get #getBaseURL(): string {
    return this.#getProtocol + this.#options.host + this.#getPort + this.#getVersionPath
  }

  get getAPI(): string {
    return this.#getBaseURL
  }

  addRoute<T = any>(
    path: string,
    options?: RouteRegisterOptions<T>
  ): number {
    return this.push({
      name: (options?.name && typeof options?.name === 'string') ? options.name : null,
      headers: (options?.headers && typeof options?.headers === 'object') ? { ...(options.headers) } : {},
      contentType: (options?.contentType && Array.isArray(options?.contentType)) ? [...(options.contentType)] : [],
      query: (options?.query && typeof options.query === 'object') ? options.query : {},
      path: (options?.path && typeof options.path === 'object') ? options.path : {},
      requiredAuth: (options?.requiredAuth && typeof options.requiredAuth === 'boolean') ? options.requiredAuth : false,
      metadata: (options?.metadata &&
        (typeof options.metadata === 'object'
          || Array.isArray(options.metadata)
          || options.metadata instanceof Buffer)) ? options.metadata : null,
      route: format('/{}', path.replace(/\/$|^\//g, '')),
      preparePath: (opts, withoutDomain: boolean = false, withoutVersion: boolean = false) => {
        let _path = null, query = null
        if (opts?.path && options?.path != null)
          _path = Object
            .entries(opts.path ?? {})
            .filter(([key, _]) => !!((options?.path ?? {})[key]))
            .map(([key, value]) => (options?.path ?? {})[key] === 'pathEnd' ? [key, key] : [key, value])
            .filter(([key, value]) => this.#resolveType(value) === ((options?.path ?? {})[typeof key === 'string' ? key : ''] ?? null)
              || (options?.path ?? {})[typeof key === 'string' ? key : ''] === 'pathEnd')
            .map(([_, value]) => parse(typeof value === 'string' ? value : '')?.path ?? null)
            .filter((query) => query != null) as string[]
        if (opts?.query && options?.query)
          query = Object
            .entries(opts.query ?? {})
            .filter(([key, _]) => !!((options?.query ?? {})[key]))
            .filter(([key, value]) => this.#resolveType(value) === ((options?.query ?? {})[key] ?? null))
            .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value ?? ''))
            .filter((query) => query != null) as string[]

        return ((withoutDomain && typeof withoutDomain === 'boolean') && withoutDomain === true ? (withoutVersion === false ? this.#getPath : '')
          : this.getAPI) + path
          + ((_path != null && _path.length > 0) ? '/' + _path.join('/') : '')
          + ((query != null && query.length > 0 ? '?' + query.join('&') : ''))
      },
    })
  }

  #resolveType(type: any): 'string' | 'number' | 'boolean' | 'buffer' | 'json' | null {
    if (typeof type === 'number')
      return 'number'
    else if (typeof type === 'string')
      return 'string'
    else if (typeof type === 'object')
      return 'json'
    else if (type instanceof Buffer)
      return 'buffer'
    else if (typeof type === 'boolean')
      return 'boolean'
    else
      return null
  }

  getRoute<T = any>(
    path: string
  ): IRoute<T> | null {
    return this.find((route) => route.route === path) ?? null
  }

  getRouteByName<T = any>(name: string): IRoute<T> | null {
    if (typeof name != 'string')
      name = ''
    return this
      .find((route: IRoute<T>) =>
        (route.name && typeof route.name === 'string') ? route.name === name : false) ?? null
  }

  removeRoute(path: string) {
    this.splice(this.findIndex((route) => route?.route === path || route?.name === path), 1)
  }


}