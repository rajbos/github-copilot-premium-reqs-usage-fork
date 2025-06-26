import { describe, it, expect } from 'vitest';
import { 
  calculatePercentage, 
  formatPercentage, 
  getRequestStatusSummary,
  getModelUsageSummaryWithPercentages,
  CopilotUsageData 
} from '../lib/utils';

describe('Percentage Calculations', () => {
  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculatePercentage(25, 100)).toBe(25);
      expect(calculatePercentage(50, 100)).toBe(50);
      expect(calculatePercentage(1, 3)).toBeCloseTo(33.333333, 5);
    });

    it('should handle zero total correctly', () => {
      expect(calculatePercentage(10, 0)).toBe(0);
    });

    it('should handle zero value correctly', () => {
      expect(calculatePercentage(0, 100)).toBe(0);
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage with default 1 decimal', () => {
      expect(formatPercentage(25.678)).toBe('25.7%');
      expect(formatPercentage(33.333333)).toBe('33.3%');
    });

    it('should format percentage with specified decimals', () => {
      expect(formatPercentage(25.678, 0)).toBe('26%');
      expect(formatPercentage(25.678, 2)).toBe('25.68%');
    });
  });

  describe('getRequestStatusSummary', () => {
    it('should calculate request status summary with percentages correctly', () => {
      const testData: CopilotUsageData[] = [
        {
          timestamp: new Date('2024-01-01T10:00:00Z'),
          user: 'user1',
          model: 'gpt-4',
          requestsUsed: 10,
          exceedsQuota: false,
          totalMonthlyQuota: '100'
        },
        {
          timestamp: new Date('2024-01-01T11:00:00Z'),
          user: 'user2',
          model: 'gpt-3.5',
          requestsUsed: 5,
          exceedsQuota: true,
          totalMonthlyQuota: '100'
        },
        {
          timestamp: new Date('2024-01-01T12:00:00Z'),
          user: 'user1',
          model: 'gpt-4',
          requestsUsed: 15,
          exceedsQuota: false,
          totalMonthlyQuota: '100'
        }
      ];

      const summary = getRequestStatusSummary(testData);

      expect(summary.totalRequests).toBe(30);
      expect(summary.compliantRequests).toBe(25);
      expect(summary.exceedingRequests).toBe(5);
      expect(summary.compliantPercentage).toBeCloseTo(83.33, 2);
      expect(summary.exceedingPercentage).toBeCloseTo(16.67, 2);
    });

    it('should handle all compliant requests', () => {
      const testData: CopilotUsageData[] = [
        {
          timestamp: new Date('2024-01-01T10:00:00Z'),
          user: 'user1',
          model: 'gpt-4',
          requestsUsed: 10,
          exceedsQuota: false,
          totalMonthlyQuota: '100'
        }
      ];

      const summary = getRequestStatusSummary(testData);

      expect(summary.totalRequests).toBe(10);
      expect(summary.compliantRequests).toBe(10);
      expect(summary.exceedingRequests).toBe(0);
      expect(summary.compliantPercentage).toBe(100);
      expect(summary.exceedingPercentage).toBe(0);
    });
  });

  describe('getModelUsageSummaryWithPercentages', () => {
    it('should calculate model usage summary with percentages correctly', () => {
      const testData: CopilotUsageData[] = [
        {
          timestamp: new Date('2024-01-01T10:00:00Z'),
          user: 'user1',
          model: 'gpt-4',
          requestsUsed: 20,
          exceedsQuota: false,
          totalMonthlyQuota: '100'
        },
        {
          timestamp: new Date('2024-01-01T11:00:00Z'),
          user: 'user2',
          model: 'gpt-3.5',
          requestsUsed: 10,
          exceedsQuota: true,
          totalMonthlyQuota: '100'
        },
        {
          timestamp: new Date('2024-01-01T12:00:00Z'),
          user: 'user1',
          model: 'gpt-4',
          requestsUsed: 10,
          exceedsQuota: true,
          totalMonthlyQuota: '100'
        }
      ];

      const summary = getModelUsageSummaryWithPercentages(testData);

      expect(summary).toHaveLength(2);
      
      // GPT-4 should be first (higher total requests)
      const gpt4Summary = summary[0];
      expect(gpt4Summary.model).toBe('gpt-4');
      expect(gpt4Summary.totalRequests).toBe(30);
      expect(gpt4Summary.percentage).toBe(75); // 30/40 * 100
      expect(gpt4Summary.compliantRequests).toBe(20);
      expect(gpt4Summary.exceedingRequests).toBe(10);
      expect(gpt4Summary.compliantPercentage).toBeCloseTo(66.67, 2); // 20/30 * 100
      expect(gpt4Summary.exceedingPercentage).toBeCloseTo(33.33, 2); // 10/30 * 100

      // GPT-3.5 should be second
      const gpt3Summary = summary[1];
      expect(gpt3Summary.model).toBe('gpt-3.5');
      expect(gpt3Summary.totalRequests).toBe(10);
      expect(gpt3Summary.percentage).toBe(25); // 10/40 * 100
      expect(gpt3Summary.compliantRequests).toBe(0);
      expect(gpt3Summary.exceedingRequests).toBe(10);
      expect(gpt3Summary.compliantPercentage).toBe(0);
      expect(gpt3Summary.exceedingPercentage).toBe(100);
    });
  });
});