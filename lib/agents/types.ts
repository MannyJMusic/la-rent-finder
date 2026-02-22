/**
 * Agent Layer Type Definitions
 *
 * This file defines the complete interface contract for the multi-agent
 * orchestration layer. The chat API route invokes the orchestrator with
 * an OrchestratorRequest and consumes an AsyncGenerator<StreamEvent>.
 *
 * ─── INTERFACE CONTRACT ───────────────────────────────────────────
 *
 * INVOCATION:
 *   const orchestrator = new OrchestratorAgent();
 *   for await (const event of orchestrator.invoke(request)) {
 *     // encode event as SSE and send to client
 *   }
 *
 * SSE EVENTS (StreamEvent.type):
 *   "status"         – Agent status change (thinking / searching / etc.)
 *   "message"        – Streamed text chunk
 *   "listings"       – Array of scored listing results
 *   "cost_estimate"  – Itemized cost breakdown
 *   "appointment"    – Appointment scheduling result
 *   "agent_handoff"  – Sub-agent delegation notification
 *   "error"          – Error during processing
 *   "done"           – Stream completed
 *
 * SUB-AGENT DELEGATION:
 *   Orchestrator classifies intent -> builds SubAgentContext ->
 *   calls subAgent.execute(context) -> yields sub-agent StreamEvents
 *
 * ──────────────────────────────────────────────────────────────────
 */

// ─── Intent Classification ──────────────────────────────────────

export type AgentIntent =
  | 'search'
  | 'refine'
  | 'schedule'
  | 'estimate'
  | 'save'
  | 'status'
  | 'general'
  | 'preferences';

// ─── Agent Status ───────────────────────────────────────────────

export type AgentStatusType =
  | 'idle'
  | 'thinking'
  | 'searching'
  | 'analyzing'
  | 'scheduling'
  | 'estimating'
  | 'error';

// ─── Orchestrator Request (how the chat API calls us) ───────────

export interface OrchestratorRequest {
  /** The user's message text */
  message: string;
  /** Authenticated user ID from Supabase auth */
  userId: string;
  /** Conversation ID for context continuity */
  conversationId: string;
  /** Recent chat history for context */
  chatHistory: ChatHistoryEntry[];
  /** User search/rental preferences (from user_preferences table) */
  preferences?: UserPreferencesData | null;
}

