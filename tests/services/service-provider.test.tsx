/**
 * Test: Service Provider
 * Purpose: Integration tests for service dependency injection
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ServiceProvider, useServices, useCampaignService, useAdService } from '@/lib/services/service-provider';

describe('ServiceProvider', () => {
  it('should render provider', () => {
    const { container } = render(
      <ServiceProvider>
        <div>Test</div>
      </ServiceProvider>
    );

    expect(container).toBeTruthy();
  });

  it('should provide all service hooks', () => {
    let servicesAvailable = false;
    
    const TestComponent = () => {
      const services = useServices();
      servicesAvailable = !!services.campaignService;
      return <div>Test</div>;
    };

    render(
      <ServiceProvider>
        <TestComponent />
      </ServiceProvider>
    );

    expect(servicesAvailable).toBe(true);
  });

  it('should allow mock service injection', () => {
    const mockCampaignService = {
      createCampaign: {
        execute: vi.fn().mockResolvedValue({ success: true, data: { id: 'test' } })
      }
    } as never;

    let usedMock = false;
    
    const TestComponent = () => {
      const campaignService = useCampaignService();
      usedMock = campaignService === mockCampaignService;
      return <div>Test</div>;
    };

    render(
      <ServiceProvider services={{ campaignService: mockCampaignService }}>
        <TestComponent />
      </ServiceProvider>
    );

    expect(usedMock).toBe(true);
  });
});

