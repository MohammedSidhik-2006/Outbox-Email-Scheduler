import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env';
import { logger } from '../lib/logger';

class ElasticsearchServiceClass {
  private client: Client | null = null;
  private readonly INDEX_NAME = 'email-deliveries';

  constructor() {
    if (env.ELASTICSEARCH_URL && env.ELASTICSEARCH_API_KEY) {
      this.client = new Client({
        node: env.ELASTICSEARCH_URL,
        auth: { apiKey: env.ELASTICSEARCH_API_KEY },
      });
      this.initIndex();
    } else {
      logger.warn('Elasticsearch is not configured. Search features will be disabled.');
    }
  }

  private async initIndex() {
    if (!this.client) return;
    try {
      const exists = await this.client.indices.exists({ index: this.INDEX_NAME });
      if (!exists) {
        await this.client.indices.create({
          index: this.INDEX_NAME,
          mappings: {
            properties: {
              deliveryId: { type: 'keyword' },
              campaignId: { type: 'keyword' },
              senderId: { type: 'keyword' },
              recipient: { type: 'keyword' },
              subject: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
            }
          }
        });
        logger.info({ index: this.INDEX_NAME }, 'Created Elasticsearch index');
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize Elasticsearch index');
    }
  }

  public async indexDelivery(delivery: any) {
    if (!this.client) return;
    try {
      await this.client.index({
        index: this.INDEX_NAME,
        id: delivery.id,
        document: {
          deliveryId: delivery.id,
          campaignId: delivery.campaignId,
          senderId: delivery.senderId,
          recipient: delivery.recipient,
          subject: delivery.campaign?.subject || delivery.subject,
          status: delivery.status,
          scheduledAt: delivery.scheduledAt,
          sentAt: delivery.sentAt,
          createdAt: delivery.createdAt,
        }
      });
    } catch (error) {
      logger.error({ err: error, deliveryId: delivery.id }, 'Failed to index delivery in Elasticsearch');
    }
  }

  public async updateDeliveryStatus(deliveryId: string, status: string, error?: string) {
    if (!this.client) return;
    try {
      await this.client.update({
        index: this.INDEX_NAME,
        id: deliveryId,
        doc: {
          status,
          ...(status === 'SENT' ? { sentAt: new Date() } : {})
        }
      });
    } catch (err) {
      logger.error({ err, deliveryId, status }, 'Failed to update delivery status in Elasticsearch');
    }
  }

  public async searchDeliveries(senderIds: string[], query: string, page = 1, limit = 50) {
    if (!this.client) {
      return { data: [], total: 0 };
    }

    try {
      const from = (page - 1) * limit;
      
      const response = await this.client.search({
        index: this.INDEX_NAME,
        from,
        size: limit,
        query: {
          bool: {
            filter: [
              { terms: { senderId: senderIds } }
            ],
            must: query ? [
              {
                multi_match: {
                  query,
                  fields: ['recipient', 'subject', 'status']
                }
              }
            ] : [{ match_all: {} }]
          }
        },
        sort: [
          { scheduledAt: { order: 'desc' } }
        ]
      });

      const hits = response.hits.hits.map((hit: any) => hit._source);
      const total = typeof response.hits.total === 'number' 
        ? response.hits.total 
        : response.hits.total?.value || 0;

      return { data: hits, total };
    } catch (error) {
      logger.error({ err: error, query }, 'Elasticsearch search failed');
      throw new Error('Search unavailable');
    }
  }
}

export const ElasticsearchService = new ElasticsearchServiceClass();
