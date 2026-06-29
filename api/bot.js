import { verifyKey } from 'discord-interactions';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];

  // Cegah error jika Discord melakukan ping palsu (tanpa kunci)
  if (!signature || !timestamp) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks).toString('utf8');

  const isValidRequest = verifyKey(
    rawBody,
    signature,
    timestamp,
    process.env.DISCORD_PUBLIC_KEY
  );

  if (!isValidRequest) {
    // Discord MENGHARUSKAN kita menolak dengan 401 jika kuncinya salah
    return res.status(401).json({ error: 'Bad request signature' });
  }

  const message = JSON.parse(rawBody);

  // Balasan wajib PING dengan format Header yang sangat spesifik
  if (message.type === 1) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify({ type: 1 }));
  }

  if (message.type === 2 && message.data.name === 'ping') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify({
      type: 4, 
      data: { content: 'Pong! 🏓 Rute api/bot.js berhasil terhubung permanen!' }
    }));
  }

  return res.status(400).json({ error: 'Unknown Interaction Type' });
}
