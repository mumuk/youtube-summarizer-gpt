// utils/costEstimator.js

/**
 * Estimates the cost of using OpenAI models based on input/output tokens.
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @param {string} model - Model type: 'gpt-3.5-turbo' or 'gpt-4-turbo'
 * @returns {object} - Cost in USD and breakdown
 */
export function estimateCost(inputTokens, outputTokens, model = 'gpt-3.5-turbo') {
  const pricing = {
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 }
  };

  const rates = pricing[model];
  if (!rates) throw new Error('Unsupported model');

  const inputCost = (inputTokens / 1000) * rates.input;
  const outputCost = (outputTokens / 1000) * rates.output;

  return {
    model,
    inputTokens,
    outputTokens,
    inputCost: +inputCost.toFixed(4),
    outputCost: +outputCost.toFixed(4),
    totalCost: +(inputCost + outputCost).toFixed(4)
  };
}