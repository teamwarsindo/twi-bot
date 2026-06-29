import { verifyKey } from 'discord-interactions';
import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  const body = await req.text();

  try {
    const isValid = await verifyKey(
      body, 
      signature, 
      timestamp, 
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValid) {
      return new Response('Akses Ditolak: Signature Palsu', { status: 401 });
    }

    const message = JSON.parse(body);

    // 1. Balasan untuk verifikasi awal Discord
    if (message.type === 1) {
      return Response.json({ type: 1 });
    }

    // 2. Balasan untuk command /ping beserta Vercel KV
    if (message.type === 2 && message.data.name === 'ping') {
      
      // Memanggil Vercel KV untuk menghitung jumlah ping
      const currentPing = await kv.incr('bot_ping_count');

      return Response.json({ 
        type: 4, 
        data: { 
          content: `Pong! 🏓 Gerbang Discord ditaklukkan! Database aktif: Command ini telah dipanggil sebanyak **${currentPing}** kali.` 
        } 
      });
    }

    return Response.json({ error: 'Unknown Interaction' }, { status: 400 });

  } catch (error) {
    return new Response('Server Error', { status: 500 });
  }
}
