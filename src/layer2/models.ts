/**
 * OCTO-ONA Layer 2: Data Models
 * 
 * 5 core entities defined with Zod schemas:
 * 1. HumanNode - Human participant
 * 2. AIAgentNode - AI bot
 * 3. Edge - Network connection
 * 4. Message - Communication record
 * 5. NetworkGraph - Container for the network
 */

import { z } from 'zod';

// ============================================
// 1. HumanNode (人类节点)
// ============================================

export const HumanNodeSchema = z.object({
  // Basic identity
  id: z.string().describe("Node unique ID (usually UID)"),
  name: z.string().describe("Human name"),
  
  // Organizational attributes (for L1.5/L1.6)
  role: z.string().optional().describe("Role/position (for Leadership Distance)"),
  team: z.string().optional().describe("Team affiliation (for Silo Index)"),
  
  // Contact (optional)
  email: z.string().optional().describe("Email address"),
  timezone: z.string().optional().describe("Timezone"),
  
  // Connoisseurship metrics (Layer 3 annotations) - v1.3.0
  connoisseurshipDensity: z.number().optional().describe("Connoisseurship Density = connoisseurship messages / total sent"),
  connoisseurshipDrivingForce: z.number().optional().describe("Connoisseurship Driving Force = responded / total connoisseurships"),
  connoisseurshipSpan: z.number().optional().describe("Connoisseurship Span = unique lobsters engaged"),
  connoisseurshipPower: z.number().optional().describe("Connoisseurship Power = density × driving force × log2(span+1)"),
  socialCentrality: z.number().optional().describe("Social Centrality (formerly Hub Score) = mentions received / messages sent"),
  
  // Metadata
  type: z.literal("human").default("human").describe("Node type marker"),
  created_at: z.coerce.date().optional().describe("Account creation time"),
});

export type HumanNode = z.infer<typeof HumanNodeSchema>;

// ============================================
// 2. AIAgentNode (AI Bot节点)
// ============================================

export const AIAgentNodeSchema = z.object({
  // Basic identity
  id: z.string().describe("Bot unique ID"),
  bot_name: z.string().describe("Bot display name"),
  
  // Ownership (for T3 Human Agent tag)
  creator_uid: z.string().optional().describe("Creator UID"),
  
  // Capabilities
  capabilities: z.array(z.string()).default([]).describe("Capability tags"),
  
  // Functional tags (computed by Layer 4, T1-T8)
  functional_tags: z.array(z.string()).default([]).describe("Functional tags (T1-T8)"),
  
  // Performance (for T6 Fast Response tag)
  avg_response_time: z.number().optional().describe("Average response time (seconds)"),
  
  // Metadata
  type: z.literal("ai_agent").default("ai_agent").describe("Node type marker"),
  created_at: z.coerce.date().optional().describe("Bot creation time"),
});

export type AIAgentNode = z.infer<typeof AIAgentNodeSchema>;

// ============================================
// 3. Edge (网络边)
// ============================================

export const EdgeSchema = z.object({
  // Connection
  source: z.string().describe("Source node ID"),
  target: z.string().describe("Target node ID"),
  
  // Edge type (for human-AI collaboration analysis)
  edge_type: z.enum(["H2H", "H2B", "B2H", "B2B"]).describe("Edge type"),
  
  // Weight (message count, for T3)
  weight: z.number().int().min(1).default(1).describe("Edge weight (message count)"),
  
  // Cross-team marker (for L1.6 Silo Index)
  is_cross_team: z.boolean().default(false).describe("Is cross-team edge"),
  
  // Message details (optional, for deep analysis)
  message_ids: z.array(z.string()).default([]).describe("Message IDs on this edge"),
  
  // Metadata
  first_interaction: z.coerce.date().optional().describe("First interaction time"),
  last_interaction: z.coerce.date().optional().describe("Last interaction time"),
});

export type Edge = z.infer<typeof EdgeSchema>;

