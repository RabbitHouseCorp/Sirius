import { LavalinkNode, LavalinkNodes } from './types'

export enum VersionAPI {
  V4 = 'v4',
  v3 = 'v3',
}

export interface LavalinkAuth {
  /**
   * Enable the use of HTTPS
   */
  secure?: boolean
  ip: string
  port: number | string
  authorization: string
  'user-id'?: string | number
}

export interface LavalinkRestOptions {
  /**
   * Add a timeout to requests.
   */
  timeout?: number
  /**
   * Emit error through EventEmitter
   */
  emitError?: boolean
  /**
   * Add value of attempt to make request.
   */
  tryRequest?: number
  /**
   * Lavalink endpoint version. Currently only available v3, v4
   */
  version?: VersionAPI
}

export interface ConfigLavalink {
  wsSecure: boolean
  version: VersionAPI
  /**
   * Launch check requests to get more information about Lavalink like get JVM version, Lavalink version, Git and etc..
   */
  initializeCheckingRequests?: boolean
  /**
   * Nodes to connect with Lavalink.
   */
  nodes: LavalinkNodes
  /**
   * The library can manage state of the voice state like, receive voice channel disconnect updates, 
   * or move the bot to another channel.
   * @default managerVoiceState: true 
   * 
   * This default value is returned to automatically manage voice state.
   */
  managerVoiceState?: boolean
  /**
   * To authenticate API to gain access to Endpoint.
   */
  auth: LavalinkAuth
  /**
   * Lavalink Rest Request Settings
   */
  rest: LavalinkRestOptions;
  /**
   * Wait for the client to issue a Ready to initialize the Lavalink nodes.
   */
  waitReady: boolean;
}
export const defineConfigLavalink = (options?: ConfigLavalink) => ({
  // Settings Default
  managerVoiceState: true,
  auth: {
    secure: false,
    ...options?.auth
  },
  version: VersionAPI.v3,
  wsSecure: false,
  rest: {
    timeout: 16 * 1000, // 16 Seconds
    emitError: false,
    tryRequest: -1,
    version: options?.version === undefined ? VersionAPI.v3 : options?.version,
    ...options?.rest
  },
  waitReady: true,
  ...options
} as ConfigLavalink)


// To validate LavalinkNode Settings.
export const validateNode = (node: LavalinkNode, pos?: number) => {
  if ((node.id == null && node.id == undefined))
    throw new Error(`node${typeof pos === 'number' ? `[${pos}]` : ''}: The id field is invalid "${node.id}"`)
  if (node.host == null && node.host == undefined)
    throw new Error(`node${typeof pos === 'number' ? `[${pos}]` : ''}: The host field is invalid "${node.host}"`)
  if (node.port == null && node.port == undefined)
    throw new Error(`node${typeof pos === 'number' ? `[${pos}]` : ''}: The port field is invalid "${node.port}"`)
  if (node.password == null && node.password == undefined)
    throw new Error(`node${typeof pos === 'number' ? `[${pos}]` : ''}: The password field is invalid "${node.password}"`)

  return true
}

// To validate Lavalink settings.
export const validateConfig = (options: ConfigLavalink) => {
  if (options.initializeCheckingRequests !== null && options.initializeCheckingRequests !== undefined) {
    if (options.initializeCheckingRequests === null && typeof options.initializeCheckingRequests !== 'boolean')
      throw new Error('Lavalink configuration field of `initializeCheckingRequests` is boolean.')
  }
  if (options.managerVoiceState !== null && options.managerVoiceState !== undefined) {
    if (typeof options.managerVoiceState !== 'boolean')
      throw new Error('Lavalink configuration field of `managerVoiceState` is boolean.')
  }

  if (!Array.isArray(options.nodes)) {
    throw new Error(`The nodes field you provided is not an Array.`)
  } else {
    let n = 0
    for (const node of options.nodes) {
      validateNode(node, n++)
    }
  }


  if (options.auth == null && options.auth == undefined) {
    throw new Error('Lavalink configuration field of `auth` is Object.')
  } else {
    if (typeof options.auth.ip !== 'string')
      throw new Error('Lavalink configuration field of `auth.ip` is string.')
    if (typeof options.auth.port !== 'number')
      throw new Error('Lavalink configuration field of `auth.port` is number.')
    if (typeof options.auth.authorization !== 'string')
      throw new Error('Lavalink configuration field of `auth.authorization` is string.')
    if (options.auth['user-id'] !== null && options.auth['user-id'] !== undefined) {
      if (typeof options.auth['user-id'] !== 'string')
        throw new Error('Lavalink configuration field of `auth.user-id` is string.')
    }
  }

  if (options.rest !== null && options.rest !== undefined) {
    if (options.rest.emitError !== undefined && typeof options.rest.emitError !== 'boolean')
      throw new Error('Lavalink configuration field of `rest.emitError` is boolean.')
    if (options.rest.timeout !== undefined && typeof options.rest.timeout !== 'number')
      throw new Error('Lavalink configuration field of `rest.timeout` is number.')
    if (options.rest.timeout !== undefined && options.rest.timeout <= 1 * 1000)
      throw new Error('Lavalink configuration field of `rest.timeout` less seconds are not allowed to add the timeout to the request.')
    if (options.rest.tryRequest !== undefined && typeof options.rest.tryRequest !== 'number')
      throw new Error('Lavalink configuration field of `rest.tryRequest` is number.')
    if (options.rest.version !== undefined && typeof options.rest.version !== 'string')
      throw new Error('Lavalink configuration field of `rest.version` is string.')
  }
  return true
}