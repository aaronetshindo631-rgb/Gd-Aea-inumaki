const express = require('express');
const fs = require('fs-extra');
const login = require('fca-unofficial');
const moment = require('moment-timezone'); 

// --- SERVEUR WEB POUR RENDER ---
const app = express();
const PORT = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Bot FB est en ligne ✅'));
app.listen(PORT, () => console.log(`[WEB] Serveur sur port ${PORT}`)); 

// --- CONFIG ---
const PREFIX = "!";
const ADMIN_UID = ["1000XXXXXXX"]; // MET TON UID ICI 

// --- DATA SYSTEM (auto-création) ---
fs.ensureDirSync('./data');
if (!fs.existsSync('./data/bans.json')) fs.writeJsonSync('./data/bans.json', []);
if (!fs.existsSync('./data/daily.json')) fs.writeJsonSync('./data/daily.json', {});
if (!fs.existsSync('./data/users.json')) fs.writeJsonSync('./data/users.json', {}); 

// --- APPSTATE DEPUIS ENV ---
let appState;
try {
  if (process.env.APPSTATE) {
    appState = JSON.parse(process.env.APPSTATE);
  } else {
    appState = JSON.parse(fs.readFileSync('appstate.json', 'utf8'));
  }
} catch (e) {
  console.error("❌ APPSTATE manquant! Mets le dans les variables d'environnement Render.");
  process.exit(1);
} 

// --- COMMANDES ---
const commands = {
  menu: {
    desc: "Affiche le menu",
    exec: async ({ api, event }) => {
      const msg = `📜 MENU BOT
━━━━━━━━━━━━
!menu - Voir ce menu
!daily - Récompense quotidienne
!ban @user - Bannir (Admin)
!unban @user - Débannir (Admin)
!image - Réponds à une image pour l'analyser
!say [texte] - Le bot répète
!uid - Ton UID
━━━━━━━━━━━━
Bot by toi ✨`;
      api.sendMessage(msg, event.threadID);
    }
  },
  daily: {
    desc: "Daily reward",
    exec: async ({ api, event }) => {
      const data = fs.readJsonSync('./data/daily.json');
      const now = Date.now();
      if (data[event.senderID] && now - data[event.senderID] < 86400000) {
        const left = 86400000 - (now - data[event.senderID]);
        const h = Math.floor(left / 3600000);
        return api.sendMessage(`⏳ Déjà pris! Reviens dans ${h}h`, event.threadID);
      }
      data[event.senderID] = now;
      fs.writeJsonSync('./data/daily.json', data);
      api.sendMessage("✅ Daily +500 coins reçu! 💰 Reviens demain.", event.threadID);
    }
  },
  ban: {
    desc: "Ban un user",
    exec: async ({ api, event, args, isAdmin }) => {
      if (!isAdmin) return api.sendMessage("Admin only.", event.threadID);
      const target = Object.keys(event.mentions)[0] || args[0];
      if (!target) return api.sendMessage("Usage:!ban @user", event.threadID);
      const bans = fs.readJsonSync('./data/bans.json');
      if (!bans.includes(target)) {
        bans.push(target);
        fs.writeJsonSync('./data/bans.json', bans);
      }
      api.sendMessage(`🚫 Banni: ${target}`, event.threadID);
    }
  },
  unban: {
    desc: "Unban",
    exec: async ({ api, event, args, isAdmin }) => {
      if (!isAdmin) return;
      const target = Object.keys(event.mentions)[0] || args[0];
      let bans = fs.readJsonSync('./data/bans.json');
      bans = bans.filter(id => id!= target);
      fs.writeJsonSync('./data/bans.json', bans);
      api.sendMessage(`✅ Débanni: ${target}`, event.threadID);
    }
  },
  image: {
    desc: "Gestion d'image",
    exec: async ({ api, event }) => {
      if (event.messageReply?.attachments[0]?.type === "photo") {
        const url = event.messageReply.attachments[0].url;
        return api.sendMessage(`🖼️ Image reçue!\nURL: ${url}\n\nEnvoie!image + ta demande (ex: mets cheveux bleus)`, event.threadID);
      }
      api.sendMessage("📸 Réponds à une photo avec!image pour que je la traite.", event.threadID);
    }
  },
  uid: {
    desc: "Donne ton UID",
    exec: async ({ api, event }) => {
      api.sendMessage(`Ton UID: ${event.senderID}\nThread: ${event.threadID}`, event.threadID);
    }
  },
  say: {
    desc: "Répète",
    exec: async ({ api, event, args }) => {
      api.sendMessage(args.join(" ") || "Dis quelque chose", event.threadID);
    }
  }
}; 

// --- LANCEMENT BOT ---
login({ appState }, (err, api) => {
  if (err) return console.error(err);
  api.setOptions({ listenEvents: true, selfListen: false, autoMarkDelivery: true });
  console.log("[BOT] Connecté sur Render!"); 

  api.listenMqtt(async (err, event) => {
    if (err) return;
    if (event.type!== "message" && event.type!== "message_reply") return;
    const body = event.body || "";
    if (!body.startsWith(PREFIX)) return; 

    const args = body.slice(PREFIX.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();
    const command = commands[cmdName];
    if (!command) return; 

    const bans = fs.readJsonSync('./data/bans.json');
    if (bans.includes(event.senderID)) return; 

    const isAdmin = ADMIN_UID.includes(event.senderID); 

    try {
      await command.exec({ api, event, args, isAdmin });
    } catch (e) {
      console.error(e);
      api.sendMessage("❌ Erreur interne", event.threadID);
    }
  });
});