// ============================================
// 4. Message (消息)
// ============================================

/**
 * ONA Message Model - Beta v2.0
 * 
 * Design principles:
 * 1. Focus on interaction (who→who), not platform details
 * 2. Keep necessary traceability fields (optional)
 * 3. Simplicity first, extend when needed
 */
export const MessageSchema = z.object({
  // === Core: Interaction ===
  id: z.string().describe("Message unique ID"),
  from_uid: z.string().describe("Sender UID"),
  to_uids: z.array(z.string()).describe("Recipient UID list (may be multiple)"),
  
  // === Content ===
  content: z.string().describe("Message text content (for connoisseurship detection)"),
  timestamp: z.coerce.date().describe("Message send time"),
  
  // === Relationship chain ===
  reply_to: z.string().optional().describe("Reply to message ID (for response time)"),
  
  // === Auxiliary: Traceability (optional) ===
  platform: z.string().optional().describe("Source platform (dmwork/slack/discord)"),
  context_id: z.string().optional().describe("Context ID (channel/group, for aggregation)"),
  
  // === Layer 3 annotations (backfilled after analysis) ===
  is_connoisseurship: z.boolean().optional().describe("Is connoisseurship message (Layer 3 tag)"),
  connoisseurship_score: z.number().optional().describe("Connoisseurship score (rule-based)"),
});

export type Message = z.infer<typeof MessageSchema>;

/**
 * Get all participants (sender + receivers)
 */
export function getAllParticipants(message: Message): string[] {
  return [message.from_uid, ...message.to_uids];
}

// ============================================
// 5. NetworkGraph (网络图容器)
// ============================================

export const NetworkGraphSchema = z.object({
  // Basic info
  graph_id: z.string().describe("Graph ID (usually time range + team)"),
  description: z.string().describe("Graph description"),
  
  // Time range
  start_time: z.coerce.date().describe("Data start time"),
  end_time: z.coerce.date().describe("Data end time"),
  
  // Node lists
  human_nodes: z.array(HumanNodeSchema).default([]),
  ai_agent_nodes: z.array(AIAgentNodeSchema).default([]),
  
  // Edge list
  edges: z.array(EdgeSchema).default([]),
  
  // Message list (optional, may be large)
  messages: z.array(MessageSchema).optional().describe("Message list (optional storage)"),
  
  // Statistics summary
  summary: z.record(z.number()).default({}).describe("Statistics summary"),
  
  // Metadata
  created_at: z.coerce.date().default(() => new Date()),
  version: z.string().default("2.0").describe("Schema version"),
});

export type NetworkGraph = z.infer<typeof NetworkGraphSchema>;

// ============================================
// Helper functions
// ============================================

/**
 * Create an empty network graph
 */
export function createEmptyGraph(
  graphId: string,
  description: string,
  startTime: Date,
  endTime: Date
): NetworkGraph {
  return NetworkGraphSchema.parse({
    graph_id: graphId,
    description,
    start_time: startTime,
    end_time: endTime,
    human_nodes: [],
    ai_agent_nodes: [],
    edges: [],
    summary: {},
  });
}

/**
 * Get all nodes (humans + bots)
 */
export function getAllNodes(graph: NetworkGraph): Array<HumanNode | AIAgentNode> {
  return [...graph.human_nodes, ...graph.ai_agent_nodes];
}

/**
 * Get node by ID
 */
export function getNodeById(
  graph: NetworkGraph,
  nodeId: string
): HumanNode | AIAgentNode | undefined {
  return getAllNodes(graph).find(node => node.id === nodeId);
}

/**
 * Get node count summary
 */
export function getNodeSummary(graph: NetworkGraph): {
  total: number;
  humans: number;
  bots: number;
} {
  return {
    total: graph.human_nodes.length + graph.ai_agent_nodes.length,
    humans: graph.human_nodes.length,
    bots: graph.ai_agent_nodes.length,
  };
}
