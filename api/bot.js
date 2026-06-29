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

  // 1. AUTOCOMPLETE
  if (message.type === 4) {
    const userInput = message.data.options[0].value.toLowerCase();
    const semuaTim = await kv.keys('*');
    const filtered = semuaTim.filter(t => t.includes(userInput)).slice(0, 25);
    return Response.json({ type: 8, data: { choices: filtered.map(t => ({ name: t, value: t })) } });
  }

  // 2. SLASH COMMAND: /setup-all
  if (message.type === 2 && message.data.name === 'setup-all') {
    const CAT_ID = "1521074286574567504"; 
    const teams = [
      { key: "tim_1", nama_tim: "Alpha", hex_color: "#E74C3C", ketua: "alroyyuan" },
      { key: "tim_2", nama_tim: "Beta", hex_color: "#3498DB", ketua: "saputradroy" },
      { key: "tim_3", nama_tim: "Gamma", hex_color: "#2ECC71", ketua: "obi_71" }
    ];

    for (const team of teams) {
      await kv.set(team.key, team);
      
      // Buat Role
      const roleRes = await fetch(`https://discord.com/api/v10/guilds/${message.guild_id}/roles`, {
        method: 'POST', headers: { 'Authorization': `Bot ${process.env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: team.nama_tim, color: parseInt(team.hex_color.replace('#', ''), 16) })
      });
      const role = await roleRes.json();

      // Buat Channel di dalam Kategori
      await fetch(`https://discord.com/api/v10/guilds/${message.guild_id}/channels`, {
        method: 'POST', headers: { 'Authorization': `Bot ${process.env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: team.nama_tim.toLowerCase(), type: 0, parent_id: CAT_ID,
          permission_overwrites: [
            { id: message.guild_id, type: 0, deny: '1024' }, // Lock everyone
            { id: role.id, type: 0, allow: '1024' } // Open for team
          ]
        })
      });
    }
    return Response.json({ type: 4, data: { content: "✅ Setup Tim, Role, & Channel Selesai!" } });
  }

  // 3. SLASH COMMAND: /roster
  if (message.type === 2 && message.data.name === 'roster') {
    const timId = message.data.options[0].value;
    const data = await kv.get(timId);
    if (!data) return Response.json({ type: 4, data: { flags: 64, content: "❌ Tim tidak ditemukan!" } });

    return Response.json({
      type: 4,
      data: {
        flags: 64,
        embeds: [{
          title: `🛡️ ${data.nama_tim}`,
          color: parseInt(data.hex_color.replace('#', ''), 16),
          description: `**Ketua:** ${data.ketua}`,
          fields: [{ name: "Status", value: "Role & Private Channel Created", inline: false }]
        }]
      }
    });
  }
}
