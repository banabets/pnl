import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch before importing the module
global.fetch = vi.fn();

describe('Price Alert Manager', () => {
  let PriceAlertManager: any;
  let manager: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset the module
    vi.resetModules();

    // Import fresh module
    const module = await import('../../server/price-alerts');
    PriceAlertManager = (module as any).priceAlertManager.constructor;
    manager = new PriceAlertManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createAlert', () => {
    it('should create a price-above alert', () => {
      const alert = manager.createAlert(
        'user-123',
        'token-mint-abc',
        'Test Token',
        'TEST',
        'price-above',
        1.5
      );

      expect(alert.id).toBeDefined();
      expect(alert.userId).toBe('user-123');
      expect(alert.tokenMint).toBe('token-mint-abc');
      expect(alert.tokenName).toBe('Test Token');
      expect(alert.tokenSymbol).toBe('TEST');
      expect(alert.alertType).toBe('price-above');
      expect(alert.targetValue).toBe(1.5);
      expect(alert.status).toBe('active');
      expect(alert.notified).toBe(false);
    });

    it('should create a volume-above alert', () => {
      const alert = manager.createAlert(
        'user-456',
        'token-mint-xyz',
        'Volume Token',
        'VOL',
        'volume-above',
        100000
      );

      expect(alert.alertType).toBe('volume-above');
      expect(alert.targetValue).toBe(100000);
    });

    it('should create a market-cap-above alert', () => {
      const alert = manager.createAlert(
        'user-789',
        'token-mint-def',
        'Market Token',
        'MKT',
        'market-cap-above',
        1000000
      );

      expect(alert.alertType).toBe('market-cap-above');
      expect(alert.targetValue).toBe(1000000);
    });
  });

  describe('cancelAlert', () => {
    it('should cancel an active alert', () => {
      const alert = manager.createAlert(
        'user-123',
        'token-mint-abc',
        'Test Token',
        'TEST',
        'price-above',
        1.5
      );

      const result = manager.cancelAlert(alert.id);

      expect(result).toBe(true);
      expect(alert.status).toBe('cancelled');
    });

    it('should not cancel a non-existent alert', () => {
      const result = manager.cancelAlert('non-existent-id');

      expect(result).toBe(false);
    });

    it('should not cancel an already triggered alert', () => {
      const alert = manager.createAlert(
        'user-123',
        'token-mint-abc',
        'Test Token',
        'TEST',
        'price-above',
        1.5
      );

      alert.status = 'triggered';

      const result = manager.cancelAlert(alert.id);

      expect(result).toBe(false);
      expect(alert.status).toBe('triggered'); // Should remain triggered
    });
  });

  describe('getActiveAlerts', () => {
    it('should return only active alerts', () => {
      const alert1 = manager.createAlert('user-123', 'token1', 'Token 1', 'TK1', 'price-above', 1.0);
      const alert2 = manager.createAlert('user-123', 'token2', 'Token 2', 'TK2', 'price-below', 0.5);
      const alert3 = manager.createAlert('user-123', 'token3', 'Token 3', 'TK3', 'volume-above', 1000);

      alert2.status = 'triggered';
      alert3.status = 'cancelled';

      const activeAlerts = manager.getActiveAlerts();

      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].id).toBe(alert1.id);
    });
  });

  describe('getAlertsByToken', () => {
    it('should return alerts for a specific token', () => {
      manager.createAlert('user-123', 'token1', 'Token 1', 'TK1', 'price-above', 1.0);
      manager.createAlert('user-123', 'token1', 'Token 1', 'TK1', 'price-below', 0.5);
      manager.createAlert('user-123', 'token2', 'Token 2', 'TK2', 'volume-above', 1000);

      const alerts = manager.getAlertsByToken('token1');

      expect(alerts).toHaveLength(2);
      expect(alerts.every((a: any) => a.tokenMint === 'token1')).toBe(true);
    });
  });

  describe('getAlertsByUser', () => {
    it('should return alerts for a specific user', () => {
      manager.createAlert('user-123', 'token1', 'Token 1', 'TK1', 'price-above', 1.0);
      manager.createAlert('user-456', 'token2', 'Token 2', 'TK2', 'price-below', 0.5);
      manager.createAlert('user-123', 'token3', 'Token 3', 'TK3', 'volume-above', 1000);

      const alerts = manager.getAlertsByUser('user-123');

      expect(alerts).toHaveLength(2);
      expect(alerts.every((a: any) => a.userId === 'user-123')).toBe(true);
    });
  });

  describe('setBroadcastCallback', () => {
    it('should set broadcast callback', () => {
      const callback = vi.fn();

      manager.setBroadcastCallback(callback);

      expect(manager.broadcastCallback).toBe(callback);
    });
  });

  describe('updateAlertPrice', () => {
    it('should trigger price-above alert when price exceeds target', () => {
      const alert = manager.createAlert(
        'user-123',
        'token-mint-abc',
        'Test Token',
        'TEST',
        'price-above',
        1.5
      );

      manager.updateAlertPrice('token-mint-abc', 2.0);

      expect(alert.status).toBe('triggered');
      expect(alert.currentValue).toBe(2.0);
      expect(alert.notified).toBe(true);
    });

    it('should trigger price-below alert when price falls below target', () => {
      const alert = manager.createAlert(
        'user-123',
        'token-mint-abc',
        'Test Token',
        'TEST',
        'price-below',
        1.0
      );

      manager.updateAlertPrice('token-mint-abc', 0.8);

      expect(alert.status).toBe('triggered');
      expect(alert.currentValue).toBe(0.8);
      expect(alert.notified).toBe(true);
    });

    it('should trigger volume-above alert when volume exceeds target', () => {
      const alert = manager.createAlert(
        'user-123',
        'token-mint-abc',
        'Test Token',
        'TEST',
        'volume-above',
        100000
      );

      manager.updateAlertPrice('token-mint-abc', 1.5, 150000);

      expect(alert.status).toBe('triggered');
      expect(alert.currentValue).toBe(150000);
      expect(alert.notified).toBe(true);
    });

    it('should not trigger alert if already notified', () => {
      const alert = manager.createAlert(
        'user-123',
        'token-mint-abc',
        'Test Token',
        'TEST',
        'price-above',
        1.5
      );

      manager.updateAlertPrice('token-mint-abc', 2.0);
      expect(alert.status).toBe('triggered');

      // Try to trigger again
      alert.status = 'active'; // Reset status
      manager.updateAlertPrice('token-mint-abc', 2.5);

      // Should not trigger because notified is true
      expect(alert.status).toBe('active');
    });

    it('should not trigger if conditions are not met', () => {
      const alert = manager.createAlert(
        'user-123',
        'token-mint-abc',
        'Test Token',
        'TEST',
        'price-above',
        2.0
      );

      manager.updateAlertPrice('token-mint-abc', 1.5);

      expect(alert.status).toBe('active');
      expect(alert.notified).toBe(false);
    });
  });
});
