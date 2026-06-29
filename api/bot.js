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

  // 1. AUTOCOMPLETE: Membantu user memilih tim
  if (message.type === 4) {
    const userInput = message.data.options[0].value.toLowerCase();
    const semuaTim = await kv.keys('*');
    const filtered = semuaTim.filter(t => t.toLowerCase().includes(userInput)).slice(0, 25);
    
    return Response.json({
      type: 8,
      data: { choices: filtered.map(t => ({ name: t, value: t })) }
    });
  }

  // 2. SLASH COMMAND: /roster
  if (message.type === 2 && message.data.name === 'roster') {
    const timId = message.data.options[0].value;
    const data = await kv.get(timId);

    if (!data) {
      return Response.json({ type: 4, data: { flags: 64, content: `❌ Tim **${timId}** tidak ditemukan!` } });
    }

    // Mengolah roster (jika formatnya array, kita join dengan baris baru)
    const rosterList = Array.isArray(data.roster) ? data.roster.join('\n') : data.roster;

    return Response.json({
      type: 4,
      data: {
        flags: 64, // Ephemeral (hanya user yang melihat)
        embeds: [{
          title: data.nama_tim || timId,
          description: `*${data.slogan || 'No slogan'}*\n\n**Ketua** \u00A0 \u00A0 **Wakil** \u00A0 \u00A0 **Pelatih**\n${data.ketua || '-'} \u00A0 \u00A0 ${data.wakil || '-'} \u00A0 \u00A0 ${data.pelatih || '-'}`,
          color: parseInt((data.hex_color || '#ff0000').replace('#', ''), 16),
          thumbnail: { url: data.logo || '' },
          fields: [
            { 
              name: "Players", 
              value: rosterList, 
              inline: false 
            }
          ],
          footer: { text: `Diperbarui ${new Date().toLocaleDateString('id-ID')}` }
        }]
      }
    });
  }
}
