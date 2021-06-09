const fs = require('fs');

const { Message, MessageEmbed } = require('discord.js')

let GLOBALS = JSON.parse(fs.readFileSync("PROFILE.json", "utf8"))
let defaults = JSON.parse(fs.readFileSync("dbs/defaults.json", "utf8"))
let DEV = GLOBALS.DEV;

let props = []

let stripe = defaults["stripe"]

switch (stripe) {
    default:
        stripe = "#B2EE17";
        break;
}

// Hack in my stuff to differentiate
if (DEV) {
    stripe = GLOBALS["stripe"]
    defaults.footer = GLOBALS.footer
}

props["stripe"] = stripe

module.exports = {
    name: 'suggestions',
    aliases: ['suggest', 'suggestion'],
    permissions: [],
    description: 'creates a suggestion!',
    execute(message, args, cmd, client, Discord) {
        let emoji = {
            "thumbsup": "👍",
            "thumbsdown": "👎"
        }
        let channelName = DEV ? "suggestions" : "❓suggestions❓"
        const channel = message.guild.channels.cache.find(c => c.name === channelName);
        if (!channel) return message.channel.send('suggestions channel does not exist!');

        let messageArgs = args.join(' ');
        const embed = new MessageEmbed()
            .setColor(props.stripe)
            .setAuthor(message.author.tag, message.author.displayAvatarURL({ dynamic: true }))
            .setDescription(messageArgs);

        if(DEV) {
            embed.setFooter(defaults.footer.msg, defaults.footer.image)
            .setTimestamp();
        }

        channel.send(embed).then((msg) => {
            msg.react(emoji.thumbsup);
            msg.react(emoji.thumbsdown);
            message.delete();
        }).catch((err) => {
            throw err;
        });
    }
}
