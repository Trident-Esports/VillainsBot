const VillainsEmbed = require('../../classes/embed/vembed.class')
const VillainsEvent = require('../../classes/event/vevent.class')

module.exports = class MessageEvent extends VillainsEvent {
    constructor() {
        super('message')
    }

    async run(handler, message) {
        // Check Prefix
        if (message.content.slice(0,handler.options.prefix.length) !== handler.options.prefix) {
            // Special Cases

            // Hi
            for (let check of [
              "hello",
              "hi",
              "hey"
            ]) {
                if (message.content.toLowerCase() === check) {
                    if (message.author.bot) return;
                        else message.channel.send(`Hello there, <@${message.author.id}>!`);
                }
            }

            // LOL
            let blacklist = {
                guildIDs: [
                    "788021898146742292"  // Villains Esports
                ]
            }
            if (message.content.toLowerCase().includes('lol')) {
                if (message.author.bot || (blacklist.guildIDs.includes(message.guild.id))) {
                    return
                }
                message.channel.send('https://i.kym-cdn.com/photos/images/newsfeed/002/052/362/aae.gif');
            }

            // No Special Case
            return
        } else if (message.content == handler.options.prefix) {
            // Message is only prefix
            let props = {
                caption: { text: "VillainsBot" },
                title: { text: "Error" },
                description: "Please send a proper command."
            }
            let embed = new VillainsEmbed(props);
            message.channel.send(embed)
            return;
        }

        // Get Args
        const args = message.content.slice(handler.options.prefix.length).split(/ +/);

        // Get Command
        const cmd = args.shift().toLowerCase();

        // Search for Command
        const command = handler.client.commands.get(cmd) || handler.client.commands.find(a => a.aliases && a.aliases.includes(cmd));

        if (!(command?.name)) {
            // Didn't find a name for submitted Command
            console.log(`No name found for command! '${cmd}' given.`)
            console.log(command)
            return
        }

        if (typeof command.run === "function") {
            // If it's a a-djs-style func, run it
            let adjs = new command.constructor()
            adjs.run(handler.client, message, args, cmd)
        }
    }
}
