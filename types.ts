export type MatrixEvent = {
    content: {
        body: string;
    },
    sender: string;
    room_id: string;
    type: string;
}

export const DAILY = "daily";
export const WEEKLY = "weekly";
export const MONTHLY = "monthly";
export const FREQUENCIES = [DAILY, WEEKLY, MONTHLY];

export type Email = { address: string; subject: string; text: string };

export type Frequency = typeof DAILY | typeof WEEKLY | typeof MONTHLY;

export type EmailPref = {
    room_id: string;
    email_address: string;
    frequency: Frequency;
}

interface ChatCompletionMessage {
    role: "assistant";
    content: string | null;
    refusal: string | null;
    annotations: unknown[] | null;
    audio: unknown | null;
    function_call: unknown | null;
    reasoning?: string | null; // vLLM reasoning models: the chain of thought
}

interface ChatCompletionChoice {
    index: number;
    message: ChatCompletionMessage;
    logprobs: unknown | null;
    finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | (string & {});
    stop_reason?: number | string | null; // vLLM extra
    token_ids?: number[] | null;
}

interface ChatCompletionUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens_details?: {
        cached_tokens: number;
        [key: string]: unknown;
    } | null;
    completion_tokens_details?: {
        reasoning_tokens?: number;
        [key: string]: unknown;
    } | null;
}

export interface ChatCompletionResponse {
    id: string;
    object: "chat.completion";
    created: number; // Unix time in seconds (not ms)
    model: string;
    choices: ChatCompletionChoice[];
    usage?: ChatCompletionUsage;
    service_tier?: string | null;
    system_fingerprint?: string | null;

    // vLLM-specific extras, safe to ignore
    prompt_logprobs?: unknown | null;
    prompt_token_ids?: number[] | null;
    prompt_text?: string | null;
    kv_transfer_params?: unknown | null;
    [key: string]: unknown;
}