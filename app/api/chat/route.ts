import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import {
  createOrchestrator,
  streamEventToSSE,
} from '@/lib/agents';
import type {
  OrchestratorRequest,
  StreamEvent,
  ChatHistoryEntry,
  UserPreferencesData,
} from '@/lib/agents';
import type { Json } from '@/lib/database.types';

// Helper to create SSE messages (used by mock fallback)
function createSSEMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Check whether the real agent layer can be used.
 * The Anthropic SDK reads ANTHROPIC_API_KEY from process.env automatically,
 * so we just check whether the env var is set.
 */
function isAgentLayerAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Agent status values
type AgentStatus = 'thinking' | 'searching' | 'analyzing' | 'scheduling' | 'estimating';

// SSE event type definitions
interface AgentStatusEvent {
  agent: string;
  status: AgentStatus;
}

interface MessageChunkEvent {
  content: string;
  done: false;
}

interface MessageCompleteEvent {
  content: string;
  done: true;
  metadata: {
    chat_id: string;
    message_id: string;
  };
}

interface ListingsUpdateEvent {
  listings: unknown[];
  total: number;
}

interface ErrorEvent {
  message: string;
  code: 'AUTH_REQUIRED' | 'INVALID_INPUT' | 'INTERNAL_ERROR' | 'DB_ERROR';
}

// Request body for POST
interface ChatRequestBody {
  message: string;
  chat_id?: string;
}

// Generate a simulated agent response based on message content
// This is a placeholder until the real agent layer is connected
function generateResponse(message: string): {
  response: string;
  statuses: AgentStatus[];
  includeListings: boolean;
} {
  const lower = message.toLowerCase();

  if (lower.includes('search') || lower.includes('find') || lower.includes('look')) {
    return {
      statuses: ['thinking', 'searching', 'analyzing'],
      includeListings: true,
      response:
        "I'd be happy to help you search for rental properties! To find the perfect place, I need a few details:\n\n1. What's your budget range?\n2. Which neighborhoods are you interested in?\n3. How many bedrooms do you need?\n4. Any specific amenities (parking, pets, etc.)?\n\nLet me know and I'll search for the best options!",
    };
  }

  if (lower.includes('saved') || lower.includes('favorite')) {
    return {
      statuses: ['thinking', 'searching'],
      includeListings: false,
      response:
        "Let me pull up your saved properties. You can view all your favorites in the Saved tab on the left. Would you like me to compare any of your saved listings or generate cost estimates for them?",
    };
  }

  if (lower.includes('appointment') || lower.includes('schedule') || lower.includes('viewing') || lower.includes('tour')) {
    return {
      statuses: ['thinking', 'scheduling'],
      includeListings: false,
      response:
        "I can help you schedule a property viewing! Please tell me:\n\n1. Which property are you interested in?\n2. What dates/times work for you?\n3. Any special requirements?\n\nI'll coordinate with the landlord to find the best time.",
    };
  }

  if (lower.includes('cost') || lower.includes('estimate') || lower.includes('budget') || lower.includes('afford')) {
    return {
      statuses: ['thinking', 'estimating'],
      includeListings: false,
      response:
        "Let me help you calculate rental costs! In LA, besides monthly rent, you should budget for:\n\n- Security deposit (usually 1-2 months rent)\n- First & last month's rent upfront\n- Application fees (~$30-50)\n- Moving costs ($1,000-2,000+)\n- Utilities (~$150-250/mo)\n- Renter's insurance (~$15-30/mo)\n\nWould you like me to create a detailed cost estimate for a specific listing?",
    };
  }

  if (lower.includes('email') || lower.includes('contact') || lower.includes('message') || lower.includes('call') || lower.includes('text')) {
    return {
      statuses: ['thinking', 'analyzing'],
      includeListings: false,
      response:
        "I can help you reach out to landlords! I can:\n\n- **Send an email** inquiry about a listing\n- **Send an SMS** to the contact number\n- **Initiate an AI phone call** to ask about availability\n\nWhich listing would you like to contact, and which method do you prefer?",
    };
  }

  return {
    statuses: ['thinking', 'analyzing'],
    includeListings: false,
    response:
      "I'm your LA Rental Finder assistant! I can help you with:\n\n- **Searching** for rental properties across LA\n- **Scheduling** property viewings and tours\n- **Estimating** move-in costs and monthly expenses\n- **Contacting** landlords via email, SMS, or AI calls\n- **Comparing** different listings side by side\n\nWhat would you like to do?",
  };
}

