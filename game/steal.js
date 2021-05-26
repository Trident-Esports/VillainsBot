const profileModel = require("../models/profileSchema");

module.exports = {
  name: "steal",
  aliases: [],
  permissions: ["ADMINISTRATOR"],
  description: "steals a players coins",
  async execute(message, args, cmd, client, discord, profileData) {
    if (message.member.id != "532192409757679618" && message.member.id != "692180465242603591") return message.channel.send(`Sorry only **Noongar1800** and **PrimeWarGamer** can run this command 😔`);
    if (!args.length) return message.channel.send("You need to mention a player to steal their coins");
    const amount = args[1];
    const target = message.mentions.users.first();
    if (!target) return message.channel.send("That user does not exist");

    if (amount % 1 != 0 || amount <= 0) return message.channel.send("Steal amount must be a whole number");

    try {
      const targetData = await profileModel.findOne({ userID: target.id });
      if (!targetData) return message.channel.send(`This user doesn't exist in the db`);

      await profileModel.findOneAndUpdate(
        {
          userID: target.id,
        },
        {
          $inc: {
            gold: -amount,
          },
        }
      );

      return message.channel.send(`This player has mysteriously lost ${amount} Gold!`);
    } catch (err) {
      console.log(err);
    }
  },
};