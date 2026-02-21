import { Listing } from './listing';

export type MessageRole = 'user' | 'agent';

export type AgentStatus = 'idle' | 'thinking' | 'searching' | 'analyzing' | 'scheduling' | 'estimating' | 'error';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  status?: AgentStatus;
  listings?: Listing[];
  costEstimate?: CostEstimate;
  appointment?: AppointmentSuggestion;
}

export interface CostEstimate {
  moveIn: Record<string, number>;
  monthly: Record<string, number>;
  moving: Record<string, number>;
  grandTotal: number;
}

export interface AppointmentSuggestion {
  suggestedSlots: string[];
  draftEmail: string;
  draftSms: string;
}

export interface ChatState {
  messages: ChatMessage[];
  currentStatus: AgentStatus;
  isStreaming: boolean;
}

export type QuickAction = 'new-search' | 'view-saved' | 'appointments' | 'costs';
