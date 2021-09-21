// @ts-check

const { Channel, Client, MessageEmbed } = require('discord.js');
const { Command, CommandInfo, CommandoMessage } = require('discord.js-commando');
const VillainsEmbed = require('../embed/vembed.class');
const SlimEmbed = require('../embed/vslimbed.class');

const pagination = require('discord.js-pagination');
const fs = require('fs');

/**
 * @class
 * @classdesc Build a Villains-branded Command
 * @this {VillainsCommand}
 * @extends {Command}
 * @public
 */
module.exports = class VillainsCommand extends Command {
    /**
     * @type {boolean} Development Mode?
     * @private
     */
    #DEV;       // Private: DEV flag
    /**
     * @type {Object.<string, any>} List of properties for embed manipulation
     * @private
     */
    #props;     // Private: Props to send to VillainsEmbed
    /**
     * @type {Array.<VillainsEmbed>} Array of embeds to print as pages or singly
     * @private
     */
    #pages;     // Private: Pages to print
    /**
     * @type {Object.<string, string>} Flags for user management
     * @private
     */
    #flags;     // Private: Flags for user management
    /**
     * @type {boolean} Set to true if we threw an error
     * @private
     */
    #error;     // Private: Error Thrown
    /**
     * @type {Object.<string, Array.<string>>} Global Error Message strings
     * @private
     */
    #errors;    // Private: Global Error Message strings
    /**
     * @type {Channel} Channel to send embeds to
     * @private
     */
    #channel;   // Private: Channel to send VillainsEmbed to
    /**
     * @type {string} Channel to send embeds to
     * @private
     */
    #channelName;   // Private: Channel to send VillainsEmbed to
    /**
     * @type {Object.<string, any>} Processed input data
     * @private
     */
    #inputData; // Private: Command Inputs

    /**
     * @typedef {Object} EmbedField
     * @property {string} name Field Name
     * @property {string} value Field Value
     * @property {boolean} inline Inline?
     */
    /**
     * @typedef {Object} Player Player
     * @property {string} name The name
     * @property {string} url The URL
     * @property {string} avatar The Avatar
     */
    /**
     * @typedef {Object.<string, any>} EmbedProps Embed Properties
     * @property {boolean}                      full                    Print Full Embed
     * @property {string}                       color                   Stripe color
     * @property {{text: string}}               caption                 Caption text
     * @property {{text: string, url: string}}  title                   Title text & url
     * @property {string}                       thumbnail               Thumbnail url
     * @property {string}                       description             Body text
     * @property {Array.<EmbedField>}           fields                  Embed Fields
     * @property {string}                       image                   Body Image
     * @property {{msg: string, image: string}} footer                  Footer text & image
     * @property {number | boolean}             timestamp               Timestamp for footer
     * @property {boolean}                      error                   Print error format
     * @property {{bot: Player, user: Player, target: Player}} players  Players
     */

    /**
     * Constructor
     * @param {CommandInfo | Object} comprops List of command properties from child class
     * @param {EmbedProps} props              Local list of command properties
     */
    constructor(client, comprops = { name: "", group: "", memberName: "", description: "" }, props = {}) {
        // Create a parent object
        super(
            // @ts-ignore
            client,
            {...comprops}
        )

        /**
         * Embed Properties
         * @type {EmbedProps}
         */
        this.props = {...props}

        /**
         * Force full Embed
         * @type {boolean}
         */
        if (!(this?.props?.full)) {
            this.props.full = true
        }
        if (!(this?.props?.caption?.text)) {
            if (!(props?.caption)) {
                this.props.caption = {}
            }
            this.props.caption.text = this.name.charAt(0).toUpperCase() + this.name.slice(1)
        }
        if (!(this?.props?.title)) {
            this.props.title = {}
        } else if (props?.title) {
            this.props.title = props.title
        }
        let undefDesc = (!(this?.props?.description))
        let emptyDesc = (!(undefDesc)) &&  (typeof this.props.description === "object")
        let noDesc = (!(undefDesc)) && (this.props.description.trim() == "")
        if (undefDesc || emptyDesc || noDesc) {
            this.props.description = ""
        }
        if (!(this?.props?.footer)) {
            this.props.footer = {}
        }
        if (!(this?.props?.players)) {
            this.props.players = {}
        }
        if (!(this?.props?.flags)) {
            this.flags = {}
        } else {
            this.flags = this.props.flags
        }

        for (let [player, setting] of Object.entries({user:"default",target:"optional",bot:"invalid",search:"valid"})) {
            if (!(Object.keys(this.flags).includes(player))) {
                this.flags[player] = setting
            }
        }

        if (this?.props?.null && this.props.null) {
            this.null = true
        }

        let GLOBALS = null
        const defaults = JSON.parse(fs.readFileSync("./src/dbs/defaults.json", "utf8"))
        try {
            GLOBALS = JSON.parse(fs.readFileSync("./src/PROFILE.json", "utf8"))
            GLOBALS = (
                GLOBALS?.profile &&
                GLOBALS?.profiles &&
                GLOBALS.profile in GLOBALS.profiles
            ) ?
                GLOBALS.profiles[GLOBALS.profile]:
                defaults
        } catch(err) {
            console.log("VCommand: PROFILE manifest not found!")
            process.exit(1)
        }
        this.DEV = GLOBALS.DEV

        /**
         * Command prefix
         * @type {string}
         */
        this.prefix = defaults.prefix

        /**
         * List of pages of Embeds
         * @type {Array.<(VillainsEmbed)>}
         */
        this.pages = []

        /**
         * Print Error
         * @type {boolean}
         */
        this.error = false

        /**
         * Global Error Strings
         * @type {Object.<string, Array.<string>>}
         */
        this.errors = JSON.parse(fs.readFileSync("./src/dbs/errors.json", "utf8"))

        /** @type {Object.<string, any>} Data gathered from input management */
        this.inputData = {}

        // Bail if we fail to get server profile information
        if (!GLOBALS) {
            this.error = true
            this.props.description = "Failed to get server profile information."
            return
        }
        // Bail if we fail to get bot default information
        if (!defaults) {
            this.error = true
            this.props.description = "Failed to get bot default information."
            return
        }
        // Bail if we fail to get command prefix
        if (!this.prefix) {
            this.error = true
            this.props.description = "Failed to get command prefix."
            return
        }
        // Bail if we fail to get error message information
        if (!(this.errors)) {
            this.error = true
            this.props.description = "Failed to get error message information."
            return
        }
    }

    get DEV() {
        return this.#DEV
    }
    set DEV(DEV) {
        this.#DEV = DEV
    }

    get props() {
        return this.#props
    }
    set props(props) {
        this.#props = props
    }

    get pages() {
        return this.#pages
    }
    set pages(pages) {
        this.#pages = pages
    }

    get flags() {
        return this.#flags
    }
    set flags(flags) {
        this.#flags = flags
    }

    get error() {
        return this.#error
    }
    set error(error) {
        this.#error = error
    }

    get errors() {
        return this.#errors
    }
    set errors(errors) {
        this.#errors = errors
    }

    get channel() {
        return this.#channel
    }
    set channel(channel) {
        this.#channel = channel
    }

    get channelName() {
        return this.#channelName
    }
    set channelName(channelName) {
        this.#channelName = channelName
    }

    get inputData() {
        return this.#inputData
    }
    set inputData(inputData) {
        this.#inputData = inputData
    }

    /**
     * Get Channel object based on general key name
     * @param {CommandoMessage} message Message that called the command
     * @param {string} channelType Key for channel to get from database
     * @returns {Promise.<Channel>} Found channel object
     */
    async getChannel(message, channelType) {
        // Get botdev-defined list of channelIDs/channelNames
        let channelIDs = JSON.parse(fs.readFileSync("./src/dbs/" + message.guild.id + "/channels.json","utf8"))
        let channelID = this.channelName
        let channel = null

        if (channelIDs) {
            // Get channel IDs for this guild
            if (Object.keys(channelIDs).includes(message.guild.id)) {
                // If the channel type exists
                if (Object.keys(channelIDs[message.guild.id]).includes(channelType)) {
                    // Get the ID
                    channelID = channelIDs[message.guild.id][channelType]
                }
            }
        }

        // If the ID is not a number, search for a named channel
        if (typeof channelID == "string") {
            channel = message.guild.channels.cache.find(c => c.name === channelID);
        } else {
            // Else, search for a numbered channel
            channel = message.guild.channels.cache.find(c => c.id === channelID);
        }

        if (channel?.deleted && channel.deleted) {
            channel = null
        }

        return channel
    }

    /**
     * Return emoji if present, otherwise return emoji name
     * @param {string} emojiKey
     * @returns {Promise.<string>}
     */
    async getEmoji(emojiKey, emojis) {
        let ret = ""

        let emojiName = emojiKey
        if (emojiName == "val") {
            emojiName = "valorant"
        }

        let foundEmoji = false

        let cachedEmoji = emojis.cache.find(emoji => emoji.name === emojiName)
        if (cachedEmoji?.available) {
            foundEmoji = true
            ret += `${cachedEmoji}`;
        }

        if (!foundEmoji) {
            if (emojiKey) {
                ret += '[' + emojiKey + ']'
            }
        }

        return ret
    }

    /**
     * Sanitizes input for Markdown
     * @param {string} input String to sanitize
     * @returns {Promise.<string>}
     */
    async sanitizeMarkdown(input) {
        let output = input.replace(/[\*\_\~\`]/g, '\\$&')
        return output
    }

    /**
     * Sanitizes input for Markdown
     * @param {Array.<string>|string} input String to sanitize
     * @returns {string}
     */
    checkJoin(input) {
        return typeof input === "object" ? input.join(" ") : input
    }

    /**
     *
     * @param {CommandoMessage} message Message that called the command
     * @param {Array.<string>} args Command-line args
     * @param {Object.<string, string>} flags Flags for user management
     */
    async processArgs(message, args, flags = { user: "default", target: "invalid", bot: "invalid", search: "valid" }) {
        let foundHandles = { players: {}, invalid: "", flags: flags }

        let user = message?.author ? message.author : null
        let mention = message?.mentions?.members ? message.mentions.members.first() : null
        let search = (args && (args.length > 0) && (!(mention))) ? await message.guild.members.fetch({ query: await this.checkJoin(args), limit: 1 }) : undefined
        let loaded = undefined
        let padding = 9
        let debugout = [ `Flags:`.padEnd(padding) + JSON.stringify(flags) ]

        // If we have a User
        if (user) {
            // Load the User as the Target
            // Set the User Player
            loaded = user
            foundHandles.user = loaded
            foundHandles.loadedType = "user"
            foundHandles.players.user = {
                name: loaded.username,
                avatar: loaded.displayAvatarURL({ format: "png", dynamic: true })
            }
            // debugout.push(`User:`.padEnd(padding) + `<@${loaded.id}>`)
            debugout.push(`User:`.padEnd(padding) + `${loaded.username}`)
        }

        // If we have a Mention
        if (mention) {
            // Load the Mention as the Target
            loaded = mention.user
            foundHandles.mention = loaded
            foundHandles.loadedType = "mention"
            // debugout.push(`Mention:`.padEnd(padding) + `<@${loaded.id}>`)
            debugout.push(`Mention:`.padEnd(padding) + `${loaded.username}`)
        }

        // If we got stuff to Search for
        if (search) {
            // We already ran the search
            let tmp = search.size > 0
            // If there's results, get the first result
            // Otherwise, just gracefully degrade to our current Target
            loaded = tmp ? search.first() : loaded
            if (tmp && loaded) {
                // @ts-ignore
                if (loaded?.nickname) {
                    // @ts-ignore
                    debugout.push(`Terms:`.padEnd(padding) + `[Nick:${loaded.nickname}] [UName:${loaded.user.username}]`)
                }
                // @ts-ignore
                if (loaded?.user) {
                    // @ts-ignore
                    loaded = loaded.user
                }
                foundHandles.search = loaded
                foundHandles.loadedType = "search"
                // debugout.push(`Search:`.padEnd(padding) + `<@${loaded.id}>`)
                debugout.push(`Search:`.padEnd(padding) + `${loaded.username}`)
            }
        }
        debugout.push(`Type:`.padEnd(padding) + `${foundHandles.loadedType}`)

        // If we have calculated a Target
        if (loaded) {
            // Make sure Loaded isn't from an Invalid source
            for (let handleType of ["mention", "search", "user", "target"]) {
                if ((foundHandles.loadedType == handleType) && (this.flags[handleType] == "invalid")) {
                    foundHandles.invalid = handleType
                }
            }
            if (this.flags.user == "invalid" && loaded.id == user.id) {
                foundHandles.invalid = "user"
            }

            // If Loaded is a Bot
            // If Bot has been specified as a Valid source
            // Get Bot whitelist
            let USERIDS = {}
            try {
                USERIDS = JSON.parse(fs.readFileSync("./src/dbs/userids.json","utf8"))
            } catch {
                // Bail if we fail to get UserIDs list
                this.error = true
                this.props.description = "Failed to get UserIDs list."
                return
            }
            // Fake an empty Bot Whitelist
            if (!(USERIDS?.botWhite)) {
                USERIDS["botWhite"] = []
            }
            if (["default","required","optional"].includes(this.flags.bot)) {
                // Do... something?
            } else if (loaded?.bot && loaded.bot && (!(USERIDS?.botWhite.includes(loaded.id)))) {
                // If Bot has been specified as in Invalid source
                // Set Invalid because Bot
                foundHandles.invalid = "bot"
            }

            foundHandles.loaded = loaded

            // Set Loaded as Target Player
            if (foundHandles.invalid == "") {
                foundHandles.players.target = {
                    name: loaded.username,
                    avatar: loaded.displayAvatarURL({ format: "png", dynamic: true })
                }
            }
            // debugout.push(`Loaded:`.padEnd(padding) + `<@${loaded.id}>`)
            debugout.push(`Loaded:`.padEnd(padding) + `${loaded.username}`)
        }

        debugout.push(`Invalid:`.padEnd(padding) + `${foundHandles.invalid}`)

        // If we used a Search Term, do our best to remove it from Args list
        try {
            if (args && args.length > 0) {
                debugout.push(`Args:`.padEnd(padding) + `[${typeof args === "object" ? this.checkJoin(args) : args}]`)
                let re = /(?:\<)(?<PingChan>[\@\#]{1})(?<UsrRole>[\!\&]?)(?<ItemID>[\d]*)(?:\>)/
                let check = this.checkJoin(args)
                let matches = check.match(re)
                let cleansed = ""
                // debugout.push(`Matches:`.padEnd(padding) + `${matches}`)
                if (matches) {
                    matches.shift()
                    cleansed = this.checkJoin(args).trim().replace(`<${matches.join("")}>`,"")
                } else {
                    cleansed = this.checkJoin(args).trim()
                    for (let check of [
                        `${loaded.username}#${loaded.discriminator}`,
                        loaded.username,
                        `${loaded.username}#${loaded.discriminator}`.toLowerCase(),
                        loaded.username.toLowerCase()
                    ]) {
                        cleansed = cleansed.trim().replace(check,"")
                    }
                }
                foundHandles.argsArr = cleansed.trim().split(" ").filter(function(e) { return e != null && e != "" })
                cleansed = foundHandles.argsArr.join(" ")
                foundHandles.args = cleansed.trim().split(" ")
                debugout.push(`Clean:`.padEnd(padding) + `[${cleansed}]`)
            } else {
                foundHandles.args = [ "" ]
            }
        } catch(e) {
            console.log("---")
            console.log(e)
            console.log("---")
            console.log(debugout.join("\n"))
        }

        if (this.DEV && false) {
            console.log("---")
            console.log(debugout.join("\n"))
        }

        // Errors based on Invalid Source
        if (foundHandles?.invalid && foundHandles.invalid != "") {
            this.error = true
            foundHandles.title = { text: "Error" };
            switch (foundHandles.invalid) {
                case "user":
                    foundHandles.description = this.errors.cantActionSelf.join("\n");
                    break;
                case "target":
                    foundHandles.description = this.errors.cantActionOthers.join("\n");
                    break;
                case "bot":
                    foundHandles.description = this.errors.cantActionBot.join("\n");
                    break;
                case "mention":
                    foundHandles.description = this.errors.cantActionMention.join("\n");
                    break;
                case "search":
                    foundHandles.description = this.errors.cantActionSearch.join("\n");
                    break;
                default:
                    break;
            }
        }

        this.inputData = foundHandles
        this.props.players = foundHandles.players
        this.props.title = foundHandles?.title ? foundHandles.title : this.props.title
        this.props.description = foundHandles?.description ? foundHandles.description : this.props.description
    }

    /**
     * Execute command and build embed
     *
     * @param {CommandoMessage} message Message that called the command
     */
    async action(client, message) {
        // Do nothing; command overrides this
        // If the thing doesn't modify anything, don't worry about DEV flag
        // If the thing does modify stuff, use DEV flag to describe action instead of performing it
        if(! this.DEV) {
            // Do the thing
        } else {
            // Describe the thing
        }
    }

    /**
     * Build pre-flight characteristics of Command
     *
     * @param {CommandoMessage} message Message that called the command
     */
    async build(client, message, args) {
        if(!(this.error)) {
            await this.action(message, args)
        }
    }

    /**
     * Send pages to Discord Client
     *
     * @param {CommandoMessage} message Message that called the command
     * @param {Array.<(VillainsEmbed | CommandoMessage)> | VillainsEmbed} pages Pages to send to client
     * @param {Array.<string>} emojis Emoji for pagination
     * @param {number} timeout Timeout for disabling pagination
     * @param {boolean} forcepages Force pagination
     */
    async send(message, pages = [new VillainsEmbed({"description":"No pages sent!"})], emojis = ["◀️", "▶️"], timeout = 600000, forcepages = false) {
        if (!this.channel) {
            this.channel = message.channel
        }
        // If pages are being forced, set defaults
        if (forcepages) {
            emojis = ["◀️", "▶️"]
            timeout = 600000
        }

        // If we have an array of page(s)
        if (Array.isArray(pages)) {
            // If it's just one and we're not forcing pages, just send the embed
            if ((pages.length <= 1) && !forcepages) {
                // @ts-ignore
                // return this.channel.send({ embeds: [pages[0]] }) // discord.js v13
                return this.channel.send(pages[0])
            } else {
                // Else, set up for pagination
                // Sanity check for emoji pageturners
                let filler = "🤡"
                if (emojis.length !== 2) {
                    if (emojis.length == 1) {
                        emojis.push(filler)
                    } else if (emojis.length >= 3) {
                        emojis = emojis.slice(0,2)
                    }
                }
                if (emojis[0] == emojis[1]) {
                    emojis = emojis.slice(0,1)
                    emojis.push(filler)
                }
                // Send the pages
                // return await pagination(message, pages, emojis, timeout) // discord.js v13
                //FIXME: discord-pagination doesn't support discord.js v13 yet
                //TODO: Check on discord-pagination and see if it supports discord.js v13 yet
                return await pagination(message, pages, emojis, timeout)
            }
        } else {
            // Else, it's just an embed, send it
            // @ts-ignore
            // return this.channel.send({ embeds: [ pages ] }) // discord.js v13
            return this.channel.send(pages)
        }
    }

    /**
     * Run the command
     *
     * @param {CommandoMessage} message Message that called the command
     * @param {Array.<string>} args Command-line args
     * @returns {Promise.<any>}
     */
    // @ts-ignore
    async run(message, args) {
        // @ts-ignore
        let client = typeof message === Client ? message : message.client
        // Process arguments
        await this.processArgs(message, args, this.flags)

        // Build the thing
        await this.build(client, message)

        // If we have an error, make it errortastic
        if (this.error) {
            if (this.props?.title) {
                this.props.title.text = "Error"
            } else if (this.props?.caption) {
                this.props.caption.text = "Error"
            }
        }

        // If we just got an embed, let's check to see if it's a full page or slim page
        // Toss it in pages as a single page
        if(this.pages.length == 0) {
            if(this.props?.full && this.props.full) {
                this.pages.push(new VillainsEmbed({...this.props}))
            } else {
                this.pages.push(new SlimEmbed({...this.props}))
            }
        }

        // this.null is to be set if we've already sent the page(s) somewhere else
        // Not setting this.null after sending the page(s) will send the page(s) again
        if ((!(this?.null)) || (this?.null && (!(this.null)))) {
            return await this.send(message, this.pages)
        }
    }

    async test(client, message) {
        console.log(`No test for ${message.content}`)
    }
}
