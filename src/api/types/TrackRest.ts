import { ITrack } from '../../types/Track';

export enum LoadType {
  TRACK,
  PLAYLIST,
  SEARCH,
  ERROR,
  EMPTY
}


export interface ITrackResultBaseRest<T = any> {

  get nameOfPlaylist(): string | null

  /**
  * Recommendation for using this method is to use Node with the most recent version.
  */
  get pluginInfo(): T | null

  /**
   * **Track**:
   * 
   * The library can detect the following load type `TRACK_LOADED` or `trackLoaded` or `track` or enum type, for example `TRACK = 0, ...other enum items`
   * 
   * **Playlist**:
   * 
   * The library can detect the following load type `PLAYLIST_LOADED` or `playlistLoaded` or `playlist` or enum type, for example `PLAYLIST_LOADED = 1, ...other enum items`
   * 
   * **Search**:
   * 
   * The library can detect the following load type `SEARCH_LOADED` or `searchLoaded` or `search` or enum type, for example `SEARCH_LOADED = 2, ...other enum items`
   * 
   * **Error**:
   * 
   * The library can detect the following load type `LOAD_FAILED` or `loadFailed` or `error` or `failed` or enum type, for example `LOAD_FAILED = 3, ...other enum items`
   * 
   * 
   * See more items available on {@link LoadType}
  */
  get loadType(): 'track' | 'playlist' | 'search' | 'error' | 'no-result'

  /**
   * When using this field and loading a track as `search` or `playlist` you wil
   * automatically get the first one in the list, if loading as `track` 
   * you will receive the track coming from the appropriate field in the API.
   */
  get track(): ITrack | null

  /**
   * List {@link TrackRest}
   */
  get tracks(): ITrack[]

  get selectedTrack(): number

  /**
   * Get a list of {@link TrackRest} with longer duration, tracks from streams are not sorted
   */
  get tracksWithLargestDuration(): ITrack[]

  /**
   * When there are tracks in playlist metadata or track metadata loads may return `true`
   */
  get hasAudioTrackInMetadata(): boolean

  /**
   * Use this method to capture the {@link TrackResultBaseRest.errorResult} returned by the API
   */
  get error(): boolean

  /**
   * Use {@link TrackResultBaseRest.error} to get error that API returned
   */
  get errorResult(): { message: string | null; severity: string | null; cause: string[]; stackTrace: string[] } | null


  /**
   * When the result is destroyed this method returns boolean true.
   */
  get resultIsDestroyed(): boolean

  /**
   * Search the track by names.
   */
  searchTrackByTitle(title: string): ITrack[]

  /**
   * Search the track by Uri.
   */
  searchTrackByUri(uri: string): ITrack[]


  /**
   * Destroy the result.
   */
  destroyResult(): void
}
