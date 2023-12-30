export type FiledsVersionHeader = 'lavalink-api-version' | 'api-version' | 'apiVersion' | 'version'
export type VersionHeader = {
  [key in FiledsVersionHeader]?: string | number | null
}

export function getVersion(headers: VersionHeader): string | number {
  let version: string | number
  
  if (headers['api-version'])
    version = parseInt((headers['api-version'] ?? '') as string)
  else if (headers['lavalink-api-version'])
    version = parseInt((headers['lavalink-api-version'] ?? '') as string)
  else if (headers['version'])
    version = parseInt((headers['version'] ?? '') as string)
  else
    version = 2

  if (!isFinite(version) || isNaN(version))
    version = 'custom'

  return version
}
