export type VoiceDebug = {
  /**
   * [Payload Sending, Payload, GeneratingResult, NoResult]
   *  - **Payload**: It will wait for the endpoint to mark how many milliseconds it took to get the session.
   *  - **Payload Sending**: When the library will send the important payload to the Discord API.
   *  - **GeneratingResult**: Still generating results
   *  - **NoResult**: Still no result
   */
  session: [(number | null), (number | null), boolean, boolean]
  /**
   * [Payload Sending, Payload, GeneratingResult, NoResult]
   *  - **Payload**: It will wait for the endpoint to mark how many milliseconds it took to get the session.
   *  - **Payload Sending**: When the library will send the important payload to the Discord API.
   *  - **GeneratingResult**: Still generating results
   *  - **NoResult**: Still no result
   */
  endpoint: [(number | null), (number | null), boolean, boolean]
}