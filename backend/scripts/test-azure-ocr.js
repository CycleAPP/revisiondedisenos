import "dotenv/config";
import { analyzeDesignWithAI } from "../src/services/ocr.service.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function test() {
    const pdfPath = path.join(__dirname, "../uploads/designs/test.pdf");
    console.log("Testing Azure OCR with:", pdfPath);

    try {
        const result = await analyzeDesignWithAI(pdfPath, {
            expectedFields: { itemDescription: "Dummy PDF" }
        });
        console.log("Result:", JSON.stringify(result, null, 2));
        if (result.validation) {
            console.log("\nGlobal Validation Results:");
            console.log("Rule Found:", result.validation.ruleFound);
            console.log("Overall Status:", result.validation.overallStatus);
            if (result.validation.details) {
                result.validation.details.forEach(detail => {
                    console.log(`- ${detail.requirement}: ${detail.status}`);
                });
            }
        }
        if (result.contentValidation) {
            console.log("\nContent Validation Results:");
            console.log("Rule Found:", result.contentValidation.ruleFound);
            console.log("Matched Category:", result.contentValidation.matchedCategory);
            console.log("Overall Status:", result.contentValidation.overallStatus);
        }
        if (result.faces) {
            console.log("\nSemantic Classification Results:");
            Object.keys(result.faces).forEach(face => {
                console.log(`${face}: ${result.faces[face].texts.length} fragments`);
            });
        }
    } catch (error) {
        console.error("Test failed:", error);
    }
}

test();
