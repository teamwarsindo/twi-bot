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

    // 1. Verifikasi awal dari Discord Developer Portal
    if (message.type === 1) {
      return Response.json({ type: 1 });
    }

    // 2. Membaca jenis interaksi perintah (Slash Commands)
    if (message.type === 2) {
      const { name } = message.data;

      // PERINTAH UTAMA: /ping (Kembali Normal)
      if (name === 'ping') {
        return Response.json({ 
          type: 4, 
          data: { content: 'Pong! 🏓 Sistem bot berjalan dengan lancar!' } 
        });
      }

      // PERINTAH BARU: /roster
      if (name === 'roster') {
        // Memastikan data dummy tersimpan di database
        const dataDummy = {
          nama_tim: "Alpha Esports",
          kapten: "PlayerOne",
          roster: ["PlayerOne", "Striker99", "MageLord", "TankerZ", "SupportX"],
          logo: "https://dummyimage.com/300x300/000/fff&text=Alpha+Logo"
        };
        await kv.set('tim_alpha', dataDummy);

        // Mengambil data dari database
        const dataTim = await kv.get('tim_alpha');

        if (!dataTim) {
          return Response.json({
            type: 4,
            data: { content: '❌ Gagal mengambil data tim dari database!' }
          });
        }

        const daftarPemain = dataTim.roster.map(pemain => `• ${pemain}`).join('\n');
        const balasanDiscord = `🛡️ **INFORMASI TIM: ${dataTim.nama_tim}**\n\n**👑 Kapten:** ${dataTim.kapten}\n\n**👥 Daftar Roster:**\n${daftarPemain}\n\n**🖼️ Logo Tim:**\n${dataTim.logo}`;

        return Response.json({ 
          type: 4, 
          data: { content: balasanDiscord } 
        });
      }
    }

    return Response.json({ error: 'Unknown Interaction' }, { status: 400 });

  } catch (error) {
    return new Response('Server Error', { status: 500 });
  }
}
