/**
 * GitHub Adapter Tests (with Nock mocking)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import nock from 'nock';
import { GitHubAdapter } from '../src/layer1/adapters/github-adapter';

describe('GitHubAdapter', () => {
  beforeEach(() => {
    nock.cleanAll();
  });
  
  afterEach(() => {
    nock.cleanAll();
  });
  
  describe('connect', () => {
    it('should verify GitHub token successfully', async () => {
      // Mock GitHub GraphQL API
      nock('https://api.github.com')
        .post('/graphql')
        .reply(200, {
          data: {
            viewer: {
              login: 'testuser',
            },
          },
        });
      
      const adapter = new GitHubAdapter();
      
      await expect(
        adapter.connect({ token: 'ghp_test', owner: 'facebook', repo: 'react' })
      ).resolves.not.toThrow();
    });
    
    it('should throw error on invalid token', async () => {
      // Mock GitHub API - Unauthorized
      nock('https://api.github.com')
        .post('/graphql')
        .reply(401, { message: 'Bad credentials' });
      
      const adapter = new GitHubAdapter();
      
      await expect(
        adapter.connect({ token: 'invalid', owner: 'owner', repo: 'repo' })
      ).rejects.toThrow();
    });
  });
  
  describe('extractNetwork', () => {
    it('should extract network without errors', async () => {
      const adapter = new GitHubAdapter();
      
      // Mock: Verify token
      nock('https://api.github.com')
        .post('/graphql')
        .reply(200, {
          data: { viewer: { login: 'testuser' } },
        });
      
      await adapter.connect({ token: 'ghp_test', owner: 'facebook', repo: 'react' });
      
      // Mock: Fetch issues (empty response for simplicity)
      nock('https://api.github.com')
        .post('/graphql')
        .reply(200, {
          data: {
            repository: {
              issues: {
                edges: [],
                pageInfo: { hasNextPage: false },
              },
            },
          },
        });
      
      const graph = await adapter.extractNetwork({
        startTime: new Date('2026-01-01'),
        endTime: new Date('2026-01-02'),
      });
      
      await adapter.disconnect();
      
      expect(graph).toBeDefined();
      expect(graph.graph_id).toBeDefined();
      expect(graph.summary).toBeDefined();
    });
    
    it('should handle API errors gracefully', async () => {
      const adapter = new GitHubAdapter();
      
      nock('https://api.github.com')
        .post('/graphql')
        .reply(200, { data: { viewer: { login: 'test' } } });
      
      await adapter.connect({ token: 'ghp_test', owner: 'owner', repo: 'repo' });
      
      // Mock: API error
      nock('https://api.github.com')
        .post('/graphql')
        .reply(500, { message: 'Internal Server Error' });
      
      await expect(
        adapter.extractNetwork({
          startTime: new Date('2026-01-01'),
          endTime: new Date('2026-01-02'),
        })
      ).rejects.toThrow();
      
      await adapter.disconnect();
    });
  });
  
  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      const adapter = new GitHubAdapter();
      
      nock('https://api.github.com')
        .post('/graphql')
        .reply(200, { data: { viewer: { login: 'test' } } });
      
      await adapter.connect({ token: 'ghp_test', owner: 'owner', repo: 'repo' });
      
      await expect(adapter.disconnect()).resolves.not.toThrow();
    });
  });
});