// ─── Helper: Load chat history from DB ──────────────────────────
async function loadChatHistory(
  chatId: string,
): Promise<ChatHistoryEntry[]> {
  try {
    const supabaseInner = await createClient();
    const { data: messages } = await supabaseInner
      .from('chat_messages')
      .select('role, content')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true })
      .limit(20); // Keep recent context manageable

    if (!messages) return [];
    return messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content as string,
    }));
  } catch {
    return [];
  }
}

// ─── Helper: Load user preferences from DB ──────────────────────
async function loadUserPreferences(
  userId: string,
): Promise<UserPreferencesData | null> {
  try {
    const supabaseInner = await createClient();
    const { data } = await supabaseInner
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) return null;
    return {
      max_budget: data.max_budget ?? null,
      min_budget: data.min_budget ?? null,
      min_bedrooms: data.min_bedrooms ?? 0,
      max_bedrooms: data.max_bedrooms ?? null,
      min_bathrooms: data.min_bathrooms ?? 0,
      max_bathrooms: data.max_bathrooms ?? null,
      neighborhoods: data.neighborhoods ?? [],
      amenities: data.amenities ?? [],
      pet_friendly: data.pet_friendly ?? null,
      parking_required: data.parking_required ?? null,
      furnished_preference: data.furnished_preference ?? null,
      lease_duration_months: data.lease_duration_months ?? null,
      move_in_date: data.move_in_date ?? null,
      property_types: data.property_types ?? [],
    };
  } catch {
    return null;
  }
}

// ─── Helper: Store assistant response in DB ─────────────────────
async function storeAssistantResponse(
  chatId: string,
  userId: string,
  userMessage: string,
  assistantContent: string,
  metadata: Record<string, Json | undefined> = {},
): Promise<string> {
  let assistantMsgId = 'unknown';
  try {
    const supabaseInner = await createClient();

    // Store the assistant message in chat_messages
    const { data: assistantMsg } = await supabaseInner
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        user_id: userId,
        role: 'assistant' as const,
        content: assistantContent,
        metadata,
      })
      .select()
      .single();

    if (assistantMsg) {
      assistantMsgId = assistantMsg.id;
    }

    // Also update the chats table's messages JSONB array
    const { data: chatData } = await supabaseInner
      .from('chats')
      .select('messages')
      .eq('id', chatId)
      .single();

    if (chatData) {
      const existingMessages = Array.isArray(chatData.messages) ? chatData.messages : [];
      const updatedMessages = [
        ...existingMessages,
        {
          role: 'user',
          content: userMessage,
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date().toISOString(),
        },
      ];

      await supabaseInner
        .from('chats')
        .update({ messages: updatedMessages })
        .eq('id', chatId);
    }
  } catch {
    // Non-fatal: continue even if DB storage fails
  }
  return assistantMsgId;
}

