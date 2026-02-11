const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
// Connect to DB immediately
require('./config/db');

const apiRoutes = require('./routes/api');

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
