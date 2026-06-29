import { verifyKey } from 'discord-interactions';
import { kv } from '@vercel/kv';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const body = await req.text();
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');

  const isValid = await verifyKey(body, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
  if (!isValid) return new Response('Signature Invalid', { status: 401 });

  const message = JSON.parse(body);

  // 1. AUTOCOMPLETE (Sistem Dropdown Otomatis)
  if (message.type === 4) {
    const userInput = message.data.options[0].value.toLowerCase();
    // Kita ambil semua key tim dari KV
    const semuaTim = await kv.keys('*'); 
    const filtered = semuaTim.filter(t => t.startsWith(userInput)).slice(0, 25);
    
    return Response.json({
      type: 8,
      data: { choices: filtered.map(t => ({ name: t, value: t })) }
    });
  }

  // 2. SLASH COMMAND /roster
  if (message.type === 2 && message.data.name === 'roster') {
    const timId = message.data.options[0].value;
    const data = await kv.get(timId);

    if (!data) {
      return Response.json({ type: 4, data: { flags: 64, content: "Tim tidak ditemukan!" } });
    }

    return Response.json({
      type: 4,
      data: {
        flags: 64, // Hanya user yang melihat
        embeds: [{
          title: `🛡️ ${data.nama_tim}`,
          color: parseInt(data.hex_color.replace('#', ''), 16),
          thumbnail: { url: data.logo },
          fields: [
            { name: "👑 Ketua", value: data.ketua, inline: true },
            { name: "👥 Roster", value: data.roster.join('\n') }
          ]
        }]
      }
    });
  }
}
