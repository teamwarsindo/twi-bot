import { verifyKey } from 'discord-interactions';

// Paksa Vercel menggunakan mesin Edge yang paling murni
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Tolak semua request yang bukan dari Discord (misal: dari browser)
  if (req.method !== 'POST') {
    return new Response('Hanya menerima metode POST dari Discord', { status: 405 });
  }

  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  
  // Ambil data murni tanpa campur tangan Vercel
  const body = await req.text();

  // Proses Verifikasi
  const isValid = verifyKey(
    body, 
    signature, 
    timestamp, 
    process.env.DISCORD_PUBLIC_KEY
  );

  if (!isValid) {
    return new Response('Akses Ditolak: Kunci tidak valid', { status: 401 });
  }

  const message = JSON.parse(body);

  // 1. BALASAN WAJIB PING UNTUK DISCORD DEVELOPER PORTAL
  // Response.json() akan mengunci format Header menjadi application/json secara otomatis
  if (message.type === 1) {
    return Response.json({ type: 1 });
  }

  // 2. BALASAN UNTUK COMMAND BOT
  if (message.type === 2 && message.data.name === 'ping') {
    return Response.json({
      type: 4,
      data: { content: 'Pong! 🏓 Akhirnya gerbang utama berhasil dijebol!' }
    });
  }

  return new Response('Perintah tidak dikenali', { status: 400 });
}
