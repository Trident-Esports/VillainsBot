const fs = require('fs');

const TeamListingCommand = require('../../classes/teamlistingcommand.class');
const VillainsEmbed = require('../../classes/vembed.class');

module.exports = class RosterCommand extends TeamListingCommand {
    constructor() {
        super(
            {
                name: "roster",
                category: "information",
                description: "Display a roster"
            }
        )
    }

    async run(client, message, args) {
        let gameID = args[0] ? args[0].toLowerCase() : ""
        let teamType = args[1] ? args[1].toLowerCase() : ""
        let filepath = "./rosters/dbs"
        let profiles = []
        let socials = JSON.parse(fs.readFileSync("./rosters/dbs/socials/users.json", "utf8"))

        if (gameID.indexOf("staff") == -1) {
            filepath += "/teams"
        }

        if (gameID != "") {
            if (gameID.startsWith("cs")) {
                // cs -> csgo
                gameID = "csgo"
            } else if (gameID.startsWith("r6")) {
                // r6 -> r6s
                gameID = "r6s"
            } else if (gameID == "rl") {
                // rl -> rocketleague
                gameID = "rocketleague"
            } else if (gameID.startsWith("val")) {
                // valorant -> val
                gameID = "val"
            }
            filepath += '/' + gameID
            if (teamType != "") {
                // show team
                filepath += '/' + teamType + ".json"
                profiles.push(filepath)
            } else {
                // show game
                profiles = this.walk(filepath)
            }
        } else {
            // show all
            profiles = this.walk(filepath)
        }

        let pages = []

        for (filepath of profiles) {
            let props = { caption: {}, author: {}, players: {} }
            let profile = JSON.parse(fs.readFileSync(filepath, "utf8"))
            let defaults = JSON.parse(fs.readFileSync("./dbs/defaults.json", "utf8"))

            // Title
            props.caption.text = profile.title

            let emoji = ""
            let emojiMatch = filepath.match(/(?:\.\/rosters\/dbs\/teams\/)([^\/]*)(.*)/)
            let emojiKey = emojiMatch ? emojiMatch[1] : ""
            let emojiName = emojiKey
            if (emojiName == "val") {
                emojiName = "valorant"
            }

            let foundEmoji = false


            let cachedEmoji = message.guild.emojis.cache.find(emoji => emoji.name === emojiName);
            if (cachedEmoji?.available) {
                foundEmoji = true
                emoji += `${cachedEmoji}`;
            }

            if (!foundEmoji) {
                if (emojiKey) {
                    emoji += '[' + emojiKey + "] "
                }
            }

            props.description = emoji

            // Team URL
            if (profile?.url && profile.url != "") {
                props.caption.url = profile.url
            }
            let tourneyID = 0
            let teamID = 0
            if (profile?.team?.tourneyID) {
                tourneyID = profile.team.tourneyID
            }
            if (profile?.team?.lpl?.tourneyID) {
                tourneyID = profile.team.lpl.tourneyID
            }
            if (profile?.team?.teamID) {
                teamID = profile.team.teamID
            }
            if (profile?.team?.lpl?.teamID) {
                teamID = profile.team.lpl.teamID
            }
            if (teamID > 0) {
                let url = "http://villainsoce.mymm1.com/"
                let name = "LPL Team #"
                if(tourneyID > 0) {
                    url += "tourney/" + tourneyID + '/'
                    name += tourneyID + '/'
                }
                if(tourneyID == 0) {
                    url += "team/"
                }
                url += teamID
                name += teamID
                props.description += `*[${name}](${url} '${url}')*`
                props.caption.url = url
            }

            let tmp = {
                name: props.caption.text,
                url: props.caption.url,
                avatar: defaults.thumbnail
            }
            props.players = {
                bot: {...tmp},
                user: {...tmp}
            }

            // Team Avatar
            let avatar = ""
            if (profile?.team?.avatar && profile.team.avatar != "") {
                avatar = profile.team.avatar
            }
            if (profile?.team?.lpl?.avatar && profile.team.lpl.avatar != "") {
                avatar = profile.team.lpl.avatar
            }
            if (avatar != "") {
                props.players.target = {...props.players.user}
                props.players.target.avatar = avatar
            }

            let rosterEmbed = new VillainsEmbed({...props})

            // Team Members
            if (profile?.members) {
                if (filepath.includes("teams")) {
                    let management = JSON.parse(fs.readFileSync("./rosters/dbs/staff/management.json","utf8"))
                    if (management?.members) {
                        if (Object.keys(management.members).includes(emojiKey)) {
                            if (management.members[emojiKey]?.users) {
                                let newmembers = {
                                    managers: {
                                        title: "Manager",
                                        users: management.members[emojiKey].users
                                    },
                                    ...profile.members
                                }
                                profile.members = newmembers
                            }
                        }
                    }
                }
                for (let [groupName, groupAttrs] of Object.entries(profile.members)) {
                    let userSTR = ""
                    if (groupAttrs?.users?.length == 0) {
                        groupAttrs.users = [ "TBA" ]
                    }
                    for (let user of groupAttrs.users) {
                        let social = socials[user]
                        let name = user.charAt(0).toUpperCase() + user.slice(1)
                        let userURL = ""
                        if (name != "TBA") {
                            if (!social) {
                                console.log("No socials for:",user)
                            } else {
                                if (social?.stylized && social.stylized.trim() != "") {
                                    name = social.stylized
                                }
                                if (social?.twitter && social.twitter.trim() != "") {
                                    userURL = "https://twitter.com/" + social.twitter
                                } else if (social?.twitch && social.twitch.trim() != "") {
                                    userURL = "https://twitch.tv/" + social.twitch
                                } else if (social?.instagram && social.instagram.trim() != "") {
                                    userURL = "https://instagram.com/" + social.instagram
                                }
                            }
                        }
                        if (userURL != "") {
                            userSTR += `[${name}](${userURL} '${userURL}')`
                        } else {
                            userSTR += name
                        }
                        userSTR += "\n"
                    }
                    rosterEmbed.addField(
                        groupAttrs.title,
                        userSTR,
                        false
                    )
                }

                pages.push(rosterEmbed)
            }

        }
        this.send(message, pages)
    }
}
