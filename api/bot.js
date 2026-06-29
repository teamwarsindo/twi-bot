import { verifyKey } from 'discord-interactions';

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
    // INI DIA KUNCI JAWABANNYA: Kata "await" di depan verifyKey!
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

    if (message.type === 1) {
      return Response.json({ type: 1 });
    }

    if (message.type === 2 && message.data.name === 'ping') {
      return Response.json({ type: 4, data: { content: 'Pong! 🏓 Selamat! Gerbang Discord berhasil ditaklukkan!' } });
    }

    return Response.json({ error: 'Unknown Interaction' }, { status: 400 });

  } catch (error) {
    return new Response('Server Error', { status: 500 });
  }
}
