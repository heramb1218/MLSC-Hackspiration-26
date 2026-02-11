const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const db = process.env.MONGO_URI;

mongoose.connect(db)
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

module.exports = mongoose;
