export interface Model {
  id: string;
  object: string;
  owned_by: string;
}

const DEFAULT_BASE_URL = 'http://localhost:1234/v1';

let baseUrl = DEFAULT_BASE_URL;

export function setBaseUrl(url: string) {
  baseUrl = url.replace(/\/+$/, '');
  if (!baseUrl.endsWith('/v1')) {
    baseUrl += '/v1';
  }
}

export function getBaseUrl(): string {
  return baseUrl;
}

export async function fetchAvailableModels(): Promise<Model[]> {
  try {
    const response = await fetch(`${baseUrl}/models`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch models:', error);
    throw new Error(
      'Could not connect to LM Studio. Make sure it is running with the local server started.'
    );
  }
}

export async function getAIMove(
  fen: string,
  moveHistory: string[],
  legalMoves: string[],
  modelId: string,
  color: 'white' | 'black',
  attempt: number = 1
): Promise<string> {
  const systemPrompt = `You are a grandmaster-level chess engine playing as ${color}. You will be given the current board position in FEN notation, the game's move history, and a complete list of all legal moves available to you.

CRITICAL RULES:
- Respond with ONLY a single move in Standard Algebraic Notation (SAN)
- The move MUST be exactly one from the provided list of legal moves
- Do NOT include any explanation, commentary, move numbers, or additional text
- Do NOT wrap the move in quotes or any formatting
- Just output the raw move string, nothing else

Example valid responses:
e4
Nf3
O-O
Bxe5+
Qxf7#`;

  let userPrompt: string;

  if (attempt === 1) {
    userPrompt = `Current position (FEN): ${fen}

Move history so far: ${moveHistory.length > 0 ? moveHistory.join(' ') : 'Game just started — no moves yet.'}

Your legal moves: ${legalMoves.join(', ')}

Play the strongest move. Respond with ONLY the move:`;
  } else if (attempt === 2) {
    userPrompt = `Position (FEN): ${fen}

Legal moves available to you: ${legalMoves.join(', ')}

WARNING: Your previous response was not recognized as a valid move. You MUST reply with EXACTLY one move from the list above. Nothing else — just the move.`;
  } else {
    // Last attempt — ultra simple
    userPrompt = `Choose ONE move from this list: ${legalMoves.join(', ')}

Reply with just the move. For example: ${legalMoves[Math.floor(Math.random() * Math.min(3, legalMoves.length))]}`;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: attempt === 1 ? 0.6 : 0.3,
      max_tokens: 4096,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`LM Studio API error: HTTP ${response.status}`);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  const content = (message?.content ?? '').trim();
  const reasoningContent = (message?.reasoning_content ?? '').trim();
  const finishReason = data.choices?.[0]?.finish_reason;

  console.log(
    `[${color}] Attempt ${attempt} | Model: ${modelId} | content: "${content}" | reasoning_len: ${reasoningContent.length} | finish_reason: ${finishReason}`
  );

  // 1. Try to extract from the actual content response (preferred)
  let move = extractMove(content, legalMoves);

  // 2. If content is empty (thinking models), extract from the END of reasoning_content
  //    The conclusion/chosen move is typically at the tail end of the reasoning chain
  if (!move && reasoningContent.length > 0) {
    // Try last 500 chars first (where conclusions are), then last 200 for more precision
    const tail500 = reasoningContent.slice(-500);
    const tail200 = reasoningContent.slice(-200);
    const lastLine = reasoningContent.split('\n').filter(l => l.trim()).pop() || '';

    move =
      extractMove(lastLine, legalMoves) ||
      extractMove(tail200, legalMoves) ||
      extractMove(tail500, legalMoves);

    if (move) {
      console.log(`[${color}] Extracted move "${move}" from reasoning_content tail`);
    }
  }

  if (move) {
    return move;
  }

  if (attempt < 5) {
    console.warn(
      `[${color}] Attempt ${attempt} failed. content="${content}", finish_reason=${finishReason}. Retrying...`
    );
    return getAIMove(fen, moveHistory, legalMoves, modelId, color, attempt + 1);
  }

  // Last resort: pick a random legal move rather than forfeiting
  // This keeps the game going even if the model completely fails to respond
  const fallbackMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
  console.warn(
    `[${color}] All 5 attempts failed. Using random fallback move: ${fallbackMove}`
  );
  return fallbackMove;
}

function extractMove(response: string, legalMoves: string[]): string | null {
  // Clean the response
  const cleaned = response
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '') // strip quotes
    .replace(/^#+\s*/, '') // strip markdown headers
    .replace(/^\d+\.\s*/, '') // strip move numbers like "1. "
    .replace(/^\.{3}\s*/, '') // strip "... " for black moves
    .replace(/[.!?]+$/, '') // strip trailing punctuation
    .trim();

  // 1. Direct exact match
  if (legalMoves.includes(cleaned)) {
    return cleaned;
  }

  // 2. Try first word/token
  const firstToken = cleaned.split(/\s+/)[0]?.replace(/[.,;:!?]+$/, '');
  if (firstToken && legalMoves.includes(firstToken)) {
    return firstToken;
  }

  // 3. Search for a legal move within the response
  // Sort by length descending to prefer longer (more specific) matches
  const sortedMoves = [...legalMoves].sort((a, b) => b.length - a.length);

  for (const move of sortedMoves) {
    const escaped = move.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[\\s,;:])${escaped}(?:[\\s,;:!?.]|$)`);
    if (regex.test(cleaned) || regex.test(response)) {
      return move;
    }
  }

  // 4. Last resort — substring check
  for (const move of sortedMoves) {
    if (move.length >= 2 && cleaned.includes(move)) {
      return move;
    }
  }

  return null;
}
