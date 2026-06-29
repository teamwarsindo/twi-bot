import { verifyKey } from 'discord-interactions';
import { kv } from '@vercel/kv';

// Mematikan parser bawaan Vercel agar data tidak rusak saat diverifikasi Discord
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  // Membaca data mentah (raw data) persis seperti yang dikirim Discord
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks).toString('utf8');

  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];

  // Proses verifikasi keamanan menggunakan data yang belum diubah
  const isValidRequest = verifyKey(
    rawBody,
    signature,
    timestamp,
    process.env.DISCORD_PUBLIC_KEY
  );

  if (!isValidRequest) {
    return res.status(401).send('Bad request signature');
  }

  // Setelah dinyatakan aman oleh Discord, baru kita terjemahkan pesannya
  const message = JSON.parse(rawBody);

  // Balasan untuk Discord Developer Portal
  if (message.type === 1) {
    return res.status(200).json({ type: 1 });
  }

  // Balasan untuk command /ping
  if (message.type === 2) {
    const { name } = message.data;

    if (name === 'ping') {
      const currentPing = await kv.incr('bot_ping_count');

      return res.status(200).json({
        type: 4, 
        data: {
          content: `Pong! 🏓 Koneksi Vercel KV sukses! Command ini telah dipanggil sebanyak **${currentPing}** kali.`,
        },
      });
    }
  }

  return res.status(400).json({ error: 'Unknown Interaction Type' });
}
