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
        answer = await generateAnswer(query, context);
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
async function generateAnswer(query: string, context: string): Promise<string> {
  try {
    console.log(`Using model: ${MODEL_ID} to generate answer`);

    // Get the Gemini model
    const model = genAI.getGenerativeModel({ model: MODEL_ID });

    // Prepare the prompt with improved instructions
    const prompt = `
You are an expert HR assistant and your job is to accurately and efficiently answer company-specific questions by extracting information solely from the provided PDF documents uploaded.

CONTEXT FROM DOCUMENTS:
${context}

QUESTION: ${query}

*Instructions:*

1. **Document-Driven Responses:**
   - Base all answers exclusively on the content within the uploaded PDF documents.
   - If the required information is not present in the documents, respond with: "The information is not available in the provided documents."

2. **Clarification and Specificity:**
   - If a question is ambiguous or lacks sufficient detail, ask the user for clarification before proceeding.

3. **Information Retrieval:**
   - Identify and extract relevant sections from the PDFs that directly address the user's query.
   - Provide concise and precise answers, summarizing the pertinent information.

4. **Reference Documentation:**
   - After providing an answer, cite the specific document and section (e.g., page number, heading) where the information was found.

5. **Handling Multiple Documents:**
   - When multiple documents are provided, prioritize information based on the following hierarchy:
     - Official company policies and manuals
     - Department-specific guidelines
     - Training materials
     - Other reference materials
   - If conflicting information is found, highlight the discrepancies and suggest consulting the relevant department for clarification.

6. **Limitations:**
   - Do not attempt to answer questions beyond the scope of the provided documents.
   - Avoid using external knowledge or assumptions in your responses.

7. **Response Format:**
   - Begin with a brief summary of the answer.
   - Follow with specific details extracted from the documents.
   - Conclude with the citation of the source document and section.

*Example Workflow:*

- **User Query:** "What is the company's policy on remote work?"
- **Agent Process:**
  - Search the uploaded PDFs for sections related to remote work policies.
  - Check whether further clarifications questions are needed from user, if yes, ask that first and get the picture clear
  - Extract relevant information.
  - Formulate a concise answer.
- **Agent Response:**
  - "The company allows employees to work remotely up to two days per week, subject to manager approval. (Source: Employee Handbook, Page 15, 'Remote Work Policy')"

ANSWER:
`;

    // Generate content with safety settings adjusted for HR content
    const generationConfig = {
      temperature: 0.5, // Lower temperature for more factual responses
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
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
