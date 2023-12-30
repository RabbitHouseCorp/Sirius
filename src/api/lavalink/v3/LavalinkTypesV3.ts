export type InfoV3 = {
  version?: VersionV3 | null
  buildTime?: number | null
  git?: GitV3 | null
  jvm?: string | null
  lavaplayer?: string | null
  filters?: Array<string> | null
  sourceManagers?: Array<string> | null
  plugins?: Array<PluginMetaV3> | null
} 

export type VersionV3 = {
  semver?: string | null
  major?: number | null
  minor?: number | null
  patch?: number | null
  preRelease?: string | null
}

export type GitV3 = {
  branch?: string | null
  commit?: string | null
  commitTime?: string | null
}

export type PluginMetaV3 = {
  name?: string | null
  version?: string | null
}