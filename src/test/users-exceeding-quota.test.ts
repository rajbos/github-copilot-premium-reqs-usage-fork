import { describe, it, expect } from 'vitest';
import { getUniqueUsersExceedingQuota } from '@/lib/utils';
import type { CopilotUsageData } from '@/lib/utils';

describe('Users Exceeding Quota', () => {
  const mockData: CopilotUsageData[] = [
    {
      timestamp: new Date('2025-01-01T10:00:00Z'),
      user: 'user1',
      model: 'gpt-4o-2024-11-20',
      requestsUsed: 10,
      exceedsQuota: false,
      totalMonthlyQuota: '50'
    },
    {
      timestamp: new Date('2025-01-01T11:00:00Z'),
      user: 'user1',
      model: 'gpt-4o-2024-11-20',
      requestsUsed: 5,
      exceedsQuota: true,
      totalMonthlyQuota: '50'
    },
    {
      timestamp: new Date('2025-01-01T12:00:00Z'),
      user: 'user2',
      model: 'gpt-4.1-2025-04-14',
      requestsUsed: 20,
      exceedsQuota: true,
      totalMonthlyQuota: '50'
    },
    {
      timestamp: new Date('2025-01-02T10:00:00Z'),
      user: 'user1',
      model: 'gpt-4o-2024-11-20',
      requestsUsed: 3,
      exceedsQuota: true,
      totalMonthlyQuota: '50'
    },
    {
      timestamp: new Date('2025-01-01T15:00:00Z'),
      user: 'user3',
      model: 'claude-3',
      requestsUsed: 8,
      exceedsQuota: false,
      totalMonthlyQuota: '50'
    },
    {
      timestamp: new Date('2025-01-02T11:00:00Z'),
      user: 'user4',
      model: 'gpt-4o-2024-11-20',
      requestsUsed: 15,
      exceedsQuota: false,
      totalMonthlyQuota: '50'
    }
  ];

  it('should count unique users who exceeded quota', () => {
    const result = getUniqueUsersExceedingQuota(mockData);
    
    // user1 exceeded quota on 2025-01-01 and 2025-01-02
    // user2 exceeded quota on 2025-01-01
    // user3 never exceeded quota
    // user4 never exceeded quota
    // So only 2 unique users (user1 and user2) exceeded quota
    expect(result).toBe(2);
  });

  it('should return 0 when no users exceeded quota', () => {
    const nonExceedingData: CopilotUsageData[] = [
      {
        timestamp: new Date('2025-01-01T10:00:00Z'),
        user: 'user1',
        model: 'gpt-4o-2024-11-20',
        requestsUsed: 10,
        exceedsQuota: false,
        totalMonthlyQuota: '50'
      },
      {
        timestamp: new Date('2025-01-01T11:00:00Z'),
        user: 'user2',
        model: 'gpt-4.1-2025-04-14',
        requestsUsed: 5,
        exceedsQuota: false,
        totalMonthlyQuota: '50'
      }
    ];
    
    const result = getUniqueUsersExceedingQuota(nonExceedingData);
    expect(result).toBe(0);
  });

  it('should return 0 for empty data', () => {
    const result = getUniqueUsersExceedingQuota([]);
    expect(result).toBe(0);
  });

  it('should handle single user with multiple exceeding days correctly', () => {
    const singleUserData: CopilotUsageData[] = [
      {
        timestamp: new Date('2025-01-01T10:00:00Z'),
        user: 'power-user',
        model: 'gpt-4o-2024-11-20',
        requestsUsed: 10,
        exceedsQuota: true,
        totalMonthlyQuota: '50'
      },
      {
        timestamp: new Date('2025-01-02T10:00:00Z'),
        user: 'power-user',
        model: 'gpt-4o-2024-11-20',
        requestsUsed: 5,
        exceedsQuota: true,
        totalMonthlyQuota: '50'
      },
      {
        timestamp: new Date('2025-01-03T10:00:00Z'),
        user: 'power-user',
        model: 'gpt-4.1-2025-04-14',
        requestsUsed: 8,
        exceedsQuota: true,
        totalMonthlyQuota: '50'
      }
    ];
    
    const result = getUniqueUsersExceedingQuota(singleUserData);
    // Even though the user exceeded quota on multiple days, it's still just 1 unique user
    expect(result).toBe(1);
  });
});