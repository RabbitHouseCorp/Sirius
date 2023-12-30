import { AxiosInstance, create } from 'axios'
import { ClientRequest } from 'http'
import { EventEmitter } from 'node:events'
import { request as requestHttp } from 'node:http'
import { request as requestHttps } from 'node:https'
import { formatTime } from '../lib/time'
import { format } from '../utils'

export type RequestLibraryOptions<T> = {
  method?: Method
  requiredAuth?: boolean
  flush?: boolean
  contentType?: string
  headers?: {
    [key: string]: string
  }
  body?: string | number[] | object | Buffer | null
  json?: T | null
}

export type Response<H = any> = {
  headers: {} & H
  data: Buffer
  status: number
  auth?: boolean
  parse<T>(): T
  flush(buffer?: Buffer): void
}
export type Methods =
  | 'get'
  | 'delete'
  | 'head'
  | 'options'
  | 'post'
  | 'put'
  | 'patch'
  | 'purge'
  | 'link'
  | 'unlink'

export enum Method {
  Get,
  Delete,
  Head,
  Options,
  Post,
  Put,
  Patch,
  Purge,
  Link,
  Unlink
}

class MethodType {
  static from(method: Method): Methods {
    if (method === Method.Get)
      return 'get'
    else if (method === Method.Delete)
      return 'delete'
    else if (method === Method.Head)
      return 'head'
    else if (method === Method.Options)
      return 'options'
    else if (method === Method.Post)
      return 'post'
    else if (method === Method.Put)
      return 'put'
    else if (method === Method.Patch)
      return 'patch'
    else if (method === Method.Purge)
      return 'purge'
    else if (method === Method.Link)
      return 'link'
    else if (method === Method.Unlink)
      return 'unlink'
    else
      return 'get'
  }
}


/**
 * Using Axios mode, the {@link RequestLibrary} may not have 100% Buffer control to fill bytes
 * at value 0 in the buffer or change the data directly to null.
 * 
 * There may be a considerable amount of memory consumption.
 * While using the native NodeJS library, memory usage is more balanced.
 */
export class RequestLibrary extends EventEmitter {
  #library: 'http' | 'axios' = 'http'
  #password: string = ''
  constructor(library: 'http' | 'axios', options: {
    password: string
  }) {
    super()
    if (library && typeof library === 'string')
      if (library === 'http' || library === 'axios')
        this.#library = library
      else
        throw new Error(`RequestLibrary: Library name is invalid: "${library}"`)
    if (options?.password && typeof options.password === 'string')
      this.#password = options.password
    Object.seal(this)
    if (this.#listenerCountTrace != 0) {
      this.emit('trace', format('[RequestManager] Request manager successfully initialized and using: {}', this.#library))
    }
  }

  #axios: AxiosInstance = create()

  get #listenerCountTrace(): number {
    return this.listenerCount('trace')
  }

  get #listenerCountDebug(): number {
    return this.listenerCount('debug')
  }

