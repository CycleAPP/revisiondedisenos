
import { parseTextWithOpenAI, analyzeImageWithOpenAI } from './src/services/openai.service.js';

console.log("Imported successfully");

try {
    console.log("Testing parseTextWithOpenAI...");
    // We expect this to fail with API key error or network error, but NOT ReferenceError
    parseTextWithOpenAI("test").then(() => console.log("Success")).catch(e => console.error("Error:", e));
} catch (e) {
    console.error("Sync Error:", e);
}
