import { Node } from '../internal/node'
import { Player } from '../internal/player'

export interface IManager {

  get nodes(): Array<Node>

  get getNodeUnavailable(): number
  
  getPlayer(playerID: string): Player | null
  /**
   * Create a {@link Player}
   */
  createPlayer(playerID: string): Player
  /**
   * Removing the {@link Player} from the list will automatically trigger a `playerDestroy` event.
   */
  removePlayer(playerID: string): boolean
  /**
   * If you want to move players to another less burdensome node,
   * this option is appropriate and safe.
   */
  moveNodePlayer(playerID: string[] | string): boolean
}