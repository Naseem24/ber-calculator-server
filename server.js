// =================================================================
// === FINAL, UPDATED, AND RECOMMENDED server/server.js ============
// =================================================================

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// --- CORS Configuration ---
// This is the most flexible and secure method.

// 1. Define the list of fixed websites that are always allowed.
const allowedOrigins = [
    // ⬇️ ⬇️ ⬇️ IMPORTANT: REPLACE THIS WITH YOUR REAL PRODUCTION DOMAIN FROM VERCEL ⬇️ ⬇️ ⬇️
    'https://ber-calculator-client.vercel.app',  // <--- PASTE YOUR MAIN VERCEL DOMAIN HERE

    // This is for running your React app locally for testing
    'http://localhost:3000'
];

const corsOptions = {
    origin: function (origin, callback) {
        // 2. This is a "regular expression" that matches ANY Vercel preview URL for your project.
        // It looks for any URL that starts with 'https://ber-calculator-client-' and ends with your project-specific hash.
        const vercelPreviewRegex = /https:\/\/ber-calculator-client-.*-naseems-projects-1f6111c0\.vercel\.app$/;

        // 3. Allow requests if:
        //    a) They have no origin (like Postman or mobile apps).
        //    b) They are in our fixed `allowedOrigins` list.
        //    c) They match the Vercel preview URL pattern.
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || vercelPreviewRegex.test(origin)) {
            callback(null, true);
        } else {
            console.error('CORS Error: This origin is not allowed ->', origin);
            callback(new Error('Not allowed by CORS'));
        }
    }
};

// Use the new, smarter CORS options.
app.use(cors(corsOptions));
// -------------------------

app.use(express.json());


// === Helper Functions (Your logic is perfect, no changes needed) ===
function erfc(x) {
    const z = Math.abs(x);
    const t = 1 / (1 + 0.5 * z);
    const result = t * Math.exp(-z * z - 1.26551223 +
        t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
            t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 +
                t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? result : 2 - result;
}

function calculateBer(ebNoLinear, modulationOrder) {
    const M = modulationOrder;
    const k = Math.log2(M);
    if (M <= 4) {
        return 0.5 * erfc(Math.sqrt(ebNoLinear));
    }
    const ser = erfc(Math.sqrt(k * ebNoLinear) * Math.sin(Math.PI / M));
    return ser / k;
}

function generateExplanation(ber, ebNoDb, M) {
    const modulationName = { 2: "BPSK", 4: "QPSK", 8: "8-PSK", 16: "16-PSK" }[M];
    let explanation = `For a ${modulationName} signal with an Eb/No of ${ebNoDb} dB, the calculated Bit Error Rate (BER) is approximately ${ber.toExponential(2)}. `;
    if (ber > 0.01) {
        explanation += "This is a high error rate, indicating a poor quality signal, likely resulting in significant data loss. Increasing the Eb/No (signal power) is recommended.";
    } else if (ber > 1e-6) {
        explanation += "This is a moderate error rate. The connection would be functional but might require error correction codes for reliable data transmission.";
    } else {
        explanation += "This is a low error rate, indicating a high-quality, reliable signal. Data transmission should be very stable.";
    }
    return explanation;
}


// === Routes (Your logic is perfect, no changes needed) ===
app.get('/api/test', (req, res) => {
    res.json({ message: 'Success! The Render server is online and responding.' });
});

app.post('/api/ber', (req, res) => {
    const { ebNoLinear, modulationOrder } = req.body;
    if (ebNoLinear === undefined || modulationOrder === undefined) {
        return res.status(400).json({ message: 'Missing required input: ebNoLinear or modulationOrder' });
    }
    const ebNoDb = 10 * Math.log10(ebNoLinear);
    const ber = calculateBer(ebNoLinear, modulationOrder);
    const aiExplanation = generateExplanation(ber, ebNoDb.toFixed(1), modulationOrder);
    const responsePayload = {
        calculations: { ber: ber },
        aiExplanation: aiExplanation,
    };
    res.json(responsePayload);
});


// === Start the server ===
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});