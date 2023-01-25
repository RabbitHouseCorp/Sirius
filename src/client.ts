import { EventEmitter } from 'stream';
import { ConfigLavalink } from './config';
import { VoiceStateManager } from './manager';
import { LavalinkRest } from './rest';
import { LavalinkNodeConnection } from './websocket';

export class SiriusClient extends EventEmitter {
  public restLavalink: LavalinkRest
  private nodeLoaded: boolean = false
  public nodes: Array<LavalinkNodeConnection<VoiceStateManager>>
  public config: ConfigLavalink
  public clientLibrary: any
  constructor(config: ConfigLavalink, clientLibrary: any) {
    super()
    this.restLavalink = new LavalinkRest(config)
    this.config = config
    this.nodes = new Array()
    this.clientLibrary = clientLibrary
    this.addListenersRest()
  }

  async connect() {
    const start = () => {
      for (const node of this.config.nodes) {
        this.nodes.push(new LavalinkNodeConnection(this.config, this.clientLibrary, node, this.restLavalink))
      }
      this.addListenersNodes()
      this.connectNodes()
    }
    if (this.config.waitReady) {
      if (typeof this.clientLibrary.once !== 'function')
        throw new Error('Unable to parse the client.')
      return new Promise((resolve) => {
        this.clientLibrary.once('ready', () => {
          resolve(true)
          start()
        })
      })
    }
    start()
    return Promise.resolve()
  }

  private addListenersRest() {

  }
  private addListenersNodes() {
    for (const node of this.nodes) {
      node.on('open', (...args) => this.emit('open', ...args, node))
      node.on('unexpected-response', (...args) => this.emit('unexpected-response', ...args, node))
      node.on('upgrade', (...args) => this.emit('upgrade', ...args, node))
      node.on('error', (...args) => this.emit('error', ...args, node))
      node.on('close', (...args) => this.emit('close', ...args, node))
      node.on('message', (...args) => this.emit('message', ...args, node))
      node.on('debugMessage', (...args) => this.emit('debugMessage', ...args, node))
      node.on('reconnect', (...args) => this.emit('reconnect', ...args, node))
      node.on('connect', (...args) => this.emit('connect', ...args, node))
      node.on('debug', (...args) => this.emit('debug', ...args, node))
    }
  }
  private async connectNodes() {
    for (const node of this.nodes) {
      await node.connect()
    }
    this.nodeLoaded = true
  }

  getNode(nodeId: string) {
    const node = this.nodes.filter((i) => i.lavalinkNode?.id == nodeId)[0]

    return node == undefined ? null : node
  }

  createPlayer(nodeId: string, guildId: string) {
    if (!this.nodeLoaded)
      throw new Error('The Node was not loaded.')

    const node = this.nodes.filter((i) => i.lavalinkNode?.id === nodeId)[0]
    if (node == undefined)
      throw new Error(`This node with identification ${typeof nodeId}:${nodeId} does not exist or you have not inserted it in the parameter incorrectly.`)

    return node.createPlayer(guildId)
  }
}