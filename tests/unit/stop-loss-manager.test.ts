import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the dependencies before importing
vi.mock('../../server/portfolio-tracker', () => ({
  portfolioTracker: {
    getPositionsByToken: vi.fn(),
    getPosition: vi.fn(),
    updatePositionAfterSell: vi.fn(),
  },
}));

vi.mock('../../server/jupiter-service', () => ({
  getJupiterService: vi.fn(),
}));

vi.mock('../../server/wallet-service', () => ({
  walletService: {
    getWalletWithKey: vi.fn(),
  },
}));

vi.mock('../../server/database', () => ({
  isConnected: vi.fn(() => true),
}));

describe('Stop Loss Manager', () => {
  let StopLossManager: any;
  let manager: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Import fresh module
    const module = await import('../../server/stop-loss-manager');
    StopLossManager = (module as any).stopLossManager.constructor;
    manager = new StopLossManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createStopLoss', () => {
    it('should create a stop loss order', () => {
      const order = manager.createStopLoss(
        'user-123',
        'position-1',
        'token-mint-abc',
        'Test Token',
        'TEST',
        0,
        'wallet-address-123',
        0.9, // Trigger at $0.90
        50 // Sell 50%
      );

      expect(order.id).toBeDefined();
      expect(order.id).toMatch(/^sl-/);
      expect(order.userId).toBe('user-123');
      expect(order.positionId).toBe('position-1');
      expect(order.tokenMint).toBe('token-mint-abc');
      expect(order.tokenName).toBe('Test Token');
      expect(order.tokenSymbol).toBe('TEST');
      expect(order.walletIndex).toBe(0);
      expect(order.walletAddress).toBe('wallet-address-123');
      expect(order.orderType).toBe('stop-loss');
      expect(order.triggerPrice).toBe(0.9);
      expect(order.amount).toBe(50);
      expect(order.status).toBe('active');
      expect(order.createdAt).toBeDefined();
    });

    it('should clamp amount between 0 and 100', () => {
      const order1 = manager.createStopLoss(
        'user-123',
        'position-1',
        'token-mint-abc',
        'Test Token',
        'TEST',
        0,
        'wallet-address-123',
        0.9,
        150 // Over 100
      );

      expect(order1.amount).toBe(100);

      const order2 = manager.createStopLoss(
        'user-123',
        'position-1',
        'token-mint-abc',
        'Test Token',
        'TEST',
        0,
        'wallet-address-123',
        0.9,
        -10 // Negative
      );

      expect(order2.amount).toBe(0);
    });
  });

  describe('createTakeProfit', () => {
    it('should create a take profit order', () => {
      const order = manager.createTakeProfit(
        'user-123',
        'position-1',
        'token-mint-abc',
        'Test Token',
        'TEST',
        0,
        'wallet-address-123',
        1.5, // Trigger at $1.50
        100 // Sell 100%
      );

      expect(order.id).toBeDefined();
      expect(order.id).toMatch(/^tp-/);
      expect(order.orderType).toBe('take-profit');
      expect(order.triggerPrice).toBe(1.5);
      expect(order.amount).toBe(100);
      expect(order.status).toBe('active');
    });
  });

  describe('createTrailingStop', () => {
    it('should create a trailing stop order', () => {
      const currentPrice = 2.0;
      const trailingPercent = 10; // 10% trailing

      const order = manager.createTrailingStop(
        'user-123',
        'position-1',
        'token-mint-abc',
        'Test Token',
        'TEST',
        0,
        'wallet-address-123',
        trailingPercent,
        currentPrice
      );

      expect(order.id).toBeDefined();
      expect(order.id).toMatch(/^ts-/);
      expect(order.trailingPercent).toBe(10);
      expect(order.highestPrice).toBe(2.0);
      expect(order.currentStopPrice).toBe(1.8); // 2.0 * (1 - 0.10)
      expect(order.status).toBe('active');
    });

    it('should clamp trailing percent between 1 and 50', () => {
      const order1 = manager.createTrailingStop(
        'user-123',
        'position-1',
        'token-mint-abc',
        'Test Token',
        'TEST',
        0,
        'wallet-address-123',
        60, // Over 50
        2.0
      );

      expect(order1.trailingPercent).toBe(50);

      const order2 = manager.createTrailingStop(
        'user-123',
        'position-1',
        'token-mint-abc',
        'Test Token',
        'TEST',
        0,
        'wallet-address-123',
        0, // Under 1
        2.0
      );

      expect(order2.trailingPercent).toBe(1);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel an active stop loss order', () => {
      const order = manager.createStopLoss(
        'user-123',
        'position-1',
        'token-mint-abc',
        'Test Token',
        'TEST',
        0,
        'wallet-address-123',
        0.9,
        50
      );

      const result = manager.cancelOrder(order.id);

      expect(result).toBe(true);
      expect(order.status).toBe('cancelled');
    });

    it('should cancel an active trailing stop order', () => {
      const order = manager.createTrailingStop(
        'user-123',
        'position-1',
        'token-mint-abc',
        'Test Token',
        'TEST',
        0,
        'wallet-address-123',
        10,
        2.0
      );

      const result = manager.cancelOrder(order.id);

      expect(result).toBe(true);
      expect(order.status).toBe('cancelled');
    });

    it('should not cancel a non-existent order', () => {
      const result = manager.cancelOrder('non-existent-id');

      expect(result).toBe(false);
    });

    it('should not cancel an already triggered order', () => {
      const order = manager.createStopLoss(
        'user-123',
        'position-1',
        'token-mint-abc',
        'Test Token',
        'TEST',
        0,
        'wallet-address-123',
        0.9,
        50
      );

      order.status = 'triggered';

      const result = manager.cancelOrder(order.id);

      expect(result).toBe(false);
      expect(order.status).toBe('triggered');
    });
  });

  describe('getActiveOrders', () => {
    it('should return only active orders', () => {
      const sl1 = manager.createStopLoss('user-123', 'pos-1', 'token1', 'T1', 'T1', 0, 'w1', 0.9, 50);
      const sl2 = manager.createStopLoss('user-123', 'pos-2', 'token2', 'T2', 'T2', 0, 'w2', 0.8, 100);
      const ts1 = manager.createTrailingStop('user-123', 'pos-3', 'token3', 'T3', 'T3', 0, 'w3', 10, 2.0);

      sl2.status = 'cancelled';

      const active = manager.getActiveOrders();

      expect(active.stopLoss).toHaveLength(1);
      expect(active.stopLoss[0].id).toBe(sl1.id);
      expect(active.trailingStop).toHaveLength(1);
      expect(active.trailingStop[0].id).toBe(ts1.id);
    });
  });

  describe('getOrdersByToken', () => {
    it('should return orders for a specific token', () => {
      manager.createStopLoss('user-123', 'pos-1', 'token1', 'T1', 'T1', 0, 'w1', 0.9, 50);
      manager.createStopLoss('user-123', 'pos-2', 'token1', 'T1', 'T1', 0, 'w2', 0.8, 100);
      manager.createStopLoss('user-123', 'pos-3', 'token2', 'T2', 'T2', 0, 'w3', 0.7, 75);
      manager.createTrailingStop('user-123', 'pos-4', 'token1', 'T1', 'T1', 0, 'w4', 10, 2.0);

      const orders = manager.getOrdersByToken('token1');

      expect(orders.stopLoss).toHaveLength(2);
      expect(orders.trailingStop).toHaveLength(1);
      expect(orders.stopLoss.every((o: any) => o.tokenMint === 'token1')).toBe(true);
    });

    it('should only return active orders for token', () => {
      const sl1 = manager.createStopLoss('user-123', 'pos-1', 'token1', 'T1', 'T1', 0, 'w1', 0.9, 50);
      const sl2 = manager.createStopLoss('user-123', 'pos-2', 'token1', 'T1', 'T1', 0, 'w2', 0.8, 100);

      sl2.status = 'executed';

      const orders = manager.getOrdersByToken('token1');

      expect(orders.stopLoss).toHaveLength(1);
      expect(orders.stopLoss[0].id).toBe(sl1.id);
    });
  });
});
