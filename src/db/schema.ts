export type DatabaseSchema = {
  post: Post
  post_repost: PostRepost
  app_user: AppUser
  sub_state: SubState
}

export type Post = {
  uri: string
  cid: string
  indexedAt: string
  authorDid: string
  createdAt: string
  langsJson: string
  isPolitical: number
  status: 'active' | 'deleted'
}

export type PostRepost = {
  repostUri: string
  authorDid: string
  postUri: string
  createdAt: string
  status: 'active' | 'deleted'
}

export type AppUser = {
  did: string
  handle: string | null
  pds_url: string | null
  first_seen_at: string | null
  last_seen_at: string | null
}

export type SubState = {
  service: string
  cursor: number
}
