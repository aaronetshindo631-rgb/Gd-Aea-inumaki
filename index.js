
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();

app.use(bodyParser.json());

// COLLE TON TOKEN ICI
const PAGE_TOKEN = "EAAxxxxxxxxxxxxxxxxxxxx";
const VERIFY_TOKEN = "mon_bot_secret_123";

app.get('/', (req, res) => res.send("Bot en ligne"));

// Facebook va vérifier ton bot ici
app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.send('Erreur token');
  }
});

// Ici tu reçois tous les messages
app.post('/webhook', async (req, res) => {
  const body = req.body;
  
  if (body.object === 'page') {
    for (const entry of body.entry) {
      const event = entry.messaging[0];
      const senderId = event.sender.id;
      
      if (event.message && event.message.text) {
        const text = event.message.text;
        console.log(`Message de ${senderId}: ${text}`);

        // --- TA LOGIQUE D'ANIMATION ICI ---
        let reponse = `Tu as dit: ${text}. Je suis le nouveau bot officiel !`;

        await axios.post(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_TOKEN}`, {
          recipient: { id: senderId },
          message: { text: reponse }
        });
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

app.listen(10000, () => console.log("Bot officiel en ligne"));
