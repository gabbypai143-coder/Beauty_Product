const express = require('express');
const app = express();
app.get('/api/orders/track', (req, res) => res.json({ ok: true }));
app.listen(3001, () => console.log('running on 3001'));
