// src/discord/DiscordHandler.js
const { REST, Routes } = require("discord.js");
        const config = require("../config/config");

class DiscordHandler {
  constructor(client) {
    this.client = client;
  }

  async registerCommands(commands) {
    try {
      const rest = new REST({ version: "10" }).setToken(config.discord.token);

      console.log("🔄 Bắt đầu đăng ký (/) commands...");

      await rest.put(
        Routes.applicationGuildCommands(
          config.discord.clientId,
          config.discord.guildId
        ),
        { body: commands }
      );

      console.log("✅ Slash commands đã được đăng ký thành công!");
    } catch (error) {
      console.error("❌ Lỗi khi đăng ký commands:", error);
    }
  }
}

export default DiscordHandler;
