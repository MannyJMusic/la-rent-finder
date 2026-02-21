/**
 * Agent Layer - Barrel Export
 *
 * Usage by the chat API route:
 *
 *   import { createOrchestrator, createSSEStream } from '@/lib/agents';
 *   import type { OrchestratorRequest } from '@/lib/agents';
 *
 *   const orchestrator = createOrchestrator();
 *   const request: OrchestratorRequest = { message, userId, conversationId, chatHistory, preferences };
 *   const stream = createSSEStream(orchestrator.invoke(request));
 *   return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
 */

// ─── Types ──────────────────────────────────────────────────────

export type {
  // Core request/response
  OrchestratorRequest,
  StreamEvent,
  SubAgentContext,
  ChatHistoryEntry,
  ExtractedParams,

  // Event types
  StatusEvent,
  MessageEvent,
  ListingsEvent,
  CostEstimateEvent,
  AppointmentEvent,
  AgentHandoffEvent,
  ErrorEvent,
  DoneEvent,

  // Data types
  AgentListing,
  ScoringResult,
  CostEstimateData,
  AppointmentData,
  TimeSlot,
  UserPreferencesData,

  // Configuration
  AgentConfig,
  AgentIntent,
  AgentStatusType,

  // Legacy
  AgentContext,
  AgentResponse,
} from './types';

// ─── Framework ──────────────────────────────────────────────────

export {
  BaseAgent,
  AgentRegistry,
  getAnthropicClient,
  createSSEStream,
  streamEventToSSE,
  streamText,
  MODELS,
} from './framework';

// ─── Agent Classes ──────────────────────────────────────────────

export { OrchestratorAgent } from './orchestrator';
export { MarketResearcherAgent } from './market-researcher';
export { CostEstimatorAgent } from './cost-estimator';
export { AppointmentSchedulerAgent } from './scheduler';

// ─── Factory Function ───────────────────────────────────────────

import { AgentRegistry } from './framework';
import { OrchestratorAgent } from './orchestrator';
import { MarketResearcherAgent } from './market-researcher';
import { CostEstimatorAgent } from './cost-estimator';
import { AppointmentSchedulerAgent } from './scheduler';

let _initialized = false;

/**
 * Registers all sub-agents in the AgentRegistry and returns a
 * ready-to-use OrchestratorAgent instance.
 *
 * Safe to call multiple times - agents are only registered once.
 */
export function createOrchestrator(): OrchestratorAgent {
  if (!_initialized) {
    // Register sub-agents so the orchestrator can find them
    AgentRegistry.register(new MarketResearcherAgent());
    AgentRegistry.register(new CostEstimatorAgent());
    AgentRegistry.register(new AppointmentSchedulerAgent());
    _initialized = true;
  }

  return new OrchestratorAgent();
}
