//@ts-check

const VillainsEvent = require('../../classes/event/vevent.class')
const fs = require('fs')

// Member Join
module.exports = class GuildMemberRemoveEvent extends VillainsEvent {
    constructor() {
        super('guildMemberRemove')
    }

    async run(client, member) {
        if (!(fs.existsSync("./src/dbs/" + member.guild.id))) {
            console.log(
                `Guild Member Remove:`.padEnd(25, " ") +
                `Guild Profile for '${member.guild.name}' (ID:${member.guild.id}) not found!`
            )
            return
        }

        const channel = await this.getChannel(member, "welcome")

        let consolePad = 20
        console.log("---")
        console.log("<<-MEMBER LEAVE---")
        console.log(
            "Guild:".padEnd(consolePad),
            `${member.guild.name} (ID:${member.guild.id})`
        )
        console.log(
            "Member:".padEnd(consolePad),
            `${member.user.username}#${member.user.discriminator} (ID:${member.user.id})`
        )
        console.log(
            "Leave Channel:".padEnd(consolePad),
            (
              channel
              ?
                `Yes (ID:${channel.id})` :
                "No"
            )
        )

        if (channel) {
            try {
                // Put into guild profile document
                // <@${member.user.id}> -> %%user%%
                let rules = [
                    `<@${member.id}> has just become a **Hero**.`
                ]
                // @ts-ignore
                // await channel.send({ content: rules.join("\n") }) // discord.js v13
                await channel.send(rules.join("\n"))
            } catch (err) {
                throw (err);
            }
        }
    }
}
