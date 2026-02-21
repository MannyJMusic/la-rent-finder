'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MessageBubble from './chat/MessageBubble';
import AgentStatusIndicator from './chat/AgentStatusIndicator';
import QuickActionButtons from './chat/QuickActionButtons';
import { ChatMessage, AgentStatus, QuickAction, CostEstimate, AppointmentSuggestion } from '@/lib/types/chat';
import { Listing } from '@/lib/types/listing';

interface ChatPanelProps {
  onListingsReceived?: (listings: Listing[]) => void;
  onCostEstimate?: (estimate: CostEstimate) => void;
  onAppointmentSuggestion?: (appointment: AppointmentSuggestion) => void;
}

export default function ChatPanel({
  onListingsReceived,
  onCostEstimate,
  onAppointmentSuggestion,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'agent',
      content:
        "Hi! I'm your LA Rent Finder assistant. How can I help you find your perfect rental today?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>('idle');
  const [chatId, setChatId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, agentStatus]);

  // Send message to API via POST with SSE streaming
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setAgentStatus('thinking');

    // Abort previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const agentMessageId = (Date.now() + 1).toString();
    let streamedContent = '';
    let messageCreated = false;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: content.trim(),
          ...(chatId ? { chat_id: chatId } : {}),
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Chat request failed (${response.status}): ${errorBody}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEventType = 'message'; // default SSE event type

      const processEvent = (eventType: string, data: string) => {
        if (!data.trim()) return;

        try {
          const parsed = JSON.parse(data);

          switch (eventType) {
            case 'status': {
              const status = parsed.status as AgentStatus;
              if (status) {
                setAgentStatus(status);
              }
              break;
            }

            case 'message': {
              streamedContent += parsed.content || '';

              if (!messageCreated) {
                messageCreated = true;
                setMessages((prev) => [
                  ...prev,
                  {
                    id: agentMessageId,
                    role: 'agent',
                    content: streamedContent,
                    timestamp: new Date(),
                  },
                ]);
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === agentMessageId
                      ? { ...m, content: streamedContent }
                      : m
                  )
                );
              }
              break;
            }

            case 'listings': {
              const listings: Listing[] = parsed.listings || [];
              if (listings.length > 0) {
                // Normalize image_url to imageUrl
                const normalizedListings = listings.map((l: Listing) => ({
                  ...l,
                  imageUrl: l.imageUrl || l.image_url,
                }));

                // Attach listings to the current message
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === agentMessageId
                      ? { ...m, listings: normalizedListings }
                      : m
                  )
                );

                // Emit listings to parent component
                onListingsReceived?.(normalizedListings);
              }
              break;
            }

            case 'cost_estimate': {
              const estimate: CostEstimate = parsed.estimate;
              if (estimate) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === agentMessageId
                      ? { ...m, costEstimate: estimate }
                      : m
                  )
                );
                onCostEstimate?.(estimate);
              }
              break;
            }

            case 'appointment': {
              const appointment: AppointmentSuggestion = parsed.appointment;
              if (appointment) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === agentMessageId
                      ? { ...m, appointment }
                      : m
                  )
                );
                onAppointmentSuggestion?.(appointment);
              }
              break;
            }

            case 'agent_handoff': {
              // Update status to show the handoff
              const toAgent = parsed.toAgent || '';
              if (toAgent) {
                // Map agent names to user-friendly statuses
                const agentStatusMap: Record<string, AgentStatus> = {
                  'market-researcher': 'searching',
                  'cost-estimator': 'estimating',
                  'scheduler': 'scheduling',
                  'orchestrator': 'thinking',
                };
                setAgentStatus(agentStatusMap[toAgent] || 'analyzing');
              }
              break;
            }

            case 'error': {
              const errorMessage = parsed.message || 'An error occurred';
              setAgentStatus('error');

              if (!messageCreated) {
                messageCreated = true;
                setMessages((prev) => [
                  ...prev,
                  {
                    id: agentMessageId,
                    role: 'agent',
                    content: `Error: ${errorMessage}`,
                    timestamp: new Date(),
                  },
                ]);
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === agentMessageId
                      ? { ...m, content: streamedContent + `\n\nError: ${errorMessage}` }
                      : m
                  )
                );
              }
              break;
            }

            case 'done': {
              // Extract chat_id from metadata if provided
              if (parsed.metadata?.chat_id) {
                setChatId(parsed.metadata.chat_id);
              }
              break;
            }
          }
        } catch (e) {
          // Non-JSON data line, ignore
          console.warn('Failed to parse SSE data:', data, e);
        }
      };

      // Read the SSE stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events (separated by double newlines)
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || ''; // Keep incomplete event in buffer

        for (const part of parts) {
          if (!part.trim()) continue;

          const lines = part.split('\n');
          let eventType = currentEventType;
          let data = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              data += line.slice(6);
            } else if (line.startsWith('data:')) {
              data += line.slice(5);
            }
          }

          if (data) {
            processEvent(eventType, data);
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        let eventType = currentEventType;
        let data = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            data += line.slice(6);
          } else if (line.startsWith('data:')) {
            data += line.slice(5);
          }
        }

        if (data) {
          processEvent(eventType, data);
        }
      }

      // Finalize
      setIsLoading(false);
      setAgentStatus('idle');

      // If no message content was received, add a fallback
      if (!messageCreated) {
        setMessages((prev) => [
          ...prev,
          {
            id: agentMessageId,
            role: 'agent',
            content: 'I processed your request but had no text response.',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Request was cancelled, don't show error
        return;
      }

      console.error('Error sending message:', error);
      setIsLoading(false);
      setAgentStatus('error');

      if (!messageCreated) {
        setMessages((prev) => [
          ...prev,
          {
            id: agentMessageId,
            role: 'agent',
            content:
              'Sorry, I encountered an error. Please try again.',
            timestamp: new Date(),
          },
        ]);
      }

      setTimeout(() => setAgentStatus('idle'), 3000);
    }
  };

  // Handle quick actions
  const handleQuickAction = (action: QuickAction) => {
    const actionMessages: Record<QuickAction, string> = {
      'new-search': 'I want to search for a new rental property',
      'view-saved': 'Show me my saved properties',
      'appointments': 'Show me my upcoming appointments',
      'costs': 'Help me calculate rental costs',
    };

    sendMessage(actionMessages[action]);
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card border-r">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Chat Assistant</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Ask me about rentals in LA
        </p>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Agent Status Indicator */}
        {agentStatus !== 'idle' && (
          <AgentStatusIndicator status={agentStatus} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Buttons */}
      <QuickActionButtons
        onAction={handleQuickAction}
        disabled={isLoading}
      />

      {/* Input Area */}
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !inputValue.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
