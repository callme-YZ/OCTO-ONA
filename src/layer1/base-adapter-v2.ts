/**
 * OCTO-ONA Layer 1: Base Data Adapter v2.0
 * 
 * Minimal abstract base class for data adapters.
 * Supports any data source type (database, API, file, etc.)
 * 
 * Use NetworkGraphBuilder utility for common graph construction tasks.
 */

import { NetworkGraph } from '../layer2/models';

/**
 * Adapter Configuration
 * 
 * Flexible configuration object for any adapter type.
 */
export interface AdapterConfig {
  [key: string]: any;
}

/**
 * BaseAdapter v2.0
 * 
 * Minimal interface with only 3 required methods:
 * - connect: Establish connection to data source
 * - extractNetwork: Extract and build NetworkGraph
 * - disconnect: Close connection and cleanup
 * 
 * @example
 * ```typescript
 * class MyAdapter extends BaseAdapter {
 *   async connect(config: any): Promise<void> {
 *     // Connect to your data source
 *   }
 *   
 *   async extractNetwork(options: any): Promise<NetworkGraph> {
 *     // Extract data and build graph
 *     // Optionally use NetworkGraphBuilder utilities
 *   }
 *   
 *   async disconnect(): Promise<void> {
 *     // Cleanup
 *   }
 * }
 * ```
 */
export abstract class BaseAdapter {
  /**
   * Connect to data source
   * 
   * @param config - Adapter-specific configuration
   */
  abstract connect(config: AdapterConfig): Promise<void>;
  
  /**
   * Extract network graph from data source
   * 
   * @param options - Extraction options (adapter-specific)
   * @returns NetworkGraph object
   */
  abstract extractNetwork(options: any): Promise<NetworkGraph>;
  
  /**
   * Disconnect from data source
   */
  abstract disconnect(): Promise<void>;
}
