import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), "../.env") });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
    console.log("Starting OCR Test...");

    // 1. Check API Key
    if (!process.env.GOOGLE_API_KEY) {
        console.error("❌ GOOGLE_API_KEY is missing in environment variables.");
        process.exit(1);
    }
    console.log("✅ API Key found.");

    // Import service AFTER loading env vars
    const { analyzeDesignWithAI } = await import("../src/services/ocr.service.js");

    // 2. Create a dummy PDF file for testing if one doesn't exist
    const uploadsDir = path.join(__dirname, "../src/uploads");
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const testFile = path.join(uploadsDir, "test_design.pdf");

    // If we don't have a real PDF, we can't fully test the File API upload without a real file.
    // We will check if there are any files in uploads, otherwise warn.
    const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith(".pdf") || f.endsWith(".jpg") || f.endsWith(".png"));

    if (files.length === 0) {
        console.warn("⚠️ No files found in uploads directory to test. Please place a 'test.pdf' or similar in backend/src/uploads.");
        // Create a dummy text file just to see if it fails gracefully or with file type error
        fs.writeFileSync(testFile, "Dummy PDF content");
    } else {
        console.log(`Found ${files.length} files. Testing with: ${files[0]}`);
        const targetPath = path.join(uploadsDir, files[0]);

        try {
            console.log(`Analyzing ${targetPath}...`);
            const result = await analyzeDesignWithAI(targetPath, { expectedFields: { itemDescription: "Test Item" } });

            console.log("--- OCR Result ---");
            console.log(JSON.stringify(result, null, 2));

            if (result.error) {
                console.error("❌ OCR Failed:", result.message);
            } else {
                console.log("✅ OCR Success!");
                if (result.product) console.log("Product:", result.product);
                if (result.faces) console.log("Faces detected:", Object.keys(result.faces));
            }

        } catch (err) {
            console.error("❌ Unexpected Error:", err);
        }
    }
}

runTest();
