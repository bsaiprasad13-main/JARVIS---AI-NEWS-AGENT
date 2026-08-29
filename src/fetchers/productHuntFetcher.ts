import { Fetcher } from './base';
import { RawItem } from '../models/types';

export class ProductHuntFetcher implements Fetcher {
  public sourceName = 'Product Hunt';
  private apiUrl = 'https://api.producthunt.com/v2/api/graphql';

  public async fetchItems(): Promise<RawItem[]> {
    const apiKey = process.env.PRODUCT_HUNT_API_KEY;
    if (!apiKey) {
      console.warn('PRODUCT_HUNT_API_KEY is not set. Skipping Product Hunt fetch.');
      return [];
    }

    const query = `
      query {
        posts(first: 20) {
          edges {
            node {
              id
              name
              description
              url
              createdAt
              votesCount
              makers {
                name
              }
            }
          }
        }
      }
    `;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Product Hunt API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const posts = data?.data?.posts?.edges || [];

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const items: RawItem[] = [];
      for (const edge of posts) {
        const post = edge.node;
        const publishedAt = new Date(post.createdAt);

        if (publishedAt >= oneDayAgo) {
          items.push({
            id: post.id,
            source: this.sourceName,
            title: post.name,
            url: post.url,
            publishedAt: post.createdAt,
            author: post.makers?.[0]?.name || 'Unknown',
            description: post.description,
            score: post.votesCount,
          });
        }
      }

      return items;
    } catch (error) {
      console.error('Error fetching from Product Hunt:', error);
      return [];
    }
  }
}
