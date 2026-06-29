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

  // INI ADALAH KODE MATA-MATA KITA
  console.log("=== MEMULAI INVESTIGASI ===");
  console.log("1. Signature ada?:", !!signature);
  console.log("2. Timestamp ada?:", !!timestamp);
  console.log("3. Panjang Kunci Discord:", process.env.DISCORD_PUBLIC_KEY ? process.env.DISCORD_PUBLIC_KEY.length : "KUNCI KOSONG/TIDAK TERBACA");
  console.log("4. Isi Body:", body);

  try {
    const isValid = verifyKey(
      body, 
      signature, 
      timestamp, 
      process.env.DISCORD_PUBLIC_KEY
    );

    console.log("5. Hasil Verifikasi Aman?:", isValid);

    if (!isValid) {
      console.error("GAGAL: Kunci tidak cocok dengan signature Discord!");
      return new Response('Akses Ditolak', { status: 401 });
    }

    const message = JSON.parse(body);
    console.log("6. Tipe Pesan:", message.type);

    if (message.type === 1) {
      console.log("SUKSES: Merespons PING dari Discord");
      return Response.json({ type: 1 });
    }

    return Response.json({ type: 4, data: { content: 'Sukses!' } });

  } catch (error) {
    console.error("ERROR SISTEM:", error.message);
    return new Response('Server Error', { status: 500 });
  }
}
