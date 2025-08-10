/**
 * Network Condition Simulation for Testing Module Loading System
 * Simulates various network conditions to test loading behavior
 */

export interface NetworkProfile {
  name: string;
  effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi';
  downlink: number; // Mbps
  uplink: number; // Mbps
  rtt: number; // Round trip time in ms
  packetLoss: number; // 0-1 probability
  jitter: number; // Variance in latency in ms
  reliability: number; // 0-1, connection stability
  description: string;
}

export interface NetworkEvent {
  type: 'disconnect' | 'reconnect' | 'slowdown' | 'speedup' | 'instability';
  at: number; // Time in ms from start
  duration?: number; // Duration in ms
  newProfile?: Partial<NetworkProfile>;
}

export interface NetworkTestScenario {
  name: string;
  description: string;
  initialProfile: NetworkProfile;
  events: NetworkEvent[];
  expectedBehavior: string[];
}

/**
 * Predefined network profiles for testing
 */
export const NETWORK_PROFILES: Record<string, NetworkProfile> = {
  OFFLINE: {
    name: 'Offline',
    effectiveType: 'slow-2g',
    downlink: 0,
    uplink: 0,
    rtt: Infinity,
    packetLoss: 1.0,
    jitter: 0,
    reliability: 0,
    description: 'No network connection'
  },

  SLOW_2G: {
    name: 'Slow 2G',
    effectiveType: 'slow-2g',
    downlink: 0.05, // 50 Kbps
    uplink: 0.025,
    rtt: 2000,
    packetLoss: 0.15,
    jitter: 500,
    reliability: 0.6,
    description: 'Very slow mobile connection'
  },

  EDGE_2G: {
    name: '2G Edge',
    effectiveType: '2g',
    downlink: 0.25, // 250 Kbps
    uplink: 0.1,
    rtt: 800,
    packetLoss: 0.05,
    jitter: 200,
    reliability: 0.8,
    description: 'Standard 2G connection'
  },

  SLOW_3G: {
    name: 'Slow 3G',
    effectiveType: '3g',
    downlink: 0.4, // 400 Kbps
    uplink: 0.2,
    rtt: 400,
    packetLoss: 0.02,
    jitter: 100,
    reliability: 0.85,
    description: 'Slow 3G mobile connection'
  },

  REGULAR_3G: {
    name: 'Regular 3G',
    effectiveType: '3g',
    downlink: 1.5, // 1.5 Mbps
    uplink: 0.5,
    rtt: 200,
    packetLoss: 0.01,
    jitter: 50,
    reliability: 0.9,
    description: 'Standard 3G mobile connection'
  },

  FAST_3G: {
    name: 'Fast 3G',
    effectiveType: '3g',
    downlink: 3.0, // 3 Mbps
    uplink: 1.0,
    rtt: 150,
    packetLoss: 0.005,
    jitter: 25,
    reliability: 0.92,
    description: 'Fast 3G or HSPA+ connection'
  },

  SLOW_4G: {
    name: 'Slow 4G',
    effectiveType: '4g',
    downlink: 5.0, // 5 Mbps
    uplink: 2.0,
    rtt: 100,
    packetLoss: 0.002,
    jitter: 15,
    reliability: 0.95,
    description: 'Slow 4G LTE connection'
  },

  REGULAR_4G: {
    name: 'Regular 4G',
    effectiveType: '4g',
    downlink: 25.0, // 25 Mbps
    uplink: 10.0,
    rtt: 50,
    packetLoss: 0.001,
    jitter: 10,
    reliability: 0.97,
    description: 'Standard 4G LTE connection'
  },

  FAST_4G: {
    name: 'Fast 4G',
    effectiveType: '4g',
    downlink: 50.0, // 50 Mbps
    uplink: 25.0,
    rtt: 30,
    packetLoss: 0.0005,
    jitter: 5,
    reliability: 0.98,
    description: 'Fast 4G+ or LTE-A connection'
  },

  WIFI_SLOW: {
    name: 'Slow WiFi',
    effectiveType: 'wifi',
    downlink: 2.0, // 2 Mbps
    uplink: 1.0,
    rtt: 80,
    packetLoss: 0.01,
    jitter: 20,
    reliability: 0.9,
    description: 'Slow or congested WiFi'
  },

  WIFI_REGULAR: {
    name: 'Regular WiFi',
    effectiveType: 'wifi',
    downlink: 25.0, // 25 Mbps
    uplink: 10.0,
    rtt: 20,
    packetLoss: 0.001,
    jitter: 5,
    reliability: 0.98,
    description: 'Standard home WiFi'
  },

  WIFI_FAST: {
    name: 'Fast WiFi',
    effectiveType: 'wifi',
    downlink: 100.0, // 100 Mbps
    uplink: 50.0,
    rtt: 10,
    packetLoss: 0.0001,
    jitter: 2,
    reliability: 0.99,
    description: 'Fast WiFi or fiber connection'
  }
};

