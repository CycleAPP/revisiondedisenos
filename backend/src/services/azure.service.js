import fetch from 'node-fetch';

const AZURE_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
const AZURE_ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;

/**
 * Analyzes a PDF file using Azure Document Intelligence (Read model).
 * @param {string} filePath - Absolute path to the PDF file.
 * @returns {Promise<string>} - Extracted text from the PDF.
 */
export async function analyzePdf(filePath) {
    if (!AZURE_KEY || !AZURE_ENDPOINT) {
        throw new Error("Azure Document Intelligence credentials not configured.");
    }

    // Construct the analysis URL
    // API Version 2023-07-31 (GA) or similar. Using prebuilt-read model.
    const url = `${AZURE_ENDPOINT}documentintelligence/documentModels/prebuilt-read:analyze?api-version=2023-10-31-preview&features=ocrHighResolution`;

    try {
        const fs = await import('fs');
        const fileBuffer = fs.readFileSync(filePath);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': AZURE_KEY,
                'Content-Type': 'application/pdf',
            },
            body: fileBuffer,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Azure API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        // Azure returns a 202 Accepted with an Operation-Location header for long running tasks
        // However, for small files it might be synchronous? 
        // Actually, Document Intelligence is usually async. We need to poll.

        const operationLocation = response.headers.get('operation-location');
        if (!operationLocation) {
            // If it returns 200 OK immediately (unlikely for this API but possible for some versions), check body
            // But standard behavior is 202 Accepted.
            throw new Error("No Operation-Location header received from Azure.");
        }

        // Poll for results
        let status = 'running';
        let result = null;

        while (status === 'running' || status === 'notStarted') {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

            const pollResponse = await fetch(operationLocation, {
                headers: {
                    'Ocp-Apim-Subscription-Key': AZURE_KEY
                }
            });

            if (!pollResponse.ok) {
                throw new Error(`Polling failed: ${pollResponse.status} ${pollResponse.statusText}`);
            }

            const pollData = await pollResponse.json();
            status = pollData.status;

            if (status === 'succeeded') {
                result = pollData.analyzeResult;
            } else if (status === 'failed') {
                throw new Error(`Azure analysis failed: ${JSON.stringify(pollData.error)}`);
            }
        }

        // Extract text from result
        if (!result || !result.content) {
            return "";
        }

        return result.content;

    } catch (error) {
        console.error("[azure] Error analyzing PDF:", error);
        throw error;
    }
}
