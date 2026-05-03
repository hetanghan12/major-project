/**
 * OpenAI Configuration
 * =====================
 * Configures OpenAI client for embeddings and LLM operations.
 * 
 * @author College Project
 */

const OpenAI = require('openai');

let openaiClient = null;

/**
 * Initialize OpenAI client
 */
function initializeOpenAI() {
    if (openaiClient) {
        return openaiClient;
    }

    openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

    console.log('✅ OpenAI client initialized');
    return openaiClient;
}

/**
 * Get OpenAI client instance
 */
function getOpenAI() {
    if (!openaiClient) {
        initializeOpenAI();
    }
    return openaiClient;
}

// IMPORTANT: text-embedding-3-large produces 3072-dimensional vectors
// This MUST match the Pinecone index dimension!
const EMBEDDING_MODEL = 'text-embedding-3-large';
const EXPECTED_DIMENSION = 3072;

/**
 * Generate embeddings for text
 * @param {string} text - Text to generate embeddings for
 * @returns {Object} { embedding, usage }
 */
async function generateEmbedding(text) {
    const client = getOpenAI();

    // Truncate text to avoid token limits (text-embedding-3-large: 8191 tokens max)
    const truncatedText = text.substring(0, 25000);

    const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: truncatedText
    });

    const embedding = response.data[0].embedding;
    const usage = response.usage;

    // CRITICAL: Verify dimension
    if (embedding.length !== EXPECTED_DIMENSION) {
        throw new Error(`DIMENSION MISMATCH: Got ${embedding.length}, expected ${EXPECTED_DIMENSION}`);
    }

    console.log(`   ✅ Generated embedding: ${embedding.length} dimensions (${usage.total_tokens} tokens)`);
    return { embedding, usage };
}

/**
 * Generate embeddings for multiple texts
 * @param {Array} texts - Array of texts to generate embeddings for
 * @returns {Object} { embeddings, usage }
 */
async function generateEmbeddings(texts) {
    const client = getOpenAI();

    // Truncate each text to avoid token limits
    const truncatedTexts = texts.map(t => t.substring(0, 25000));

    const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: truncatedTexts
    });

    const embeddings = response.data.map(item => item.embedding);
    const usage = response.usage;

    // CRITICAL: Verify all dimensions
    for (let i = 0; i < embeddings.length; i++) {
        if (embeddings[i].length !== EXPECTED_DIMENSION) {
            throw new Error(`DIMENSION MISMATCH at index ${i}: Got ${embeddings[i].length}, expected ${EXPECTED_DIMENSION}`);
        }
    }

    console.log(`   ✅ Generated ${embeddings.length} embeddings: ${EXPECTED_DIMENSION} dimensions each (${usage.total_tokens} tokens)`);
    return { embeddings, usage };
}

/**
 * Generate AI response using GPT
 * @param {string} question - User's question
 * @param {string} context - Context from documents
 * @param {Array} history - Optional conversation history
 * @returns {Object} { content, usage, model }
 */
async function generateResponse(question, context, history = []) {
    const client = getOpenAI();
    const model = 'gpt-3.5-turbo';

    const systemPrompt = `You are a helpful AI assistant that answers questions based ONLY on the provided context. 
If the context doesn't contain relevant information to answer the question, say "I couldn't find relevant information in your documents to answer this question."
Never make up information or use knowledge outside of the provided context.`;

    const messages = [
        { role: 'system', content: systemPrompt }
    ];

    // Add conversation history
    if (history && history.length > 0) {
        history.forEach(msg => {
            messages.push({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            });
        });
    }

    // Add current context and question
    const userPrompt = `Context from user's documents:
${context}

User's question: ${question}

Please provide a helpful answer based only on the context above.`;

    messages.push({ role: 'user', content: userPrompt });

    const response = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 1000
    });

    return {
        content: response.choices[0].message.content,
        usage: response.usage,
        model
    };
}

module.exports = {
    initializeOpenAI,
    getOpenAI,
    generateEmbedding,
    generateEmbeddings,
    generateResponse
};
