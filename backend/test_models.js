import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "./src/config/env.js";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });


const apiKey = process.env.GOOGLE_API_KEY;

async function listModels() {
    if (!apiKey) {
        console.error("No API KEY found");
        return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    try {
        console.log("Listing models via API...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        if (data.models) {
            console.log("Available models:");
            data.models.forEach(m => console.log(`- ${m.name} (${m.supportedGenerationMethods.join(', ')})`));
        } else {
            console.error("Could not list models:", JSON.stringify(data, null, 2));
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

listModels();
