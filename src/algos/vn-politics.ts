import { InvalidRequestError } from '@atproto/xrpc-server'
import { AppContext } from '../config'
import {
  QueryParams,
  OutputSchema as AlgoOutput,
} from '../lexicon/types/app/bsky/feed/getFeedSkeleton'

export const shortname = 'vn-politics'

type FeedCursor = {
  tier: 0 | 1
  createdAt: string
  tieUri: string
}

type FeedItem = {
  uri: string
  createdAt: string
  tieUri: string
  repostUri?: string
  tier: 0 | 1
}

const decodeCursor = (value?: string): FeedCursor | undefined => {
  if (!value) return undefined

  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    if (
      (parsed.tier === 0 || parsed.tier === 1) &&
      typeof parsed.createdAt === 'string' &&
      (typeof parsed.tieUri === 'string' || typeof parsed.uri === 'string')
    ) {
      return {
        tier: parsed.tier,
        createdAt: parsed.createdAt,
        tieUri: parsed.tieUri ?? parsed.uri,
      }
    }
  } catch {
    // Invalid cursors are rejected below.
  }

  throw new InvalidRequestError('Invalid feed cursor')
}

const encodeCursor = (cursor: FeedCursor) =>
  Buffer.from(JSON.stringify(cursor)).toString('base64url')

const getAppUserPosts = async (
  ctx: AppContext,
  limit: number,
  cursor?: FeedCursor,
) => {
  let query = ctx.db
    .selectFrom('post')
    .innerJoin('app_user', 'app_user.did', 'post.authorDid')
    .select(['post.uri', 'post.createdAt', 'post.uri as tieUri'])
    .where('post.status', '=', 'active')
    .orderBy('post.createdAt', 'desc')
    .orderBy('post.uri', 'desc')

  if (cursor?.tier === 0) {
    query = query.where((expression) =>
      expression.or([
        expression('post.createdAt', '<', cursor.createdAt),
        expression.and([
          expression('post.createdAt', '=', cursor.createdAt),
          expression('post.uri', '<', cursor.tieUri),
        ]),
      ]),
    )
  }

  return query.limit(limit).execute()
}

const getAppUserReposts = async (
  ctx: AppContext,
  limit: number,
  cursor?: FeedCursor,
) => {
  let query = ctx.db
    .selectFrom('post_repost')
    .innerJoin('app_user', 'app_user.did', 'post_repost.authorDid')
    .select([
      'post_repost.postUri as uri',
      'post_repost.createdAt',
      'post_repost.repostUri as tieUri',
      'post_repost.repostUri',
    ])
    .where('post_repost.status', '=', 'active')
    .orderBy('post_repost.createdAt', 'desc')
    .orderBy('post_repost.repostUri', 'desc')

  if (cursor?.tier === 0) {
    query = query.where((expression) =>
      expression.or([
        expression('post_repost.createdAt', '<', cursor.createdAt),
        expression.and([
          expression('post_repost.createdAt', '=', cursor.createdAt),
          expression('post_repost.repostUri', '<', cursor.tieUri),
        ]),
      ]),
    )
  }

  return query.limit(limit).execute()
}

const getOtherPoliticalPosts = async (
  ctx: AppContext,
  limit: number,
  cursor?: FeedCursor,
) => {
  let query = ctx.db
    .selectFrom('post')
    .leftJoin('app_user', 'app_user.did', 'post.authorDid')
    .select(['post.uri', 'post.createdAt', 'post.uri as tieUri'])
    .where('post.status', '=', 'active')
    .where('post.isVietnamEligible', '=', 1)
    .where('app_user.did', 'is', null)
    .orderBy('post.createdAt', 'desc')
    .orderBy('post.uri', 'desc')

  if (cursor?.tier === 1) {
    query = query.where((expression) =>
      expression.or([
        expression('post.createdAt', '<', cursor.createdAt),
        expression.and([
          expression('post.createdAt', '=', cursor.createdAt),
          expression('post.uri', '<', cursor.tieUri),
        ]),
      ]),
    )
  }

  return query.limit(limit).execute()
}

const getOtherPoliticalReposts = async (
  ctx: AppContext,
  limit: number,
  cursor?: FeedCursor,
) => {
  let query = ctx.db
    .selectFrom('post_repost')
    .innerJoin('post', 'post.uri', 'post_repost.postUri')
    .leftJoin('app_user', 'app_user.did', 'post_repost.authorDid')
    .select([
      'post_repost.postUri as uri',
      'post_repost.createdAt',
      'post_repost.repostUri as tieUri',
      'post_repost.repostUri',
    ])
    .where('post_repost.status', '=', 'active')
    .where('post.status', '=', 'active')
    .where('post.isVietnamEligible', '=', 1)
    .where('app_user.did', 'is', null)
    .orderBy('post_repost.createdAt', 'desc')
    .orderBy('post_repost.repostUri', 'desc')

  if (cursor?.tier === 1) {
    query = query.where((expression) =>
      expression.or([
        expression('post_repost.createdAt', '<', cursor.createdAt),
        expression.and([
          expression('post_repost.createdAt', '=', cursor.createdAt),
          expression('post_repost.repostUri', '<', cursor.tieUri),
        ]),
      ]),
    )
  }

  return query.limit(limit).execute()
}

const mergeFeedItems = (items: FeedItem[], limit: number) => {
  const seenUris = new Set<string>()
  return items
    .sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        right.tieUri.localeCompare(left.tieUri),
    )
    .filter((item) => {
      if (seenUris.has(item.uri)) return false
      seenUris.add(item.uri)
      return true
    })
    .slice(0, limit)
}

export const handler = async (
  ctx: AppContext,
  params: QueryParams,
): Promise<AlgoOutput> => {
  const cursor = decodeCursor(params.cursor)
  const limit = Math.max(1, Math.min(params.limit, 100))
  let posts: FeedItem[] = []

  if (!cursor || cursor.tier === 0) {
    const [appPosts, appReposts] = await Promise.all([
      getAppUserPosts(ctx, limit, cursor),
      getAppUserReposts(ctx, limit, cursor),
    ])
    posts = mergeFeedItems(
      [
        ...appPosts.map((post) => ({ ...post, tier: 0 as const })),
        ...appReposts.map((post) => ({ ...post, tier: 0 as const })),
      ],
      limit,
    )
  }

  if (posts.length < limit) {
    const politicalCursor = cursor?.tier === 1 ? cursor : undefined
    const remaining = limit - posts.length
    const [politicalPosts, politicalReposts] = await Promise.all([
      getOtherPoliticalPosts(ctx, remaining, politicalCursor),
      getOtherPoliticalReposts(ctx, remaining, politicalCursor),
    ])
    posts = mergeFeedItems(
      [
        ...posts,
        ...politicalPosts.map((post) => ({ ...post, tier: 1 as const })),
        ...politicalReposts.map((post) => ({ ...post, tier: 1 as const })),
      ],
      limit,
    )
  }

  const lastPost = posts.at(-1)
  return {
    feed: posts.map((post) => ({
      post: post.uri,
      ...(post.repostUri
        ? {
            reason: {
              $type: 'app.bsky.feed.defs#skeletonReasonRepost' as const,
              repost: post.repostUri,
            },
          }
        : {}),
    })),
    cursor: lastPost
      ? encodeCursor({
          tier: lastPost.tier,
          createdAt: lastPost.createdAt,
          tieUri: lastPost.tieUri,
        })
      : undefined,
  }
}