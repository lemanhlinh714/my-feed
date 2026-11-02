import {
  OutputSchema as RepoEvent,
  isCommit,
} from './lexicon/types/com/atproto/sync/subscribeRepos'
import { FirehoseSubscriptionBase, getOpsByType } from './util/subscription'
import { isPoliticalPost } from './util/political'

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  constructor(
    db: ConstructorParameters<typeof FirehoseSubscriptionBase>[0],
    service: string,
    private readonly appUserDids: Set<string>,
  ) {
    super(db, service)
  }

  async handleEvent(evt: RepoEvent) {
    if (!isCommit(evt)) return

    const ops = await getOpsByType(evt)
    const postsToDelete = ops.posts.deletes.map((del) => del.uri)
    const repostsToDelete = ops.reposts.deletes.map((del) => del.uri)
    const externalRepostTargets = ops.reposts.creates
      .filter((repost) => !this.appUserDids.has(repost.author))
      .map((repost) => repost.record.subject.uri)
    const politicalTargets = new Set<string>()
    if (externalRepostTargets.length > 0) {
      const politicalPosts = await this.db
        .selectFrom('post')
        .select('uri')
        .where('uri', 'in', externalRepostTargets)
        .where('status', '=', 'active')
        .where('isPolitical', '=', 1)
        .execute()
      for (const post of politicalPosts) politicalTargets.add(post.uri)
    }

    const quotedUris = ops.posts.creates.flatMap((post) => {
      const embed = post.record.embed as
        | {
            $type?: string
            record?: { uri?: unknown; record?: { uri?: unknown } }
          }
        | undefined
      const strongRef =
        embed?.$type === 'app.bsky.embed.recordWithMedia'
          ? embed.record?.record
          : embed?.record
      return typeof strongRef?.uri === 'string' ? [strongRef.uri] : []
    })
    const politicalQuoteUris = new Set<string>()
    if (quotedUris.length > 0) {
      const politicalQuotes = await this.db
        .selectFrom('post')
        .select('uri')
        .where('uri', 'in', quotedUris)
        .where('status', '=', 'active')
        .where('isPolitical', '=', 1)
        .execute()
      for (const post of politicalQuotes) politicalQuoteUris.add(post.uri)
    }

    const postsToUpsert = ops.posts.creates
      .filter(
        (post) => {
          const embed = post.record.embed as
            | {
                $type?: string
                record?: { uri?: unknown; record?: { uri?: unknown } }
              }
            | undefined
          const strongRef =
            embed?.$type === 'app.bsky.embed.recordWithMedia'
              ? embed.record?.record
              : embed?.record
          const quotesPoliticalPost =
            typeof strongRef?.uri === 'string' &&
            politicalQuoteUris.has(strongRef.uri)
          return (
            this.appUserDids.has(post.author) ||
            isPoliticalPost(post.record.text) ||
            quotesPoliticalPost
          )
        },
      )
      .map((post) => ({
        uri: post.uri,
        cid: post.cid,
        indexedAt: new Date().toISOString(),
        authorDid: post.author,
        createdAt: post.record.createdAt,
        langsJson: JSON.stringify(post.record.langs ?? []),
        isPolitical:
          isPoliticalPost(post.record.text) ||
          (() => {
            const embed = post.record.embed as
              | {
                  $type?: string
                  record?: { uri?: unknown; record?: { uri?: unknown } }
                }
              | undefined
            const strongRef =
              embed?.$type === 'app.bsky.embed.recordWithMedia'
                ? embed.record?.record
                : embed?.record
            return (
              typeof strongRef?.uri === 'string' &&
              politicalQuoteUris.has(strongRef.uri)
            )
          })()
            ? 1
            : 0,
        status: 'active' as const,
      }))

    const repostsToUpsert = ops.reposts.creates
      .filter(
        (repost) =>
          this.appUserDids.has(repost.author) ||
          politicalTargets.has(repost.record.subject.uri),
      )
      .map((repost) => ({
        repostUri: repost.uri,
        authorDid: repost.author,
        postUri: repost.record.subject.uri,
        createdAt: repost.record.createdAt,
        status: 'active' as const,
      }))

    if (postsToDelete.length > 0) {
      await this.db
        .updateTable('post')
        .set({ status: 'deleted' })
        .where('uri', 'in', postsToDelete)
        .execute()
    }
    if (repostsToDelete.length > 0) {
      await this.db
        .deleteFrom('post_repost')
        .where('repostUri', 'in', repostsToDelete)
        .execute()
    }
    if (postsToUpsert.length > 0) {
      await this.db
        .insertInto('post')
        .values(postsToUpsert)
        .onConflict((conflict) =>
          conflict.column('uri').doUpdateSet((expression) => ({
            cid: expression.ref('excluded.cid'),
            indexedAt: expression.ref('excluded.indexedAt'),
            authorDid: expression.ref('excluded.authorDid'),
            createdAt: expression.ref('excluded.createdAt'),
            langsJson: expression.ref('excluded.langsJson'),
            isPolitical: expression.ref('excluded.isPolitical'),
            status: expression.ref('excluded.status'),
          })),
        )
        .execute()
    }
    if (repostsToUpsert.length > 0) {
      await this.db
        .insertInto('post_repost')
        .values(repostsToUpsert)
        .onConflict((conflict) =>
          conflict.column('repostUri').doUpdateSet((expression) => ({
            authorDid: expression.ref('excluded.authorDid'),
            postUri: expression.ref('excluded.postUri'),
            createdAt: expression.ref('excluded.createdAt'),
            status: expression.ref('excluded.status'),
          })),
        )
        .execute()
    }
  }
}
