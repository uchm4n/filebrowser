import { request } from './client'

/**
 * Contract verified against https://files.nuc.ge/swagger/doc.json.
 *
 * `files` and `folders` are ABSENT (not empty) when a directory has none, so
 * every read goes through `?? []`.
 */
export interface ResourceEntry {
  name: string
  size: number
  created: string
  modified: string
  /** MIME type, or "directory". */
  type: string
  hidden: boolean
  hasPreview: boolean
  viewToken?: string
}

export interface FileInfo extends ResourceEntry {
  /** Canonical, always ends with "/". Use this rather than joining paths. */
  path: string
  source: string
  files?: ResourceEntry[]
  folders?: ResourceEntry[]
}

export async function listDirectory(path: string, source: string, token: string) {
  const query = new URLSearchParams({ path, source })
  return request<FileInfo>('GET', `/resources?${query}`, { token })
}
