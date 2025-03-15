"use server";

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { searchVectorStore } from "./vectorStore";

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

// Use Gemini 2.0 Flash model
const MODEL_ID = "gemini-2.0-flash";

// Flag to control whether to use the AI model or the fallback implementation
const USE_AI_MODEL = true;

type QueryResult = {
  answer: string;
  sources: Array<{
    documentId: string;
    documentName: string;
    snippet: string;
  }>;
};

/**
 * Query documents using a natural language question
 */
export async function queryDocuments(query: string): Promise<QueryResult> {
  try {
    console.log(`Searching for documents related to: "${query}"`);

    // Search for relevant document chunks with increased number of results
    const searchResults = await searchVectorStore(query, 10);
    console.log(`Found ${searchResults.length} relevant document chunks`);

    if (!searchResults || searchResults.length === 0) {
      return {
        answer:
          "I couldn't find any relevant information in the uploaded documents to answer your question.",
        sources: [],
      };
    }

    // Log the search results for debugging
    searchResults.forEach((result, index) => {
      console.log(
        `Result ${index + 1}: ${
          result.documentName
        } (Score: ${result.score.toFixed(2)})`
      );
      console.log(`Text snippet: ${result.text.substring(0, 100)}...`);
    });

    // Filter out results with very low relevance scores
    const filteredResults = searchResults.filter(
      (result) => result.score > 0.3
    );

    if (filteredResults.length === 0) {
      console.log(
        "All results had low relevance scores, using all results anyway"
      );
    }

    const resultsToUse =
      filteredResults.length > 0 ? filteredResults : searchResults;

    // Prepare context from search results with document names and relevance scores
    const context = resultsToUse
      .map(
        (result, index) =>
          `[Document ${index + 1}: "${result.documentName}" (Relevance: ${(
            result.score * 100
          ).toFixed(1)}%)]\n${result.text}`
      )
      .join("\n\n");

    let answer;
    if (USE_AI_MODEL) {
      // Try to generate answer using Google's Gemini model
      try {
        answer = await generateAnswer(query, context, resultsToUse);
      } catch (error) {
        console.error(
          "Error using AI model, falling back to simple implementation:",
          error
        );
        // If AI model fails, fall back to the simple implementation
        answer = generateSimpleAnswer(query, resultsToUse);
      }
    } else {
      // Use the simple implementation directly
      answer = generateSimpleAnswer(query, resultsToUse);
    }

    // Make sure answer is a string, not an object
    if (typeof answer === "object" && answer !== null) {
      console.warn("Answer is an object, converting to string:", answer);
      answer = JSON.stringify(answer);
    }

    return {
      answer: answer,
      sources: resultsToUse.map((result) => ({
        documentId: result.documentId,
        documentName: result.documentName,
        snippet: result.text.substring(0, 200) + "...",
      })),
    };
  } catch (error) {
    console.error("Error querying documents:", error);
    throw new Error("Failed to query documents");
  }
}

/**
 * Generate a simple answer based on the search results without using AI
 */
function generateSimpleAnswer(
  query: string,
  searchResults: Array<{
    documentId: string;
    documentName: string;
    text: string;
    score: number;
  }>
): string {
  // Sort results by relevance score
  const sortedResults = [...searchResults].sort((a, b) => b.score - a.score);

  // Get the most relevant document
  const topResult = sortedResults[0];

  // Create a simple response that includes the most relevant information
  return `Based on the document "${
    topResult.documentName
  }", I found the following information:

${topResult.text}

This information was found in the document with a relevance score of ${(
    topResult.score * 100
  ).toFixed(1)}%.
${
  sortedResults.length > 1
    ? `\n\nI also found ${
        sortedResults.length - 1
      } other relevant documents that might contain additional information.`
    : ""
}`;
}

/**
 * Generate an answer using Google's Gemini model
 */
async function generateAnswer(
  query: string,
  context: string,
  searchResults: Array<{
    documentId: string;
    documentName: string;
    text: string;
    score: number;
  }>
): Promise<string> {
  try {
    console.log(`Using model: ${MODEL_ID} to generate answer`);

    // Get the Gemini model
    const model = genAI.getGenerativeModel({ model: MODEL_ID });

    // Prepare the prompt with improved instructions
    const prompt = `
You are an expert HR assistant that helps employees find information in company documents.

CONTEXT FROM DOCUMENTS:
${context}

QUESTION: ${query}

INSTRUCTIONS:
1. Answer the question based ONLY on the information provided in the context.
2. If the exact answer is not in the context, say "Based on the available documents, I couldn't find specific information about [topic]. However, here's what I found that might be relevant:" and then provide the most relevant information from the context.
3. Be specific and detailed in your answer, citing which document(s) you found the information in.
4. If multiple documents contain relevant information, synthesize the information from all relevant sources.
5. Do not make up or infer information that is not explicitly stated in the context.
6. Format your answer in a clear, structured way.
7. If the context contains contradictory information, point this out and explain the different perspectives.

ANSWER:
`;

    // Generate content with safety settings adjusted for HR content
    const generationConfig = {
      temperature: 0.2, // Lower temperature for more factual responses
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 1024,
    };

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
      safetySettings,
    });

    const response = result.response;
    const text = response.text();

    return text;
  } catch (error) {
    console.error("Error generating answer:", error);

    // Check for specific error types and provide more helpful messages
    if (error instanceof Error) {
      const errorMessage = error.message || "";

      if (
        errorMessage.includes("404 Not Found") &&
        errorMessage.includes("models/")
      ) {
        console.log(
          `Model ${MODEL_ID} not found, trying with gemini-1.5-flash`
        );

        // Try with a different model if the specified one is not found
        try {
          const fallbackModel = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
          });

          const fallbackPrompt = `
You are an HR assistant that helps employees find information in company documents.
Answer the following question based ONLY on the provided context from company documents.
If the answer cannot be found in the context, say "I couldn't find specific information about that in the available documents, but here's what I know:" and then summarize the most relevant information from the context.

Context:
${context}

Question: ${query}

Answer:
`;

          const result = await fallbackModel.generateContent(fallbackPrompt);
          const response = result.response;
          return response.text();
        } catch (fallbackError) {
          console.error("Fallback model also failed:", fallbackError);
          return "I'm sorry, the AI model is currently unavailable. This could be due to an API configuration issue. Please check your Google API key and model configuration.";
        }
      } else if (errorMessage.includes("403 Forbidden")) {
        // API key or permission issue
        return "I'm sorry, there seems to be an issue with the API access permissions. Please verify your Google API key has the necessary permissions.";
      } else if (errorMessage.includes("429 Too Many Requests")) {
        // Rate limit issue
        return "I'm sorry, we've reached the rate limit for AI queries. Please try again in a few minutes.";
      }
    }

    // Generic error message as fallback
    return "I'm sorry, I encountered an error while trying to answer your question. Please try again later.";
  }
}
