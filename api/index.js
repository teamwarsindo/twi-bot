import { verifyKey } from 'discord-interactions';

// Mengubah mesin ke Edge Runtime (Jauh lebih cepat dan anti-gagal untuk Discord)
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Hanya melayani metode POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Mengambil Headers menggunakan standar Web API modern
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  
  // Mengambil body persis secara mentah tanpa parser yang merusak format
  const rawBody = await req.text();

  // Verifikasi Kunci Rahasia
  const isValidRequest = verifyKey(
    rawBody,
    signature,
    timestamp,
    process.env.DISCORD_PUBLIC_KEY
  );

  if (!isValidRequest) {
    return new Response('Bad request signature', { status: 401 });
  }

  // Jika aman, kita bedah pesannya
  const message = JSON.parse(rawBody);

  // 1. Balasan Wajib saat menyimpan URL di Portal Discord
  if (message.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Balasan untuk Slash Command (/ping)
  if (message.type === 2) {
    if (message.data.name === 'ping') {
      return new Response(
        JSON.stringify({
          type: 4, 
          data: {
            content: 'Pong! 🏓 Sistem Vercel Edge sukses merespons!',
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  return new Response('Unknown Interaction Type', { status: 400 });
}
