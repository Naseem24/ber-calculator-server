// =================================================================
// === FINAL, FULLY IMPLEMENTED server/server.js ===================
// =================================================================

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// --- CORS Configuration (Flexible & Secure) ---
const allowedOrigins = [
    // ⬇️ ⬇️ ⬇️ IMPORTANT: REPLACE THIS WITH YOUR REAL PRODUCTION DOMAIN FROM VERCEL ⬇️ ⬇️ ⬇️
    'https://ber-calculator-client.vercel.app',  // <--- PASTE YOUR MAIN VERCEL DOMAIN HERE
    'http://localhost:3000'
];
const corsOptions = {
    origin: function (origin, callback) {
        const vercelPreviewRegex = /https:\/\/ber-calculator-client-.*-naseems-projects-1f6111c0\.vercel\.app$/;
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || vercelPreviewRegex.test(origin)) {
            callback(null, true);
        } else {
            console.error('CORS Error: Blocked origin ->', origin);
            callback(new Error('Not allowed by CORS'));
        }
    }
};
app.use(cors(corsOptions));
app.use(express.json());

// === Helper Functions ===
function factorial(n) {
    if (n < 0) return -1;
    if (n === 0) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

function erfc(x) {
    const z = Math.abs(x);
    const t = 1 / (1 + 0.5 * z);
    const result = t * Math.exp(-z * z - 1.26551223 +
        t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
            t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 +
                t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? result : 2 - result;
}

const qFunction = (x) => 0.5 * erfc(x / Math.sqrt(2));


// =================================================================
// === API ROUTES FOR EACH CALCULATOR ==============================
// =================================================================

// 1. BER Calculator (Signal Quality)
app.post('/api/ber', (req, res) => {
    const { ebNoDb, modulationOrder } = req.body;
    const M = parseInt(modulationOrder);
    const k = Math.log2(M);
    const ebNoLinear = Math.pow(10, ebNoDb / 10);

    let ber;
    if (M === 2) { // BPSK
        ber = qFunction(Math.sqrt(2 * ebNoLinear));
    } else { // M-PSK
        ber = (2 / k) * qFunction(Math.sqrt(2 * k * ebNoLinear * Math.pow(Math.sin(Math.PI / M), 2)));
    }

    // AI Explanation Placeholder
    const explanation = `For a ${{ 2: "BPSK", 4: "QPSK", 8: "8-PSK", 16: "16-PSK" }[M]} signal with Eb/No ${ebNoDb} dB, the BER is ~${ber.toExponential(2)}.`;
    res.json({ ber, explanation });
});

// 2. Erlang B Calculator (Traffic Engineering)
app.post('/api/erlang-b', (req, res) => {
    const { traffic, channels, maxBlocking } = req.body;

    // Calculate Blocking Probability
    let numerator = Math.pow(traffic, channels) / factorial(channels);
    let denominator = 0;
    for (let i = 0; i <= channels; i++) {
        denominator += Math.pow(traffic, i) / factorial(i);
    }
    const blockingProbability = numerator / denominator;

    // Calculate Required Channels
    let requiredChannels = 1;
    while (true) {
        let num = Math.pow(traffic, requiredChannels) / factorial(requiredChannels);
        let den = 0;
        for (let i = 0; i <= requiredChannels; i++) {
            den += Math.pow(traffic, i) / factorial(i);
        }
        if ((num / den) <= maxBlocking) {
            break;
        }
        requiredChannels++;
        if (requiredChannels > 1000) break; // Safety break
    }

    const explanation = `With an offered traffic of ${traffic} Erlangs over ${channels} channels, the blocking probability is ~${(blockingProbability * 100).toFixed(2)}%. To achieve a max blocking of ${maxBlocking * 100}%, you need at least ${requiredChannels} channels.`;
    res.json({ blockingProbability, requiredChannels, explanation });
});

// 3. Communication System Calculator
app.post('/api/comm-system', (req, res) => {
    const { bandwidth, quantizerBits, sourceEncoderRate, channelEncoderRate, burstSize } = req.body;
    const samplingFrequency = 2 * bandwidth;
    const quantizerRate = samplingFrequency * quantizerBits;
    const sourceEncoderOutRate = quantizerRate * sourceEncoderRate;
    const channelEncoderOutRate = sourceEncoderOutRate / channelEncoderRate;
    const burstDuration = burstSize / channelEncoderOutRate;

    const explanation = `With a ${bandwidth / 1e6} MHz bandwidth, the signal is sampled at ${samplingFrequency / 1e6} Msps. After quantization and encoding, the final data rate is ${(channelEncoderOutRate / 1e6).toFixed(2)} Mbps, resulting in a burst duration of ${(burstDuration * 1e6).toFixed(2)} µs.`;
    res.json({ samplingFrequency, quantizerRate, sourceEncoderOutRate, channelEncoderOutRate, burstDuration, explanation });
});


// 4. OFDM System Calculator
app.post('/api/ofdm', (req, res) => {
    const { modOrder, rbBw, subcarrierSpacing, symbolsPerRb, parallelRbs, rbDuration } = req.body;
    const bitsPerSymbol = Math.log2(modOrder);
    const subcarriersPerRb = rbBw / subcarrierSpacing;
    const bitsPerRb = bitsPerSymbol * subcarriersPerRb * symbolsPerRb;
    const maxDataRate = (parallelRbs * bitsPerRb) / rbDuration;
    const totalBw = parallelRbs * rbBw;
    const spectralEfficiency = maxDataRate / totalBw;

    const explanation = `Using ${modOrder}-QAM, the system achieves a max data rate of ${(maxDataRate / 1e6).toFixed(2)} Mbps over a total bandwidth of ${(totalBw / 1e6).toFixed(2)} MHz. This results in a spectral efficiency of ${spectralEfficiency.toFixed(2)} bps/Hz.`;
    res.json({ bitsPerSymbol, subcarriersPerRb, bitsPerRb, maxDataRate, totalBw, spectralEfficiency, explanation });
});


// 5. Link Budget Calculator
app.post('/api/link-budget', (req, res) => {
    const { dataRate, temp, noiseFigure, requiredEbNo, fadeMargin, pathLoss, otherLosses, txGain, rxGain } = req.body;
    const K_DBW = -228.6;
    const noisePower = K_DBW + 10 * Math.log10(temp) + 10 * Math.log10(dataRate);
    const sensitivity = noisePower + noiseFigure + requiredEbNo;
    const requiredRxPower = sensitivity + fadeMargin;
    const requiredTxPowerDbw = requiredRxPower + pathLoss + otherLosses - txGain - rxGain;
    const requiredTxPowerWatts = Math.pow(10, requiredTxPowerDbw / 10);

    const explanation = `To overcome a path loss of ${pathLoss} dB and achieve the required Eb/No of ${requiredEbNo} dB, the transmitter must have a power of at least ${requiredTxPowerDbw.toFixed(2)} dBW, which is equivalent to ${requiredTxPowerWatts.toFixed(2)} Watts.`;
    res.json({ noisePower, sensitivity, requiredRxPower, requiredTxPowerDbw, requiredTxPowerWatts, explanation });
});

// 6. Cellular System Calculator
app.post('/api/cellular', (req, res) => {
    const { coverageArea, cellRadius, subscribers, callsPerHour, callDuration, requiredSir, pathLossExp } = req.body;
    const cellArea = (3 * Math.sqrt(3) / 2) * Math.pow(cellRadius, 2);
    const numCells = Math.ceil(coverageArea / cellArea);
    const trafficPerUser = (callsPerHour * callDuration) / 60;
    const totalTraffic = subscribers * trafficPerUser;
    const trafficPerCell = totalTraffic / numCells;
    const sirLinear = Math.pow(10, requiredSir / 10);
    const clusterSize = Math.ceil((1 / 3) * Math.pow(6 * sirLinear, 2 / pathLossExp));

    const explanation = `To cover ${coverageArea} sq. km, you need ${numCells} cells. With a total system traffic of ${totalTraffic.toFixed(2)} Erlangs, each cell handles ~${trafficPerCell.toFixed(2)} Erlangs. A frequency reuse cluster size of N=${clusterSize} is required.`;
    res.json({ cellArea, numCells, trafficPerUser, totalTraffic, trafficPerCell, clusterSize, explanation });
});


// === Start the server ===
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});