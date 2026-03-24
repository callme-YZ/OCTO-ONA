/**
 * Database Type Definitions
 */

// ============================================
// Data Source Types
// ============================================

export interface DataSource {
  id: string;
  type: 'discord' | 'dmwork' | 'github';
  name: string;
  config: any; // JSON config (encrypted)
  created_at?: Date;
  updated_at?: Date;
}

// ============================================
// User Types
// ============================================

export interface User {
  uid: string; // format: {source_id}:{source_user_id}
  source_id: string;
  source_user_id: string;
  name?: string;
  display_name?: string;
  is_bot: boolean;
  metadata?: any; // JSON
  created_at?: Date;
  updated_at?: Date;
}

// ============================================
// Channel Types
// ============================================

export interface Channel {
  channel_id: string; // format: {source_id}:{source_channel_id}
  source_id: string;
  source_channel_id: string;
  name?: string;
  type: 'dm' | 'group' | 'channel' | 'repository';
  metadata?: any; // JSON
  created_at?: Date;
  updated_at?: Date;
}

// ============================================
// Message Types
// ============================================

export interface Message {
  message_id: string; // format: {source_id}:{source_message_id}
  source_id: string;
  source_message_id: string;
  channel_id: string;
  from_uid: string;
  content?: string;
  timestamp: number; // Unix timestamp (seconds)
  reply_to_message_id?: string;
  reply_to_uid?: string;
  mentioned_uids?: string[]; // Array of UIDs
  metadata?: any; // JSON
  created_at?: Date;
}

// ============================================
// Sync Metadata Types
// ============================================

export interface SyncMetadata {
  id?: number;
  source_id: string;
  last_sync_at: Date;
  sync_status: 'success' | 'partial' | 'failed';
  messages_synced?: number;
  users_synced?: number;
  channels_synced?: number;
  error_message?: string;
  created_at?: Date;
}

// ============================================
// Query Filters
// ============================================

export interface MessageQueryFilters {
  source_id?: string;
  channel_ids?: string[];
  from_uid?: string;
  start_time?: number; // Unix timestamp
  end_time?: number; // Unix timestamp
  has_reply?: boolean;
  has_mentions?: boolean;
  limit?: number;
  offset?: number;
}

export interface UserQueryFilters {
  source_id?: string;
  is_bot?: boolean;
  name_like?: string;
  limit?: number;
  offset?: number;
}

export interface ChannelQueryFilters {
  source_id?: string;
  type?: 'dm' | 'group' | 'channel' | 'repository';
  name_like?: string;
  limit?: number;
  offset?: number;
}