  get #listenerCountError(): number {
    return this.listenerCount('error')
  }

  async #requestAxios<H = any>(url: string, options: RequestLibraryOptions<H> = {
    method: Method.Get
  }): Promise<Response> {
    return new Promise((resolve, reject) => {
      if (this.#listenerCountTrace != 0) {
        this.emit('trace',
          format('[RequestManager] Requesting for {} with method {}', url, MethodType.from(options.method ?? Method.Get).toLocaleUpperCase()))
      }
      this.#axios.request({
        method: MethodType.from(options.method ?? Method.Get),
        headers: {
          ...(typeof options?.headers === 'object' ? options?.headers : {}),
          Authorization: typeof this.#password === 'string' ? this.#password : null
        },
        data: options.body instanceof Buffer ? options.body : undefined
      })
        .then((http) => {
          if (options?.body && options.body instanceof Buffer) {
            this.emit('debug',
              format('[RequestManager] Flushing {} bytes from the request.', options.body.length))
            options.body.fill(0)
          } else if (options?.body) {
            this.emit('debug', '[RequestManager] Flushing the response data')
            options.body = null
          }
          resolve({
            headers: {
              ...(http.headers)
            },
            status: http.status,
            data: http.data,
            parse: <T>() => {
              return typeof http.data === 'object' ? http.data :
                http.data instanceof Buffer ? ((): T => {
                  try {
                    return JSON.parse((http.data as unknown as string | null) ?? '') as T
                  } catch (_) {
                    return {} as T
                  }
                })() : {}
            },
            flush: (buffer) => {
              if (http.data instanceof Buffer) {
                if (this.#listenerCountDebug != 0) {
                  this.emit('debug',
                    format('Freeing {} bytes from the response.', http.data.length))
                }
                // Changing the data field with a null value
                // appears that the GC is not capturing this
                // `Buffer` value to be removed from memory.
                // 
                // Even using `delete http.data` has no effect.

                http.data.fill(0)
              } else if (http.data) {
                if (this.#listenerCountDebug != 0)
                  this.emit('debug', 'Flushing the response data')
                // Here, GC can capture the value and be removed,
                // but the value stays in memory for longer
                http.data = null
              }
              if (buffer && (buffer instanceof Buffer && buffer.length > 0))
                buffer.fill(0)
            },
          })
        })
        .catch((err) => {
          reject(err)
        })
    })
  }


  #https<H = any>(url: string | URL, options: RequestLibraryOptions<H> = {
    method: Method.Get
  }): Promise<Response> {
    return new Promise((resolve, reject) => {
      const timeRequest = performance.now()
      let https: ClientRequest | null = requestHttps(url, {
        method: MethodType.from(options.method ?? Method.Get),
        headers: {
          ...(typeof options?.headers === 'object' ? options?.headers : {}),
          Authorization: typeof this.#password === 'string' ? this.#password : ''
        }
      }, (res) => {
        let buf: number[] | null = []
        let bufData: Buffer | null = null
        let time = performance.now()
        res.on('data', (buffer) => {
          if (buffer instanceof Buffer) {
            this.emit('trace',
              format("[RequestLibrary: http-node] {} bytes received. ({})", buffer.length,
                (performance.now() - time) < 0 ? 'no-time' : formatTime(performance.now() - time)))
            buf?.push(...buffer)
            buffer.fill(0)
            time = performance.now()
          }
        })
        res.on('end', () => {
          if (this.#listenerCountTrace != 0) {
            this.emit('trace',
              format("[RequestLibrary: http-node] Request {} ended with {}", url,
                (performance.now() - timeRequest) < 0 ? 'no-time' : formatTime(performance.now() - timeRequest)))
          }

          /// Remove all listeners to free up resources.
          res.removeAllListeners()
          res.socket.removeAllListeners()
          if (https) {
            https?.removeAllListeners()
            https?.flushHeaders()
          }
          if (https?.socket) {
            https.socket.removeAllListeners()
          }

          resolve({
            headers: {
              ...(res.headers),
              Authorization: typeof this.#password === 'string' ? this.#password : null
            },
            status: res.statusCode ?? -1,
            data: bufData = Buffer.from(buf ?? []),
            parse: <T>() => {
              if (bufData?.length === 0)
                throw new Error('JSON/RequestManager: It appears that the buffer is empty and therefore cannot be analyzed.')

              try {
                return JSON.parse((bufData as string | null) ?? '') as T
              } catch (_) {
                return null as T
              }
            },
            flush: (buffer) => {
              if (this.#listenerCountDebug) {
                this.emit('debug',
                  format('[RequestLibrary: http-node] Freeing {} bytes from the response.', buf?.length ?? 0))
              }
              if (buffer && (buffer instanceof Buffer && buffer.length > 0))
                buffer.fill(0)
              buf?.splice(0, buf.length)
              if (buf?.length != 0) {
                bufData?.fill(0)
                bufData = null, buf = null, https = null
              }
            },
          })
        })

      })
      https.on('error', (err) => {
        if (err && this.#listenerCountError != 0)
          this.emit('error', (err))
        reject(err)
      })
      if (options.body && options.body instanceof Buffer) {
        https.write(options.body)
        options.body.fill(0)
        options.body = null
      } else if (options.body && typeof options.body === 'string') {
        https.write(options.body)
        options.body = null
      }
      if (options.json && typeof options.json === 'object') {
        https.write(JSON.stringify(options.json))
        options.body = null,
          options.json = null
      }


      https.end()
    })
  }

  #http<H = any>(url: string | URL, options: RequestLibraryOptions<H> = {
    method: Method.Get
  }): Promise<Response> {
    return new Promise((resolve, reject) => {
      let timeRequest = performance.now()
      if (this.#listenerCountDebug != 0) {
        this.emit('debug',
          format("[RequestManager] Requesting for {} with method {}", url, MethodType.from(options.method ?? Method.Get).toLocaleUpperCase()))
      }
      let req: ClientRequest | null = requestHttp(url, {
        method: MethodType.from(options.method ?? Method.Get),
        headers: {
          'content-type': 'application/json',
          ...(typeof options?.headers === 'object' ? options?.headers : {}),
          Authorization: typeof this.#password === 'string' ? this.#password : ''
        }
      }, (res) => {
        let buf: number[] | null = []
        let bufData: Buffer | null = null
        let time = performance.now()
        res.on('data', (buffer) => {
          if (buffer instanceof Buffer) {
            this.emit('trace',
              format("[RequestLibrary: http-node] {} bytes received. ({})", buffer.length,
                (performance.now() - time) < 0 ? 'no-time' : formatTime(performance.now() - time)))
            buf?.push(...buffer)
            buffer.fill(0)
            time = performance.now()
          }
        })
        res.on('end', () => {
          if (this.#listenerCountTrace != 0) {
            this.emit('trace',
              format("[RequestLibrary: http-node]  {} ended with {}", url,
                (performance.now() - timeRequest) < 0 ? 'no-time' : formatTime(performance.now() - timeRequest)))
          }
          /// Remove all listeners to free up resources.
          res.removeAllListeners()
          res.socket.removeAllListeners()
          if (req) {
            req?.removeAllListeners()
            req?.flushHeaders()
          }
          if (req?.socket) {
            req.socket.removeAllListeners()
          }

          resolve({
            headers: {
              ...(res.headers)
            },
            status: res.statusCode ?? -1,
            data: bufData = Buffer.from(buf ?? []),
            parse: <T>() => {
              if (bufData?.length === 0)
                throw new Error('JSON/RequestLibrary: http-node: It appears that the buffer is empty and therefore cannot be analyzed.')

              try {
                return JSON.parse((bufData as string | null) ?? '') as T
              } catch (_) {
                return null as T
              }
            },
            flush: (buffer) => {
              if (this.#listenerCountDebug) {
                this.emit('debug',
                  format('[RequestLibrary: http-node] Freeing {} bytes from the response.', buf?.length ?? 0))
              }
              if (buffer && (buffer instanceof Buffer && buffer.length > 0))
                buffer.fill(0)
              buf?.splice(0, buf.length)
              if (buf?.length != 0) {
                bufData?.fill(0)
                bufData = null, buf = null, req = null
              }
            },
          })
        })

      })
      req.on('error', (err) => {
        if (err && this.#listenerCountDebug != 0)
          this.emit('error', (err))
        reject(err)
      })

      if (options.body && options.body instanceof Buffer) {
        options.body.fill(0)
        options.body = null
      } else if (options.body && typeof options.body === 'string') {
        req.write(options.body)
        options.body = null
      }
      if (options.json && typeof options.json === 'object') {
        req.write(JSON.stringify(options.json))
        options.body = null,
          options.json = null
      }

      req.on('socket', (socket) => {
        socket.on('connect', () => timeRequest = performance.now())
      })
      req.end()
    })
  }

  #requestNode<H = any>(url: string, options: RequestLibraryOptions<H> = {
    method: Method.Get
  }): Promise<Response> {
    return new Promise((resolve, reject) => {
      let _url = new URL(url)
      if (_url.protocol.startsWith('https'))
        this.#https(_url, options)
          .then((res) => resolve(res))
          .catch((err) => reject(err))
      else if (_url.protocol.startsWith('http'))
        this.#http(_url, options)
          .then((res) => resolve(res))
          .catch((err) => reject(err))
    })
  }

  request<H = any>(url: string | URL, options: RequestLibraryOptions<H> = {
    method: Method.Get
  }): Promise<Response<H>> {
    return new Promise((resolve, reject) => {
      if (this.#library === 'http')
        this.#requestNode<H>(url.toString(), options)
          .then((res) => resolve(res))
          .catch((err) => reject(err))
      else if (this.#library === 'axios')
        this.#requestAxios<H>(url.toString(), options)
          .then((res) => resolve(res))
          .catch((err) => reject(err))
    })
  }
}