jest.mock('../src/services/ElasticsearchService', () => ({
  ElasticsearchService: {
    indexDelivery: jest.fn().mockResolvedValue(undefined),
    updateDeliveryStatus: jest.fn().mockResolvedValue(undefined),
    searchDeliveries: jest.fn().mockResolvedValue({ data: [], total: 0 })
  }
}));
