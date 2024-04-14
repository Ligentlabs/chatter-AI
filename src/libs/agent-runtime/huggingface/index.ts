import { HfInference } from '@huggingface/inference';
import { HuggingFaceStream, StreamingTextResponse } from 'ai';

import {
  AgentRuntimeError,
  AgentRuntimeErrorType,
  ChatCompetitionOptions,
  ChatStreamPayload,
  LobeRuntimeAI,
  ModelProvider,
} from '@/libs/agent-runtime';

import { debugStream } from '../utils/debugStream';

export class LobeHuggingFaceAI implements LobeRuntimeAI {
  private client: HfInference;
  baseURL?: string;

  constructor({ apiKey }: { apiKey?: string }) {
    if (!apiKey)
      throw AgentRuntimeError.createError(AgentRuntimeErrorType.InvalidHuggingFaceAPIKey);

    this.client = new HfInference(apiKey);
  }

  async chat(payload: ChatStreamPayload, options?: ChatCompetitionOptions) {
    try {
      const hfStream = await this.client.textGenerationStream({
        inputs: payload.messages,
        model: payload.model,
        parameters: {
          temperature: payload.temperature,
          top_p: payload.top_p,
        },
        stream: true,
      });

      // Convert the response into a friendly text-stream

      const stream = HuggingFaceStream(hfStream, options?.callback);

      const [debug, output] = stream.tee();

      if (process.env.DEBUG_HUGGINGFACE_CHAT_COMPLETION === '1') {
        debugStream(debug).catch(console.error);
      }

      // Respond with the stream
      return new StreamingTextResponse(output, { headers: options?.headers });
    } catch (e) {
      const err = e as Error;

      const { errorType, error } = this.parseErrorMessage(err.message);

      throw AgentRuntimeError.chat({ error, errorType, provider: ModelProvider.Google });
    }
  }
}
