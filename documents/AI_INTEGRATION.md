# AI Integration Guide

The application uses OpenRouter to provide AI-powered financial insights and analysis.

## Setting Up OpenRouter
1. Create an account at [OpenRouter.ai](https://openrouter.ai/).
2. Create an API Key in the dashboard.
3. Add the key to your `.env` file:
   ```env
   OPENROUTER_API_KEY=your_key_here
   ```

## Configuration Options
| Variable | Description | Default |
|---|---|---|
| `OPENROUTER_MODEL` | The model used for analysis | `anthropic/claude-3-haiku` |
| `OPENROUTER_MAX_TOKENS` | Max tokens per request | `2000` |
| `OPENROUTER_BASE_URL` | OpenRouter API endpoint | `https://openrouter.ai/api/v1` |

## Why OpenRouter?
OpenRouter acts as a unified gateway for multiple AI models. This allows us to:
- **Switch Models Instantly**: Change from Claude to GPT-4 by simply updating one environment variable.
- **Cost Efficiency**: Use cheaper models for routine analysis and premium models for deep insights.
- **High Availability**: Fallback options if a specific model provider is down.

## Data Privacy
The backend only sends anonymized financial data (amounts, categories, and dates) to the AI model. No personally identifiable information (PII) like names or account numbers is transmitted.
