const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5003;

// Middleware
app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.send('CampusTrust API is running');
});

// DEBUG ENDPOINT (Remove in production)
app.get('/debug-config', (req, res) => {
    res.json({
        cachedConfig: {
            mongo_uri_set: !!process.env.MONGO_URI,
            pool_address_set: !!process.env.POOL_ADDRESS,
            pool_mnemonic_set: !!process.env.POOL_MNEMONIC,
            algod_server: process.env.ALGOD_SERVER || 'default-testnet'
        },
        dbState: mongoose.connection.readyState, // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
        dbHost: mongoose.connection.host,
        dbName: mongoose.connection.name
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
