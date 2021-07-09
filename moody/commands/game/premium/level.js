const GameCommand = require('../../../classes/gamecommand.class');

module.exports = class LevelCommand extends GameCommand {
    constructor() {
        let comprops = {
            name: 'level',
            aliases: ['lvl'],
            category: 'premium',
            description: 'Checks the Users Level',
            extensions: [ "levels", "xpboost" ]
        }
        super(comprops)
    }
    async action(client, message) {
        const loaded = this.inputData.loaded

        const levelData = await this.Levels.fetch(loaded.id, 1);
        if (!levelData) {
            this.error = true
            this.props.description = "This user doesn't have a Level.😢"
        }

        if (!(this.error)) {
            const XPBoostData = await this.XPBoostModel.findOne({
                userID: loaded.id
            });

            this.props.description = `This is <@${loaded.id}>'s Level`
            this.props.fields = [
                {
                    name: `${this.emojis.level}${levelData.level}`,
                    value: "Level",
                    inline: true
                },
                {
                    name: `${this.emojis.xp}${levelData.xp.toLocaleString("en-AU")} / ${this.Levels.xpFor(levelData.level + 1).toLocaleString("en-AU")}`,
                    value: "XP",
                    inline: true
                },
                {
                    name: `${this.emojis.xpboost}${XPBoostData.xpboost}%`,
                    value: "XPBoost",
                    inline: false
                }
            ]
        }
    }
}
