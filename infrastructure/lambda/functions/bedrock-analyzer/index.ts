/**
 * AWS Lambda: Bedrock Analyzer
 * Uses AWS Bedrock Claude for intelligent analysis
 * - Generates embeddings for semantic search
 * - Analyzes complaints for categorization
 * - Generates actionable summaries
 */

import { APIGatewayProxyEvent, Context, Handler } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Client } from '@elastic/elasticsearch';

// Initialize clients
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const esClient = new Client({
  cloud: { id: process.env.ES_CLOUD_ID! },
  auth: { apiKey: process.env.ES_API_KEY! },
});

const CLAUDE_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
const EMBEDDING_MODEL_ID = process.env.BEDROCK_EMBEDDING_MODEL || 'amazon.titan-embed-text-v1';

interface AnalysisRequest {
  action: 'analyze_complaint' | 'generate_embedding' | 'categorize' | 'summarize' | 'extract_entities';
  content: string;
  context?: Record<string, any>;
}

interface AnalysisResult {
  action: string;
  result: any;
  model_used: string;
  processed_at: string;
}

// Invoke Claude for text analysis
async function invokeClaude(prompt: string, systemPrompt?: string): Promise<string> {
  const messages = [
    { role: 'user', content: prompt },
  ];

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 2048,
    system: systemPrompt || 'You are an expert civic analyst helping analyze government complaints and civic issues in Bengaluru, India.',
    messages,
  };

  const response = await bedrockClient.send(new InvokeModelCommand({
    modelId: CLAUDE_MODEL_ID,
    body: JSON.stringify(payload),
    contentType: 'application/json',
    accept: 'application/json',
  }));

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return responseBody.content[0].text;
}

// Generate embeddings using Titan
async function generateEmbedding(text: string): Promise<number[]> {
  const payload = {
    inputText: text.slice(0, 8000), // Titan limit
  };

  const response = await bedrockClient.send(new InvokeModelCommand({
    modelId: EMBEDDING_MODEL_ID,
    body: JSON.stringify(payload),
    contentType: 'application/json',
    accept: 'application/json',
  }));

  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  return responseBody.embedding;
}

// Analyze a civic complaint
async function analyzeComplaint(content: string, context?: Record<string, any>): Promise<any> {
  const prompt = `
Analyze this civic complaint from Bengaluru and provide structured insights:

COMPLAINT:
${content}

${context ? `CONTEXT:\n${JSON.stringify(context, null, 2)}\n` : ''}

Please provide:
1. CATEGORY: Main category (e.g., Water, Electricity, Roads, Sanitation, Property Tax, Other)
2. SEVERITY: Low, Medium, High, or Critical
3. URGENCY: Immediate, Within Week, Within Month, Non-Urgent
4. DEPARTMENT: Most relevant government department (BESCOM, BWSSB, BBMP, etc.)
5. KEY_ISSUES: List of specific issues mentioned
6. AFFECTED_PARTIES: Who is affected
7. RECOMMENDED_ACTIONS: 2-3 specific actions to resolve
8. ESCALATION_REQUIRED: Yes/No with reason
9. SENTIMENT: Positive, Neutral, Negative, Frustrated

Respond in JSON format.
`;

  const response = await invokeClaude(prompt);

  try {
    // Try to parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { raw_analysis: response };
  } catch {
    return { raw_analysis: response };
  }
}

// Categorize content
async function categorizeContent(content: string): Promise<any> {
  const prompt = `
Categorize this civic content from Bengaluru:

CONTENT:
${content}

Respond with a JSON object containing:
{
  "primary_category": "category name",
  "secondary_categories": ["list", "of", "related"],
  "department": "relevant department",
  "priority": "low|medium|high|critical",
  "tags": ["relevant", "keywords"],
  "confidence": 0.0 to 1.0
}
`;

  const response = await invokeClaude(prompt);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { raw_categorization: response };
  } catch {
    return { raw_categorization: response };
  }
}

// Generate summary
async function summarizeContent(content: string, context?: Record<string, any>): Promise<any> {
  const prompt = `
Create a concise summary of these civic complaints/issues:

CONTENT:
${content}

${context?.count ? `Total complaints: ${context.count}\n` : ''}
${context?.department ? `Department: ${context.department}\n` : ''}
${context?.time_period ? `Time period: ${context.time_period}\n` : ''}

Provide:
1. EXECUTIVE_SUMMARY: 2-3 sentence overview
2. KEY_THEMES: Top 5 recurring themes
3. MOST_URGENT: Most critical issues needing immediate attention
4. PATTERNS: Any patterns observed (time, location, department)
5. RECOMMENDATIONS: 3 actionable recommendations
6. TREND: Improving, Stable, or Worsening

Respond in JSON format.
`;

  const response = await invokeClaude(prompt);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { raw_summary: response };
  } catch {
    return { raw_summary: response };
  }
}

// Extract entities
async function extractEntities(content: string): Promise<any> {
  const prompt = `
Extract named entities from this civic content from Bengaluru:

CONTENT:
${content}

Extract and return JSON with:
{
  "locations": [{"name": "place", "type": "ward|area|landmark|street"}],
  "departments": ["list of mentioned departments"],
  "officials": ["any official names/titles mentioned"],
  "dates": ["any dates mentioned"],
  "amounts": ["any monetary amounts"],
  "complaint_ids": ["any reference numbers"],
  "contact_info": ["phone numbers, emails mentioned"],
  "keywords": ["important keywords for searchability"]
}
`;

  const response = await invokeClaude(prompt);

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { raw_entities: response };
  } catch {
    return { raw_entities: response };
  }
}

// Store embedding in vector index
async function storeEmbedding(
  content: string,
  embedding: number[],
  metadata: Record<string, any>
): Promise<string> {
  const docId = `VEC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await esClient.index({
    index: 'civic-vectors',
    id: docId,
    document: {
      content: content.slice(0, 5000),
      embedding,
      ...metadata,
      created_at: new Date().toISOString(),
    },
  });

  return docId;
}

// Main handler
export const handler: Handler = async (event: APIGatewayProxyEvent, context: Context) => {
  console.log('Bedrock Analyzer invoked');

  try {
    const body: AnalysisRequest = typeof event.body === 'string'
      ? JSON.parse(event.body)
      : event.body || event;

    if (!body.content) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'content is required' }),
      };
    }

    let result: any;
    let modelUsed = CLAUDE_MODEL_ID;

    switch (body.action) {
      case 'analyze_complaint':
        result = await analyzeComplaint(body.content, body.context);
        break;

      case 'generate_embedding':
        modelUsed = EMBEDDING_MODEL_ID;
        const embedding = await generateEmbedding(body.content);

        // Optionally store in vector index
        if (body.context?.store) {
          const docId = await storeEmbedding(body.content, embedding, body.context.metadata || {});
          result = { embedding_dimensions: embedding.length, stored: true, doc_id: docId };
        } else {
          result = { embedding, dimensions: embedding.length };
        }
        break;

      case 'categorize':
        result = await categorizeContent(body.content);
        break;

      case 'summarize':
        result = await summarizeContent(body.content, body.context);
        break;

      case 'extract_entities':
        result = await extractEntities(body.content);
        break;

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: `Unknown action: ${body.action}`,
            supported_actions: ['analyze_complaint', 'generate_embedding', 'categorize', 'summarize', 'extract_entities'],
          }),
        };
    }

    const response: AnalysisResult = {
      action: body.action,
      result,
      model_used: modelUsed,
      processed_at: new Date().toISOString(),
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Bedrock analysis failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Analysis failed',
        message: (error as Error).message,
      }),
    };
  }
};
