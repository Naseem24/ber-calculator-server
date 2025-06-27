// server/server.js

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// === Middleware ===
app.use(cors());
app.use(express.json());

// === Helper Functions ===

/**
 * The complementary error function (erfc), which is essential for BER calculations.
 * JavaScript's Math object doesn't have this, so we define it ourselves.
 * This is a standard approximation.
 */
function erfc(x) {
    const z = Math.abs(x);
    const t = 1 / (1 + 0.5 * z);
    const result = t * Math.exp(-z * z - 1.26551223 +
        t * (1.00002368 +
            t * (0.37409196 +
                t * (0.09678418 +
                    t * (-0.18628806 +
                        t * (0.27886807 +
                            t * (-1.13520398 +
                                t * (1.48851587 +
                                    t * (-0.82215223 +
                                        t * 0.17087277)))))))));
    return x >= 0 ? result : 2 - result;
}

/**
 * Calculates the Bit Error Rate (BER) for different M-PSK modulations.
 */
function calculateBer(ebNoLinear, modulationOrder) {
    const M = modulationOrder;
    const k = Math.log2(M); // Bits per symbol

    // For BPSK (M=2) and QPSK (M=4), the exact BER formula is the same
    if (M <= 4) {
        // BER = 0.5 * erfc(sqrt(Eb/N0))
        return 0.5 * erfc(Math.sqrt(ebNoLinear));
    }

    // For higher-order M-PSK (8-PSK, 16-PSK, etc.)
    // We first approximate the Symbol Error Rate (SER)
    const ser = erfc(Math.sqrt(k * ebNoLinear) * Math.sin(Math.PI / M));
    // Then, we approximate the Bit Error Rate from the SER
    const ber = ser / k;
    return ber;
}

/**
 * Generates a simple text explanation of the results.
 */
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


// === Routes ===

// This is the main API endpoint for our calculator
app.post('/api/ber', (req, res) => {
    // Get the input from the request body sent by the frontend
    const { ebNoLinear, modulationOrder } = req.body;

    // Basic validation
    if (ebNoLinear === undefined || modulationOrder === undefined) {
        return res.status(400).json({ message: 'Missing required input: ebNoLinear or modulationOrder' });
    }

    const ebNoDb = 10 * Math.log10(ebNoLinear); // Convert back to dB for the explanation
    const ber = calculateBer(ebNoLinear, modulationOrder);
    const aiExplanation = generateExplanation(ber, ebNoDb.toFixed(1), modulationOrder);

    // Send the results back to the frontend in the expected format
    const responsePayload = {
        calculations: {
            ber: ber,
        },
        aiExplanation: aiExplanation,
    };

    res.json(responsePayload);
});


// === Start the server ===
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});