import { describe, it, expect } from 'vitest';
import { 
  parseCSV,
  getRequestStatusSummary,
  getModelUsageSummaryWithPercentages,
  formatPercentage
} from '../lib/utils';

describe('Integration Test - CSV Data Processing with Percentages', () => {
  const testCsvContent = `"Timestamp","User","Model","Requests Used","Exceeds Monthly Quota","Total Monthly Quota"
"2024-01-01T10:00:00Z","user1","gpt-4","20","False","100"
"2024-01-01T11:00:00Z","user2","gpt-3.5-turbo","10","True","50"
"2024-01-01T12:00:00Z","user1","gpt-4","15","False","100"
"2024-01-01T13:00:00Z","user3","gpt-3.5-turbo","5","True","50"
"2024-01-01T14:00:00Z","user2","coding-agent","25","False","Unlimited"
"2024-01-01T15:00:00Z","user1","gpt-4","5","True","100"`;

  it('should process CSV data and calculate percentages correctly', () => {
    // Parse the CSV data
    const data = parseCSV(testCsvContent);
    expect(data).toHaveLength(6);
    
    // Calculate request status summary
    const statusSummary = getRequestStatusSummary(data);
    expect(statusSummary.totalRequests).toBe(80); // 20+10+15+5+25+5
    expect(statusSummary.compliantRequests).toBe(60); // 20+15+25
    expect(statusSummary.exceedingRequests).toBe(20); // 10+5+5
    expect(statusSummary.compliantPercentage).toBe(75); // 60/80 * 100
    expect(statusSummary.exceedingPercentage).toBe(25); // 20/80 * 100
    
    // Calculate model usage summary with percentages
    const modelSummary = getModelUsageSummaryWithPercentages(data);
    expect(modelSummary).toHaveLength(3);
    
    // GPT-4 should have 40 requests (20+15+5) = 50% of total
    const gpt4Summary = modelSummary.find(m => m.model === 'gpt-4');
    expect(gpt4Summary).toBeDefined();
    expect(gpt4Summary!.totalRequests).toBe(40);
    expect(gpt4Summary!.percentage).toBe(50);
    expect(gpt4Summary!.compliantRequests).toBe(35); // 20+15
    expect(gpt4Summary!.exceedingRequests).toBe(5);
    expect(gpt4Summary!.compliantPercentage).toBe(87.5); // 35/40 * 100
    expect(gpt4Summary!.exceedingPercentage).toBe(12.5); // 5/40 * 100
    
    // Coding Agent should have 25 requests = 31.25% of total
    const codingAgentSummary = modelSummary.find(m => m.model === 'coding-agent');
    expect(codingAgentSummary).toBeDefined();
    expect(codingAgentSummary!.totalRequests).toBe(25);
    expect(codingAgentSummary!.percentage).toBe(31.25);
    expect(codingAgentSummary!.compliantRequests).toBe(25);
    expect(codingAgentSummary!.exceedingRequests).toBe(0);
    expect(codingAgentSummary!.compliantPercentage).toBe(100);
    expect(codingAgentSummary!.exceedingPercentage).toBe(0);
    
    // GPT-3.5-turbo should have 15 requests = 18.75% of total
    const gpt35Summary = modelSummary.find(m => m.model === 'gpt-3.5-turbo');
    expect(gpt35Summary).toBeDefined();
    expect(gpt35Summary!.totalRequests).toBe(15);
    expect(gpt35Summary!.percentage).toBe(18.75);
    expect(gpt35Summary!.compliantRequests).toBe(0);
    expect(gpt35Summary!.exceedingRequests).toBe(15);
    expect(gpt35Summary!.compliantPercentage).toBe(0);
    expect(gpt35Summary!.exceedingPercentage).toBe(100);
  });

  it('should format percentages correctly for display', () => {
    expect(formatPercentage(75)).toBe('75.0%');
    expect(formatPercentage(25)).toBe('25.0%');
    expect(formatPercentage(31.25)).toBe('31.3%');
    expect(formatPercentage(87.5)).toBe('87.5%');
    expect(formatPercentage(12.5)).toBe('12.5%');
    expect(formatPercentage(18.75)).toBe('18.8%');
  });
});