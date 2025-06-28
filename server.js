// =================================================================
// === FINAL CORRECTED server/server.js ============================
// =================================================================

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// --- CORS Configuration ---
// Define the list of websites that are allowed to access this server.
const allowedOrigins = [
    // This MUST be the exact URL of your Vercel frontend
    'https://ber-calculator-client-6j70mopxl-naseems-projects-1f6111c0.vercel.app',

    // This is for running your React app locally for testing
    'http://localhost:3000'
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        // and requests from our whitelist.
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // This will log the blocked URL to your Render logs for debugging
            console.error('CORS Error: This origin is not allowed ->', origin);
            callback(new Error('Not allowed by CORS'));
        }
    }
};

// Use the specific CORS options. THIS IS THE KEY FIX.
app.use(cors(corsOptions));
// -------------------------

app.use(express.json());


// === Helper Functions (Your logic is perfect, no changes needed here) ===
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


// === Routes (Your logic is perfect, no changes needed here) ===
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