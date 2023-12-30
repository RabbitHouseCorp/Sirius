import { PreparePathOptions } from '../RouteManager';

export interface EndpointInterface {
  loadTrack(options: PreparePathOptions): string | null
  getPlayer(options: PreparePathOptions): string | null
  getPlayers(options: PreparePathOptions): string | null
  updateSession(options: PreparePathOptions): string | null
  decodetrack(options: PreparePathOptions): string | null
  decodetracks(options: PreparePathOptions): string | null
  info(options: PreparePathOptions): string | null
  stats(options: PreparePathOptions): string | null
  plugins(options: PreparePathOptions): string | null
  routeplannerStatus(options: PreparePathOptions): string | null
  version(options: PreparePathOptions): string | null
}