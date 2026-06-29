import { verifyKey } from 'discord-interactions';
import { kv } from '@vercel/kv';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const body = await req.text();
  const message = JSON.parse(body);
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  // 1. AUTOCOMPLETE
  if (message.type === 4) {
    const userInput = message.data.options[0].value.toLowerCase();
    const semuaTim = await kv.keys('*');
    const filtered = semuaTim.filter(t => t.includes(userInput)).slice(0, 25);
    return Response.json({ type: 8, data: { choices: filtered.map(t => ({ name: t, value: t })) } });
  }

  // 2. SLASH COMMAND: /setup-all (TOMBOL AJAIB)
  if (message.type === 2 && message.data.name === 'setup-all') {
    const teams = Array.from({ length: 5 }, (_, i) => ({
      key: `tim_${i + 1}`,
      nama_tim: `Team ${i + 1}`,
      hex_color: "#E74C3C",
      logo: "https://img.magnific.com/vektor-gratis/logo-vektor-gradien-warna-warni-burung_343694-1365.jpg",
      ketua: "Ketua A",
      wakil: "Wakil B",
      roster: ["IGN1 (111-222)", "IGN2 (333-444)"]
    }));

    for (const team of teams) {
      // Simpan ke KV
      await kv.set(team.key, team);
      // Buat Role di Discord
      await rest.post(Routes.guildRoles(message.guild_id), {
        body: { name: team.nama_tim, color: 15158332, mentionable: true }
      });
    }
    return Response.json({ type: 4, data: { content: "✅ 5 Tim Dummy & Role berhasil dibuat!" } });
  }

  // 3. SLASH COMMAND: /roster
  if (message.type === 2 && message.data.name === 'roster') {
    const timId = message.data.options[0].value;
    const data = await kv.get(timId);
    if (!data) return Response.json({ type: 4, data: { flags: 64, content: "Tim tidak ditemukan!" } });

    return Response.json({
      type: 4,
      data: {
        flags: 64,
        embeds: [{
          title: `🛡️ ${data.nama_tim}`,
          color: parseInt(data.hex_color.replace('#', ''), 16),
          thumbnail: { url: data.logo },
          description: `**Ketua:** ${data.ketua}\n**Wakil:** ${data.wakil}`,
          fields: [{ name: "Players (IGN - ID)", value: data.roster.join('\n'), inline: false }]
        }]
      }
    });
  }
}