// ─── Real Agent Layer Stream ────────────────────────────────────
//
// Wraps the orchestrator's async generator so that we can:
//  1. Forward every StreamEvent to the client as SSE
//  2. Collect all `message` chunks to store in the DB afterward
//  3. Emit a final `done` event with chat/message metadata
//
function createAgentStream(
  generator: AsyncGenerator<StreamEvent>,
  chatId: string,
  userId: string,
  userMessage: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const messageChunks: string[] = [];
      const streamMetadata: Record<string, Json | undefined> = { source: 'agent_layer' };

      try {
        for await (const event of generator) {
          // Collect message content for DB storage
          if (event.type === 'message') {
            messageChunks.push(event.content);
          }

          // Track metadata from specific event types
          if (event.type === 'listings') {
            streamMetadata.included_listings = true;
            streamMetadata.listing_count = event.listings.length;
          }
          if (event.type === 'cost_estimate') {
            streamMetadata.included_cost_estimate = true;
          }
          if (event.type === 'appointment') {
            streamMetadata.included_appointment = true;
          }

          // Forward the event as SSE (skip the agent layer's own `done` —
          // we emit our own after DB storage)
          if (event.type === 'done') {
            continue;
          }

          controller.enqueue(encoder.encode(streamEventToSSE(event)));
        }

        // Store the complete assistant response in the DB
        const fullResponse = messageChunks.join('');
        let assistantMsgId = 'unknown';
        if (fullResponse.length > 0) {
          assistantMsgId = await storeAssistantResponse(
            chatId,
            userId,
            userMessage,
            fullResponse,
            streamMetadata,
          );
        }

        // Emit our own done event with DB metadata
        const doneEvent: StreamEvent = {
          type: 'done',
          metadata: {
            chat_id: chatId,
            message_id: assistantMsgId,
          },
        };
        controller.enqueue(encoder.encode(streamEventToSSE(doneEvent)));
      } catch (error) {
        console.error('Error in agent SSE stream:', error);
        const errEvent: StreamEvent = {
          type: 'error',
          message: error instanceof Error ? error.message : 'Internal server error during streaming',
          agentName: 'system',
          code: 'INTERNAL_ERROR',
        };
        controller.enqueue(encoder.encode(streamEventToSSE(errEvent)));
      } finally {
        controller.close();
      }
    },
  });
}

// ─── Mock Fallback Stream ───────────────────────────────────────
//
// The original mock response logic, used when ANTHROPIC_API_KEY is
// not configured or the agent layer fails to initialise.
//
function createMockStream(
  userMessage: string,
  chatId: string,
  userId: string,
): ReadableStream<Uint8Array> {
  const { response, statuses, includeListings } = generateResponse(userMessage);
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        // Emit agent status updates
        for (const status of statuses) {
          const statusEvent: AgentStatusEvent = {
            agent: 'orchestrator',
            status,
          };
          controller.enqueue(
            encoder.encode(createSSEMessage('agent_status', statusEvent))
          );
          await new Promise((resolve) => setTimeout(resolve, 400));
        }

        // If this is a search-like query, emit a listings_update event
        if (includeListings) {
          try {
            const supabaseInner = await createClient();
            const { data: listings } = await supabaseInner
              .from('apartments')
              .select('*')
              .order('availability_score', { ascending: false, nullsFirst: false })
              .limit(5);

            if (listings && listings.length > 0) {
              const listingsEvent: ListingsUpdateEvent = {
                listings,
                total: listings.length,
              };
              controller.enqueue(
                encoder.encode(createSSEMessage('listings_update', listingsEvent))
              );
            }
          } catch {
            // Non-fatal: skip listings update if it fails
          }
        }

        // Stream response word by word as message_chunk events
        const words = response.split(' ');
        for (let i = 0; i < words.length; i++) {
          const word = words[i] + (i < words.length - 1 ? ' ' : '');
          const chunkEvent: MessageChunkEvent = {
            content: word,
            done: false,
          };
          controller.enqueue(
            encoder.encode(createSSEMessage('message_chunk', chunkEvent))
          );
          await new Promise((resolve) => setTimeout(resolve, 30));
        }

        // Store assistant response in DB
        const assistantMsgId = await storeAssistantResponse(
          chatId,
          userId,
          userMessage,
          response,
          {
            source: 'mock',
            agent: 'orchestrator',
            included_listings: includeListings,
          },
        );

        // Emit message_complete
        const completeEvent: MessageCompleteEvent = {
          content: response,
          done: true,
          metadata: {
            chat_id: chatId,
            message_id: assistantMsgId,
          },
        };
        controller.enqueue(
          encoder.encode(createSSEMessage('message_complete', completeEvent))
        );

        controller.close();
      } catch (error) {
        console.error('Error in mock SSE stream:', error);
        const errEvent: ErrorEvent = {
          message: 'Internal server error during streaming',
          code: 'INTERNAL_ERROR',
        };
        controller.enqueue(
          encoder.encode(createSSEMessage('error', errEvent))
        );
        controller.close();
      }
    },
  });
}

