import { verifyKey } from 'discord-interactions';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // 1. Verifikasi Keamanan dari Discord
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const rawBody = JSON.stringify(req.body);

  const isValidRequest = verifyKey(
    rawBody,
    signature,
    timestamp,
    process.env.DISCORD_PUBLIC_KEY 
  );

  if (!isValidRequest) {
    return res.status(401).send('Bad request signature'); 
  }

  const message = req.body;

  // 2. Handle PING dari Discord Developer Portal
  if (message.type === 1) {
    return res.status(200).json({ type: 1 });
  }

  // 3. Handle Slash Commands
  if (message.type === 2) {
    const { name } = message.data;

    if (name === 'ping') {
      // Menggunakan Vercel KV: Menambah angka setiap kali command dipanggil
      const currentPing = await kv.incr('bot_ping_count');

      return res.status(200).json({
        type: 4, 
        data: {
          content: "Pong! 🏓 Koneksi Vercel KV sukses! Command ini telah dipanggil sebanyak " + currentPing + " kali.",
        },
      });
    }
  }

  return res.status(400).json({ error: 'Unknown Interaction Type' });
        }
