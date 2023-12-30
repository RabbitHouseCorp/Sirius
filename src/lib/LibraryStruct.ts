export interface LibraryChannel {
  voiceServer(token: string | null, guildID: string | null, endpoint: string | null): void
  voiceState(sessionID: string | null, channelID: string | null, options?: {
    suppress: boolean
    deaf: boolean
    mute: boolean
    selfMute: boolean
    selfDeaf: boolean
    sessionID: string | null
    joined: boolean
  }): void
  shardVoice(shardID: number, status: 'disconnect' | 'resume' | 'ready'): void
  defineClient(data: { botID: string }): void
  shardID(shardID: number, data: { guildID?: string | null, channelID?: null }): void
}


export interface LibraryStruct<G, C> {
  getGuild(guildID: string): G | null
  getChannel(guildID: string): C | null
  countUsersConnected(guildID: string): number | null
  connectVoice(guildID: string, channelID: string, options: {
    selfMute?: boolean
    selfDeaf?: boolean
  }): boolean
  reconnectVoice(guildID: string, channelID: string, options: {
    selfMute?: boolean
    selfDeaf?: boolean
  }): boolean
  disconnectVoice(guildID: string, options: {
    selfMute?: boolean
    selfDeaf?: boolean
  }): boolean
  switch(guildID: string, channelID: string, options: {
    selfMute?: boolean
    selfDeaf?: boolean
  }): boolean
}

