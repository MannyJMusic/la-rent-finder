/**
 * Agent Framework
 *
 * Provides the base agent abstraction, agent registry, streaming utilities,
 * and error/timeout handling that all agents share.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  AgentConfig,
  StreamEvent,
  SubAgentContext,
  AgentStatusType,
} from './types';

// ─── Anthropic Client Singleton ─────────────────────────────────

let _anthropicClient: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic();
    // The SDK reads ANTHROPIC_API_KEY from process.env automatically
  }
  return _anthropicClient;
}

// ─── Base Agent ─────────────────────────────────────────────────

/**
 * Abstract base class that every agent extends.
 *
 * Subclasses must implement `execute()`, which is an async generator
 * that yields StreamEvent objects. The framework handles timeout
 * wrapping, error boundaries, and status bookkeeping.
 */
export abstract class BaseAgent {
  readonly config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /** The agent's display name */
  get name(): string {
    return this.config.name;
  }

  /**
   * Core execution method that subclasses implement.
   * Yields StreamEvent objects that the orchestrator (or the API route)
   * forwards to the client as SSE frames.
   */
  abstract execute(context: SubAgentContext): AsyncGenerator<StreamEvent>;

  // ─── Helper: emit a status event ────────────────────────────

  protected statusEvent(status: AgentStatusType): StreamEvent {
    return { type: 'status', status, agentName: this.name };
  }

  // ─── Helper: emit a message chunk ──────────────────────────

  protected messageEvent(content: string): StreamEvent {
    return { type: 'message', content, agentName: this.name };
  }

  // ─── Helper: emit an error event ──────────────────────────

  protected errorEvent(message: string, code?: string): StreamEvent {
    return { type: 'error', message, agentName: this.name, code };
  }

  /**
   * Wraps execute() with a timeout. If the agent takes longer than
   * config.timeoutMs, the generator yields an error and returns.
   */
  async *executeWithTimeout(
    context: SubAgentContext,
  ): AsyncGenerator<StreamEvent> {
    const timeoutPromise = new Promise<'timeout'>((resolve) =>
      setTimeout(() => resolve('timeout'), this.config.timeoutMs),
    );

    // We use an inner async generator so we can race against it
    const gen = this.execute(context);
    let done = false;

    while (!done) {
      const nextPromise = gen.next();

      const result = await Promise.race([nextPromise, timeoutPromise]);

      if (result === 'timeout') {
        yield this.errorEvent(
          `Agent "${this.name}" timed out after ${this.config.timeoutMs}ms`,
          'AGENT_TIMEOUT',
        );
        // Attempt to clean up the generator
        await gen.return(undefined as unknown as StreamEvent);
        return;
      }

      const iterResult = result as IteratorResult<StreamEvent>;
      if (iterResult.done) {
        done = true;
      } else {
        yield iterResult.value;
      }
    }
  }

  /**
   * Wraps execute() with both timeout and an error boundary.
   * This is the preferred way the orchestrator invokes sub-agents.
   */
  async *safeExecute(context: SubAgentContext): AsyncGenerator<StreamEvent> {
    try {
      yield* this.executeWithTimeout(context);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unknown agent error';
      console.error(`[${this.name}] Error:`, err);
      yield this.errorEvent(message, 'AGENT_ERROR');
    }
  }
}

// ─── Agent Registry ─────────────────────────────────────────────

/**
 * A simple registry that maps agent names to agent instances.
 * The orchestrator uses this to look up which sub-agent to delegate to.
 */
class AgentRegistryImpl {
  private agents = new Map<string, BaseAgent>();

  register(agent: BaseAgent): void {
    this.agents.set(agent.name, agent);
  }

  get(name: string): BaseAgent | undefined {
    return this.agents.get(name);
  }

  has(name: string): boolean {
    return this.agents.has(name);
  }

  getAll(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  names(): string[] {
    return Array.from(this.agents.keys());
  }
}

export const AgentRegistry = new AgentRegistryImpl();

// ─── Streaming Utilities ────────────────────────────────────────

/**
 * Converts a StreamEvent into an SSE-formatted string.
 * The chat API route can use this directly to write to the response stream.
 */
export function streamEventToSSE(event: StreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/**
 * Creates a ReadableStream from an async generator of StreamEvents.
 * This is the bridge between our agent layer and Next.js Response streaming.
 *
 * Usage in an API route:
 *   const stream = createSSEStream(orchestrator.invoke(request));
 *   return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
 */
export function createSSEStream(
  generator: AsyncGenerator<StreamEvent>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of generator) {
          controller.enqueue(encoder.encode(streamEventToSSE(event)));
        }
        // Always close with a done event if the generator didn't
        controller.enqueue(
          encoder.encode(streamEventToSSE({ type: 'done' })),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Stream error';
        controller.enqueue(
          encoder.encode(
            streamEventToSSE({
              type: 'error',
              message,
              agentName: 'system',
            }),
          ),
        );
      } finally {
        controller.close();
      }
    },
  });
}

/**
 * Helper to stream text word-by-word with a small delay.
 * Gives the user a "typing" feel in the SSE stream.
 */
export async function* streamText(
  text: string,
  agentName: string,
  delayMs: number = 30,
): AsyncGenerator<StreamEvent> {
  const words = text.split(' ');
  for (let i = 0; i < words.length; i++) {
    const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
    yield { type: 'message', content: chunk, agentName };
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

// ─── Model Constants ────────────────────────────────────────────

export const MODELS = {
  /** Used for orchestrator intent parsing and complex reasoning */
  SONNET: 'claude-sonnet-4-5-20250929',
  /** Used for lightweight tasks like cost estimation */
  HAIKU: 'claude-haiku-4-5-20251001',
} as const;