/**
 * Network Condition Simulator
 */
export class NetworkSimulator {
  private currentProfile: NetworkProfile;
  private startTime: number = Date.now();
  private events: NetworkEvent[] = [];
  private activeSimulation: NodeJS.Timeout | null = null;
  private eventHistory: Array<{
    timestamp: number;
    event: NetworkEvent;
    profileBefore: NetworkProfile;
    profileAfter: NetworkProfile;
  }> = [];

  constructor(initialProfile: NetworkProfile = NETWORK_PROFILES.WIFI_REGULAR) {
    this.currentProfile = { ...initialProfile };
  }

  /**
   * Start network simulation with events
   */
  startSimulation(events: NetworkEvent[]): void {
    this.events = [...events].sort((a, b) => a.at - b.at);
    this.startTime = Date.now();
    this.eventHistory = [];

    this.scheduleNextEvent();
  }

  /**
   * Stop active simulation
   */
  stopSimulation(): void {
    if (this.activeSimulation) {
      clearTimeout(this.activeSimulation);
      this.activeSimulation = null;
    }
    this.events = [];
  }

  /**
   * Get current network profile
   */
  getCurrentProfile(): NetworkProfile {
    return { ...this.currentProfile };
  }

  /**
   * Update Navigator.connection API to match current profile
   */
  updateNavigatorConnection(): void {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      
      Object.assign(connection, {
        effectiveType: this.currentProfile.effectiveType,
        downlink: this.currentProfile.downlink,
        rtt: this.currentProfile.rtt,
        saveData: this.currentProfile.downlink < 1 // Enable save data for slow connections
      });

      // Dispatch connection change event
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new Event('online'));
      }
    }

    // Update online status
    if (typeof navigator !== 'undefined') {
      Object.defineProperty(navigator, 'onLine', {
        value: this.currentProfile.reliability > 0,
        configurable: true
      });
    }
  }

  /**
   * Simulate network delay based on current profile
   */
  async simulateNetworkDelay(bytes: number = 1024): Promise<void> {
    const profile = this.currentProfile;
    
    // Calculate base delay from RTT
    let delay = profile.rtt / 2;

    // Add transfer time based on data size and bandwidth
    if (profile.downlink > 0) {
      const transferTime = (bytes * 8) / (profile.downlink * 1024 * 1024) * 1000; // Convert to ms
      delay += transferTime;
    }

    // Add jitter
    if (profile.jitter > 0) {
      const jitterVariation = (Math.random() - 0.5) * 2 * profile.jitter;
      delay += jitterVariation;
    }

    // Simulate packet loss
    if (Math.random() < profile.packetLoss) {
      throw new Error(`Network packet loss (simulated)`);
    }

    // Simulate connection instability
    if (Math.random() > profile.reliability) {
      throw new Error(`Network connection unstable (simulated)`);
    }

    await this.delay(Math.max(0, delay));
  }

  /**
   * Check if current network conditions support preloading
   */
  shouldEnablePreloading(): boolean {
    return this.currentProfile.downlink >= 1.0 && // At least 1 Mbps
           this.currentProfile.reliability >= 0.8 && // Reliable connection
           this.currentProfile.packetLoss <= 0.01; // Low packet loss
  }

  /**
   * Get recommended timeout based on network conditions
   */
  getRecommendedTimeout(baseTimeout: number = 5000): number {
    const profile = this.currentProfile;
    
    // Increase timeout for slower connections
    let multiplier = 1;
    
    if (profile.downlink < 0.5) {
      multiplier = 4; // Very slow
    } else if (profile.downlink < 1.0) {
      multiplier = 3; // Slow
    } else if (profile.downlink < 3.0) {
      multiplier = 2; // Medium
    } else if (profile.downlink < 10.0) {
      multiplier = 1.5; // Good
    }
    
    // Adjust for reliability and packet loss
    if (profile.reliability < 0.9) {
      multiplier *= 1.5;
    }
    if (profile.packetLoss > 0.01) {
      multiplier *= 1.3;
    }
    
    return Math.min(baseTimeout * multiplier, 30000); // Cap at 30 seconds
  }

  /**
   * Get network quality assessment
   */
  getNetworkQuality(): 'excellent' | 'good' | 'fair' | 'poor' | 'offline' {
    const profile = this.currentProfile;
    
    if (profile.downlink === 0 || profile.reliability === 0) {
      return 'offline';
    }
    
    const score = 
      (profile.downlink / 25) * 0.4 + // Bandwidth (normalized to 25 Mbps)
      (Math.max(0, 200 - profile.rtt) / 200) * 0.3 + // Latency (normalized to 200ms)
      profile.reliability * 0.2 + // Reliability
      (Math.max(0, 0.05 - profile.packetLoss) / 0.05) * 0.1; // Packet loss
    
    if (score >= 0.8) return 'excellent';
    if (score >= 0.6) return 'good';
    if (score >= 0.4) return 'fair';
    return 'poor';
  }

  /**
   * Generate test scenarios for different network conditions
   */
  static generateTestScenarios(): NetworkTestScenario[] {
    return [
      {
        name: 'Stable Fast Connection',
        description: 'Test with consistently good network conditions',
        initialProfile: NETWORK_PROFILES.WIFI_FAST,
        events: [],
        expectedBehavior: [
          'All modules should load within 3 seconds',
          'Preloading should be enabled',
          'No network warnings should appear'
        ]
      },

      {
        name: 'Gradual Network Degradation',
        description: 'Start with good connection that gradually degrades',
        initialProfile: NETWORK_PROFILES.REGULAR_4G,
        events: [
          {
            type: 'slowdown',
            at: 5000,
            newProfile: { downlink: 5, rtt: 150 }
          },
          {
            type: 'slowdown',
            at: 10000,
            newProfile: { downlink: 1, rtt: 400 }
          },
          {
            type: 'slowdown',
            at: 15000,
            newProfile: { downlink: 0.25, rtt: 1000 }
          }
        ],
        expectedBehavior: [
          'System should adapt timeouts as network degrades',
          'Preloading should be disabled on slow connections',
          'Slow network warnings should appear'
        ]
      },

      {
        name: 'Intermittent Connectivity',
        description: 'Connection goes offline and comes back',
        initialProfile: NETWORK_PROFILES.REGULAR_3G,
        events: [
          {
            type: 'disconnect',
            at: 3000,
            duration: 2000
          },
          {
            type: 'reconnect',
            at: 5000
          },
          {
            type: 'disconnect',
            at: 10000,
            duration: 1000
          },
          {
            type: 'reconnect',
            at: 11000
          }
        ],
        expectedBehavior: [
          'System should detect offline state',
          'Cache should be used when offline',
          'Retry attempts should resume when connection restored'
        ]
      },

      {
        name: 'Network Instability',
        description: 'Frequent connection quality changes',
        initialProfile: NETWORK_PROFILES.SLOW_3G,
        events: [
          { type: 'instability', at: 1000, duration: 15000 }
        ],
        expectedBehavior: [
          'System should handle frequent connection changes',
          'Error recovery should be robust',
          'Performance should degrade gracefully'
        ]
      },

      {
        name: 'Peak Hours Congestion',
        description: 'Simulate network congestion during peak usage',
        initialProfile: NETWORK_PROFILES.WIFI_REGULAR,
        events: [
          {
            type: 'slowdown',
            at: 2000,
            newProfile: { 
              downlink: 2,
              rtt: 200,
              packetLoss: 0.03,
              jitter: 100 
            }
          }
        ],
        expectedBehavior: [
          'System should adapt to increased latency',
          'Retry mechanisms should handle packet loss',
          'User should be notified of degraded performance'
        ]
      },

      {
        name: 'Mobile Data Limitations',
        description: 'Simulate mobile data with save-data preference',
        initialProfile: {
          ...NETWORK_PROFILES.REGULAR_4G,
          description: 'Mobile data with save-data enabled'
        },
        events: [],
        expectedBehavior: [
          'System should respect save-data preference',
          'Preloading should be limited or disabled',
          'Module sizes should be optimized'
        ]
      }
    ];
  }

  /**
   * Create a test helper for network simulation
   */
  static createTestHelper() {
    return {
      /**
       * Test module loading under specific network profile
       */
      async testWithProfile(
        profile: NetworkProfile,
        testFn: (simulator: NetworkSimulator) => Promise<void>
      ): Promise<void> {
        const simulator = new NetworkSimulator(profile);
        simulator.updateNavigatorConnection();
        
        try {
          await testFn(simulator);
        } finally {
          simulator.stopSimulation();
        }
      },

      /**
       * Test module loading with network scenario
       */
      async testWithScenario(
        scenario: NetworkTestScenario,
        testFn: (simulator: NetworkSimulator) => Promise<void>
      ): Promise<void> {
        const simulator = new NetworkSimulator(scenario.initialProfile);
        simulator.updateNavigatorConnection();
        simulator.startSimulation(scenario.events);
        
        try {
          await testFn(simulator);
        } finally {
          simulator.stopSimulation();
        }
      },

      /**
       * Benchmark loading performance across different network profiles
       */
      async benchmarkProfiles(
        profiles: NetworkProfile[],
        testFn: (simulator: NetworkSimulator) => Promise<number>
      ): Promise<Record<string, number>> {
        const results: Record<string, number> = {};
        
        for (const profile of profiles) {
          const simulator = new NetworkSimulator(profile);
          simulator.updateNavigatorConnection();
          
          try {
            const result = await testFn(simulator);
            results[profile.name] = result;
          } catch (error) {
            results[profile.name] = -1; // Indicate failure
          } finally {
            simulator.stopSimulation();
          }
        }
        
        return results;
      }
    };
  }

  // Private methods

  private scheduleNextEvent(): void {
    if (this.events.length === 0) return;

    const nextEvent = this.events.shift()!;
    const currentTime = Date.now() - this.startTime;
    const delayMs = Math.max(0, nextEvent.at - currentTime);

    this.activeSimulation = setTimeout(() => {
      this.executeEvent(nextEvent);
      this.scheduleNextEvent();
    }, delayMs);
  }

  private executeEvent(event: NetworkEvent): void {
    const profileBefore = { ...this.currentProfile };

    switch (event.type) {
      case 'disconnect':
        this.currentProfile = { ...NETWORK_PROFILES.OFFLINE };
        break;
        
      case 'reconnect':
        // Restore to a reasonable connection
        this.currentProfile = { ...NETWORK_PROFILES.REGULAR_3G };
        break;
        
      case 'slowdown':
      case 'speedup':
        if (event.newProfile) {
          Object.assign(this.currentProfile, event.newProfile);
        }
        break;
        
      case 'instability':
        // Randomly vary connection quality
        this.startInstabilityPeriod(event.duration || 10000);
        break;
    }

    const profileAfter = { ...this.currentProfile };

    this.eventHistory.push({
      timestamp: Date.now(),
      event,
      profileBefore,
      profileAfter
    });

    this.updateNavigatorConnection();
  }

  private startInstabilityPeriod(duration: number): void {
    const instabilityEnd = Date.now() + duration;
    const originalProfile = { ...this.currentProfile };

    const varyConnection = () => {
      if (Date.now() > instabilityEnd) {
        this.currentProfile = originalProfile;
        this.updateNavigatorConnection();
        return;
      }

      // Randomly vary connection parameters
      this.currentProfile.downlink = Math.max(0.1, 
        originalProfile.downlink * (0.5 + Math.random()));
      this.currentProfile.rtt = originalProfile.rtt * (0.8 + Math.random() * 0.4);
      this.currentProfile.packetLoss = Math.min(0.1, 
        originalProfile.packetLoss * (1 + Math.random()));

      this.updateNavigatorConnection();

      // Schedule next variation
      setTimeout(varyConnection, 1000 + Math.random() * 2000);
    };

    varyConnection();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default NetworkSimulator;