export interface ChatHistoryEntry {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Stream Events (what the orchestrator yields) ───────────────

export type StreamEvent =
  | StatusEvent
  | MessageEvent
  | ListingsEvent
  | CostEstimateEvent
  | AppointmentEvent
  | AgentHandoffEvent
  | ErrorEvent
  | DoneEvent;

export interface StatusEvent {
  type: 'status';
  status: AgentStatusType;
  agentName: string;
}

export interface MessageEvent {
  type: 'message';
  content: string;
  agentName: string;
}

export interface ListingsEvent {
  type: 'listings';
  listings: AgentListing[];
  agentName: string;
}

export interface CostEstimateEvent {
  type: 'cost_estimate';
  estimate: CostEstimateData;
  agentName: string;
}

export interface AppointmentEvent {
  type: 'appointment';
  appointment: AppointmentData;
  agentName: string;
}

export interface AgentHandoffEvent {
  type: 'agent_handoff';
  fromAgent: string;
  toAgent: string;
  reason: string;
}

export interface ErrorEvent {
  type: 'error';
  message: string;
  agentName: string;
  code?: string;
}

export interface DoneEvent {
  type: 'done';
  metadata?: Record<string, unknown>;
}

// ─── Sub-Agent Context (what the orchestrator passes to sub-agents) ──

export interface SubAgentContext {
  /** The user's original message */
  userMessage: string;
  /** The classified intent */
  intent: AgentIntent;
  /** Authenticated user ID */
  userId: string;
  /** Conversation ID */
  conversationId: string;
  /** Recent chat history */
  chatHistory: ChatHistoryEntry[];
  /** User preferences */
  preferences?: UserPreferencesData | null;
  /** Extracted entities/parameters from the orchestrator's parsing */
  extractedParams: ExtractedParams;
}

/** Parameters the orchestrator extracts from the user message via Claude */
export interface ExtractedParams {
  /** Neighborhoods mentioned */
  neighborhoods?: string[];
  /** Budget range */
  minBudget?: number;
  maxBudget?: number;
  /** Bedroom count */
  minBedrooms?: number;
  maxBedrooms?: number;
  /** Bathroom count */
  minBathrooms?: number;
  maxBathrooms?: number;
  /** Amenities requested */
  amenities?: string[];
  /** Whether pet-friendly is required */
  petFriendly?: boolean;
  /** Whether parking is required */
  parkingRequired?: boolean;
  /** Specific listing IDs referenced */
  listingIds?: string[];
  /** Requested date/time for scheduling */
  requestedDate?: string;
  requestedTime?: string;
  /** Free-form search query */
  searchQuery?: string;
  /** Property types requested (house, apartment, condo, townhouse, room) */
  propertyTypes?: string[];
}

// ─── Agent Configuration ────────────────────────────────────────

export interface AgentConfig {
  /** Display name for the agent */
  name: string;
  /** Claude model to use */
  model: string;
  /** System prompt for the agent */
  systemPrompt: string;
  /** Max tokens for the response */
  maxTokens: number;
  /** Temperature (0-1) */
  temperature: number;
  /** Timeout in milliseconds */
  timeoutMs: number;
}

// ─── Listing Types ──────────────────────────────────────────────

export interface AgentListing {
  id: string;
  title: string;
  address: string;
  location: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  square_feet: number | null;
  photos: string[];
  amenities: string[] | null;
  parking_available: boolean;
  pet_policy: string | null;
  available_date: string | null;
  score?: number;
  scoring?: ScoringResult;
  latitude: number | null;
  longitude: number | null;
  listing_url?: string | null;
  description?: string | null;
  source?: string;
  property_type?: string;
}

export interface ScoringResult {
  overall_score: number;
  price_score: number;
  location_score: number;
  size_score: number;
  amenity_score: number;
  quality_score: number;
  freshness_score?: number;
  source_reliability_score?: number;
  reasoning?: string;
  pros?: string[];
  cons?: string[];
}

// ─── Cost Estimate Types ────────────────────────────────────────

export interface CostEstimateData {
  listingId?: string;
  listingTitle?: string;
  monthlyRent: number;

  moveIn: {
    firstMonthRent: number;
    lastMonthRent: number;
    securityDeposit: number;
    petDeposit: number;
    applicationFee: number;
    brokerFee: number;
    total: number;
  };

  monthly: {
    rent: number;
    electricity: number;
    gas: number;
    water: number;
    internet: number;
    rentersInsurance: number;
    parkingFee: number;
    petRent: number;
    total: number;
  };

  moving: {
    movingCompany: number;
    truckRental: number;
    packingSupplies: number;
    storageCosts: number;
    total: number;
  };

  grandTotal: number;
  notes: string;
}

// ─── Appointment Types ──────────────────────────────────────────

export interface AppointmentData {
  listingId?: string;
  listingTitle?: string;
  suggestedSlots: TimeSlot[];
  draftEmail?: string;
  draftSms?: string;
  status: 'suggested' | 'confirmed' | 'pending';
}

export interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  available: boolean;
}

// ─── User Preferences ──────────────────────────────────────────

export interface UserPreferencesData {
  max_budget: number | null;
  min_budget: number | null;
  min_bedrooms: number;
  max_bedrooms: number | null;
  min_bathrooms: number;
  max_bathrooms: number | null;
  neighborhoods: string[];
  amenities: string[];
  pet_friendly: boolean | null;
  parking_required: boolean | null;
  furnished_preference: string | null;
  lease_duration_months: number | null;
  move_in_date: string | null;
  property_types: string[];
}

// ─── Legacy Compatibility ───────────────────────────────────────

/** @deprecated Use SubAgentContext instead */
export interface AgentContext {
  userId: string;
  message: string;
  intent: AgentIntent;
  chatHistory: ChatHistoryEntry[];
  userPreferences?: UserPreferencesData | null;
}

/** @deprecated Use StreamEvent instead — this flat shape is for simple cases */
export interface AgentResponse {
  text: string;
  listings?: AgentListing[];
  intent: AgentIntent;
}
