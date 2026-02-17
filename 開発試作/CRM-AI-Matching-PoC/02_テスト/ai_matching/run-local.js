'use strict';
require('dotenv').config();
const app = require('./index.js');
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`AI Matching local server listening on ${port}`));