// ─── POST Handler ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { message, chat_id } = body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json(
      { error: 'message is required and must be a non-empty string' },
      { status: 400 }
    );
  }

  // Resolve or create the chat session
  let resolvedChatId = chat_id || null;

  try {
    if (resolvedChatId) {
      // Verify the chat belongs to this user
      const { data: existingChat, error: chatError } = await supabase
        .from('chats')
        .select('id')
        .eq('id', resolvedChatId)
        .eq('user_id', user.id)
        .single();

      if (chatError || !existingChat) {
        resolvedChatId = null; // Will create a new one below
      }
    }

    if (!resolvedChatId) {
      // Create a new chat session
      const title = message.length > 60 ? message.substring(0, 57) + '...' : message;
      const { data: newChat, error: createError } = await supabase
        .from('chats')
        .insert({
          user_id: user.id,
          agent_type: 'orchestrator',
          title,
          messages: [],
          metadata: {},
        })
        .select()
        .single();

      if (createError || !newChat) {
        return NextResponse.json(
          { error: 'Failed to create chat session' },
          { status: 500 }
        );
      }

      resolvedChatId = newChat.id;
    }

    // Store the user message in chat_messages
    const { data: userMsg, error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: resolvedChatId,
        user_id: user.id,
        role: 'user' as const,
        content: message,
        metadata: {},
      })
      .select()
      .single();

    if (userMsgError) {
      console.error('Failed to store user message:', userMsgError);
      // Continue even if storing fails - don't block the response
    }
  } catch (err) {
    console.error('Error setting up chat:', err);
    // Continue - we still want to stream a response even if DB has issues
  }

  // Capture IDs for use in the stream closure
  const finalChatId = resolvedChatId || 'unknown';

  // ─── Try real agent layer first, fall back to mock ────────────
  let stream: ReadableStream<Uint8Array>;

  if (isAgentLayerAvailable()) {
    try {
      // Load chat history and user preferences in parallel
      const [chatHistory, preferences] = await Promise.all([
        loadChatHistory(finalChatId),
        loadUserPreferences(user.id),
      ]);

      // Build the OrchestratorRequest
      const orchestratorRequest: OrchestratorRequest = {
        message,
        userId: user.id,
        conversationId: finalChatId,
        chatHistory,
        preferences,
      };

      // Create orchestrator and invoke it
      const orchestrator = createOrchestrator();
      const agentGenerator = orchestrator.invoke(orchestratorRequest);

      // Wrap in our DB-storing stream
      stream = createAgentStream(agentGenerator, finalChatId, user.id, message);
    } catch (err) {
      // Agent layer failed to initialise — fall back to mock
      console.error('Agent layer failed, falling back to mock:', err);
      stream = createMockStream(message, finalChatId, user.id);
    }
  } else {
    // No API key configured — use mock responses
    stream = createMockStream(message, finalChatId, user.id);
  }

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// GET endpoint to retrieve chat history
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const chatId = searchParams.get('chat_id');

  try {
    if (chatId) {
      // Get a specific chat with its messages
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .eq('user_id', user.id)
        .single();

      if (chatError || !chat) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
      }

      // Get individual messages from chat_messages table
      const { data: messages, error: msgsError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (msgsError) {
        return NextResponse.json({ error: msgsError.message }, { status: 500 });
      }

      return NextResponse.json({
        chat,
        messages: messages || [],
      });
    } else {
      // List all chats for the user
      const { data: chats, error } = await supabase
        .from('chats')
        .select('id, agent_type, title, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ chats: chats || [] });
    }
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
