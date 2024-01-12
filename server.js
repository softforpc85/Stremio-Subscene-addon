#!/usr/bin/env node
require('dotenv').config()
const app = require('./api/index.js')
const config = require('./config.js');

// create local server
app.listen((config.port), function () {
    console.log(`Addon active on port ${config.port}`);
    console.log(`HTTP addon accessible at: ${config.local}/configure`);
});

