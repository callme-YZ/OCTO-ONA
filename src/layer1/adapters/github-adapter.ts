/**
 * GitHub Adapter v2.0
 * 
 * Extracts network data from GitHub repositories using GraphQL API.
 * Uses BaseAdapter v2.0 (minimal interface) + NetworkGraphBuilder utility.
 */

import { BaseAdapter, AdapterConfig } from '../base-adapter-v2';
import { NetworkGraphBuilder } from '../network-graph-builder';
import { NetworkGraph, Message } from '../../layer2/models';

// GitHub API types
interface GitHubConfig extends AdapterConfig {
  token: string;    // Personal Access Token
  owner: string;    // Repository owner
  repo: string;     // Repository name
}

interface GitHubExtractionOptions {
  startTime: Date;
  endTime: Date;
  limit?: number;
}

interface GitHubUser {
  login: string;
  type: 'User' | 'Bot';
  name?: string;
}

interface GitHubIssue {
  number: number;
  title: string;
  author: GitHubUser;
  createdAt: string;
  comments: GitHubComment[];
}

interface GitHubComment {
  id: number;
  author: GitHubUser;
  body: string;
  createdAt: string;
}

/**
 * GitHub Adapter
 * 
 * @example
 * ```typescript
 * const adapter = new GitHubAdapter();
 * 
 * await adapter.connect({
 *   token: 'ghp_xxx',
 *   owner: 'facebook',
 *   repo: 'react',
 * });
 * 
 * const graph = await adapter.extractNetwork({
 *   startTime: new Date('2026-01-01'),
 *   endTime: new Date('2026-03-20'),
 * });
 * ```
 */
export class GitHubAdapter extends BaseAdapter {
  private token?: string;
  private owner?: string;
  private repo?: string;
  private apiUrl = 'https://api.github.com/graphql';
  
  async connect(config: GitHubConfig): Promise<void> {
    this.token = config.token;
    this.owner = config.owner;
    this.repo = config.repo;
    
    // Verify token
    const query = `{ viewer { login } }`;
    const response = await this.graphql(query);
    
    if (!response.data?.viewer) {
      throw new Error('GitHub auth failed');
    }
    
    console.log(`Connected to GitHub: ${this.owner}/${this.repo}`);
  }
  
  async extractNetwork(options: GitHubExtractionOptions): Promise<NetworkGraph> {
    if (!this.token || !this.owner || !this.repo) {
      throw new Error('Not connected. Call connect() first.');
    }
    
    console.log('Fetching GitHub data...');
    
    // 1. Fetch issues
    const issues = await this.fetchIssues(options);
    
    // 2. Extract users
    const rawUsers = this.extractUsers(issues);
    const { humans, bots } = NetworkGraphBuilder.separateUsers(rawUsers);
    
    // 3. Build edges using NetworkGraphBuilder
    const humanIds = new Set(humans.map(h => h.id));
    const botIds = new Set(bots.map(b => b.id));
    
    const simplifiedMessages = this.buildSimplifiedMessages(issues);
    const edges = NetworkGraphBuilder.buildEdges(simplifiedMessages, humanIds, botIds);
    
    // 4. Transform to Message objects
    const messages = this.transformToMessages(issues);
    
    // 5. Build NetworkGraph
    return NetworkGraphBuilder.build({
      graphId: `github_${this.owner}_${this.repo}_${Date.now()}`,
      description: `GitHub network from ${this.owner}/${this.repo}`,
      startTime: options.startTime,
      endTime: options.endTime,
      humans,
      bots,
      edges,
      messages,
    });
  }
  
  async disconnect(): Promise<void> {
    this.token = undefined;
    this.owner = undefined;
    this.repo = undefined;
    console.log('Disconnected from GitHub');
  }
  
  // ============================================
  // Private Methods
  // ============================================
  
  private async fetchIssues(options: GitHubExtractionOptions): Promise<GitHubIssue[]> {
    const query = `
      query($owner: String!, $repo: String!, $first: Int!) {
        repository(owner: $owner, name: $repo) {
          issues(first: $first, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes {
              number
              title
              author {
                login
                ... on User { name }
              }
              createdAt
              comments(first: 100) {
                nodes {
                  id
                  author {
                    login
                  }
                  body
                  createdAt
                }
              }
            }
          }
        }
      }
    `;
    
    const variables = {
      owner: this.owner,
      repo: this.repo,
      first: options.limit ?? 100,
    };
    
    const response = await this.graphql(query, variables);
    const issues: GitHubIssue[] = response.data?.repository?.issues?.nodes || [];
    
    // Add type information (GraphQL doesn't return it directly)
    for (const issue of issues) {
      issue.author.type = issue.author.login.endsWith('[bot]') ? 'Bot' : 'User';
      for (const comment of issue.comments) {
        comment.author.type = comment.author.login.endsWith('[bot]') ? 'Bot' : 'User';
      }
    }
    
    // Filter by date range
    return issues.filter(issue => {
      const createdAt = new Date(issue.createdAt);
      return createdAt >= options.startTime && createdAt <= options.endTime;
    });
  }
  
  private extractUsers(issues: GitHubIssue[]): Array<{
    id: string;
    name: string;
    is_bot: boolean;
  }> {
    const userMap = new Map<string, { id: string; name: string; is_bot: boolean }>();
    
    for (const issue of issues) {
      userMap.set(issue.author.login, {
        id: issue.author.login,
        name: issue.author.name || issue.author.login,
        is_bot: issue.author.type === 'Bot',
      });
      
      for (const comment of issue.comments) {
        userMap.set(comment.author.login, {
          id: comment.author.login,
          name: comment.author.login,
          is_bot: comment.author.type === 'Bot',
        });
      }
    }
    
    return Array.from(userMap.values());
  }
  
  private buildSimplifiedMessages(issues: GitHubIssue[]): Array<{
    id: string;
    from: string;
    to: string[];
    timestamp: Date;
  }> {
    const messages: Array<{
      id: string;
      from: string;
      to: string[];
      timestamp: Date;
    }> = [];
    
    for (const issue of issues) {
      // Issue creation (no direct target)
      messages.push({
        id: `issue_${issue.number}`,
        from: issue.author.login,
        to: [],
        timestamp: new Date(issue.createdAt),
      });
      
      // Comments (target = issue author)
      for (const comment of issue.comments) {
        messages.push({
          id: `comment_${comment.id}`,
          from: comment.author.login,
          to: [issue.author.login],
          timestamp: new Date(comment.createdAt),
        });
      }
    }
    
    return messages;
  }
  
  private transformToMessages(issues: GitHubIssue[]): Message[] {
    const messages: Message[] = [];
    
    for (const issue of issues) {
      messages.push({
        id: `issue_${issue.number}`,
        from_uid: issue.author.login,
        to_uids: [],
        content: issue.title,
        timestamp: new Date(issue.createdAt),
        platform: 'github',
        context_id: `${this.owner}/${this.repo}#${issue.number}`,
      });
      
      for (const comment of issue.comments) {
        messages.push({
          id: `comment_${comment.id}`,
          from_uid: comment.author.login,
          to_uids: [issue.author.login],
          content: comment.body,
          timestamp: new Date(comment.createdAt),
          platform: 'github',
          context_id: `${this.owner}/${this.repo}#${issue.number}`,
        });
      }
    }
    
    return messages;
  }
  
  private async graphql(query: string, variables?: any): Promise<any> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    return response.json();
  }
}
