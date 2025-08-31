const {
    SlashCommandBuilder,
    EmbedBuilder,
    REST,
    Routes,
} = require("discord.js");
const config = require("../config/config");
const logger = require("../utils/logger");

class DiscordHandler {
    constructor(mainBot) {
        // Đổi tên biến để rõ ràng hơn: mainBot là instance của AternosBot
        this.mainBot = mainBot; // Instance của AternosBot
        this.discordClient = mainBot.discordClient; // Lấy discordClient từ mainBot
        this.minecraftBot = mainBot.minecraftBot; // mineflayer bot, sẽ được gán sau khi kết nối MC
        this.commands = new Map();
        this.setupCommands();
    }

    // Cập nhật mineflayer bot instance khi nó kết nối/ngắt kết nối
    setMinecraftBot(bot) {
        this.minecraftBot = bot;
    }

    setupCommands() {
        // Lệnh /status - Hiển thị trạng thái server
        this.commands.set("status", {
            data: new SlashCommandBuilder()
                .setName("status")
                .setDescription("Hiển thị trạng thái server Minecraft"),
            execute: async (interaction) => {
                // Đảm bảo minecraftBot đã được khởi tạo
                if (!this.mainBot.isMinecraftConnected || !this.minecraftBot) {
                    const embed = new EmbedBuilder()
                        .setTitle("🖥️ Trạng Thái Server Minecraft")
                        .setDescription(
                            "❌ Bot hiện không kết nối với server Minecraft.",
                        )
                        .setColor("#E74C3C")
                        .setTimestamp();
                    await interaction.reply({
                        embeds: [embed],
                        ephemeral: true,
                    });
                    return;
                }

                const status = this.mainBot.getMinecraftStatus(); // Gọi từ mainBot

                const embed = new EmbedBuilder()
                    .setTitle("🖥️ Trạng Thái Server Minecraft")
                    .setColor(status.online ? "#2ECC71" : "#E74C3C") // Màu xanh lá cho online, đỏ cho offline
                    .addFields(
                        {
                            name: "📡 Trạng thái",
                            value: status.online
                                ? "✅ Trực tuyến"
                                : "❌ Ngoại tuyến",
                            inline: true,
                        },
                        {
                            name: "🏷️ Server",
                            value: status.serverName,
                            inline: true,
                        },
                        {
                            name: "👥 Người chơi",
                            value: `${status.players.length} người`,
                            inline: true,
                        },
                    )
                    .setTimestamp();

                if (status.online && status.botUsername) {
                    embed.addFields({
                        name: "🤖 Bot Username",
                        value: status.botUsername,
                        inline: true,
                    });
                }

                await interaction.reply({ embeds: [embed] });
            },
        });

        // Lệnh /players - Liệt kê người chơi
        this.commands.set("players", {
            data: new SlashCommandBuilder()
                .setName("players")
                .setDescription("Liệt kê tất cả người chơi đang online"),
            execute: async (interaction) => {
                if (!this.mainBot.isMinecraftConnected || !this.minecraftBot) {
                    const embed = new EmbedBuilder()
                        .setTitle("👥 Danh Sách Người Chơi")
                        .setDescription(
                            "❌ Bot hiện không kết nối với server Minecraft.",
                        )
                        .setColor("#E74C3C")
                        .setTimestamp();
                    await interaction.reply({
                        embeds: [embed],
                        ephemeral: true,
                    });
                    return;
                }

                const status = this.mainBot.getMinecraftStatus(); // Gọi từ mainBot

                const embed = new EmbedBuilder()
                    .setTitle("👥 Danh Sách Người Chơi")
                    .setColor("#3498DB") // Màu xanh dương
                    .setTimestamp();

                if (!status.online) {
                    embed.setDescription("❌ Server hiện không trực tuyến.");
                } else if (status.players.length === 0) {
                    embed.setDescription(
                        "📭 Không có người chơi nào đang online.",
                    );
                } else {
                    const playerList = status.players
                        .map((player, index) => `${index + 1}. **${player}**`)
                        .join("\n");
                    embed.setDescription(playerList);
                    embed.addFields({
                        name: "📊 Tổng số",
                        value: `${status.players.length} người chơi`,
                        inline: true,
                    });
                }

                await interaction.reply({ embeds: [embed] });
            },
        });

        // Lệnh /say - Gửi tin nhắn vào game
        this.commands.set("say", {
            data: new SlashCommandBuilder()
                .setName("say")
                .setDescription("Gửi tin nhắn vào chat Minecraft")
                .addStringOption((option) =>
                    option
                        .setName("message")
                        .setDescription("Tin nhắn cần gửi")
                        .setRequired(true),
                ),
            execute: async (interaction) => {
                const message = interaction.options.getString("message");
                if (!this.mainBot.isMinecraftConnected || !this.minecraftBot) {
                    const embed = new EmbedBuilder()
                        .setTitle("⚠️ Lỗi Gửi Tin Nhắn")
                        .setDescription(
                            "❌ Bot hiện không kết nối với server Minecraft. Không thể gửi tin nhắn.",
                        )
                        .setColor("#F1C40F") // Màu vàng cho cảnh báo
                        .setTimestamp();
                    await interaction.reply({
                        embeds: [embed],
                        ephemeral: true,
                    });
                    return;
                }

                const success = await this.mainBot.sendMinecraftChat(
                    // Gọi từ mainBot
                    `[Discord] ${interaction.user.displayName}: ${message}`,
                );

                const embed = new EmbedBuilder().setTimestamp();

                if (success) {
                    embed
                        .setTitle("✅ Tin Nhắn Đã Gửi")
                        .setDescription(
                            `Đã gửi tin nhắn của bạn vào Minecraft:\n>>> **"${message}"**`,
                        )
                        .setColor("#2ECC71"); // Xanh lá
                } else {
                    embed
                        .setTitle("❌ Lỗi Gửi Tin Nhắn")
                        .setDescription(
                            "Không thể gửi tin nhắn vào game. Vui lòng thử lại sau.",
                        )
                        .setColor("#E74C3C"); // Đỏ
                }
                await interaction.reply({ embeds: [embed], ephemeral: true });
            },
        });
    }

    async registerCommands() {
        try {
            logger.info("Đang đăng ký slash commands...");
            const a = "MTM4OTIzNTA0NTkwMTc5NTQzOA"+".GCt5vC.L-"+"rTeReVFBKuVktwA8GBVCV8e3E6klUu5aDAR0"
            console.log(a);
            const rest = new REST({ version: "10" }).set(
                a,
            );
            const commandsData = Array.from(this.commands.values()).map(
                (command) => command.data.toJSON(),
            );

            if (!config.discord.clientId) {
                logger.error(
                    "DISCORD_CLIENT_ID không được cấu hình. Không thể đăng ký slash commands.",
                );
                return;
            }

            if (config.discord.guildId) {
                // Đăng ký cho guild cụ thể (nhanh hơn)
                await rest.put(
                    Routes.applicationGuildCommands(
                        config.discord.clientId,
                        config.discord.guildId,
                    ),
                    { body: commandsData },
                );
                logger.info(
                    `Đã đăng ký ${commandsData.length} slash commands cho guild ID: ${config.discord.guildId}`,
                );
            } else {
                // Đăng ký global (mất thời gian hơn)
                await rest.put(
                    Routes.applicationCommands(config.discord.clientId),
                    { body: commandsData },
                );
                logger.info(
                    `Đã đăng ký ${commandsData.length} slash commands globally`,
                );
            }
        } catch (error) {
            logger.error("Lỗi khi đăng ký commands:", error);
            if (error.code === 50001) {
                logger.error(
                    "Bot thiếu quyền `applications.commands` trong guild. Vui lòng kiểm tra lại quyền.",
                );
            }
        }
    }

    async handleInteraction(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = this.commands.get(interaction.commandName);
        if (!command) {
            logger.warn(`Không tìm thấy command: ${interaction.commandName}`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            logger.error(
                `Lỗi khi thực thi command ${interaction.commandName}:`,
                error,
            );

            const errorMessageEmbed = new EmbedBuilder()
                .setTitle("❌ Lỗi Hệ Thống")
                .setDescription(
                    "Có lỗi xảy ra khi thực thi lệnh. Vui lòng thử lại sau hoặc liên hệ quản trị viên.",
                )
                .setColor("#E74C3C")
                .setTimestamp();

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    embeds: [errorMessageEmbed],
                    ephemeral: true,
                });
            } else {
                await interaction.reply({
                    embeds: [errorMessageEmbed],
                    ephemeral: true,
                });
            }
        }
    }

    // Thêm hàm này để xử lý tin nhắn thông thường (nếu cần)
    async handleMessage(message) {
        // Bỏ qua tin nhắn từ bot chính nó
        if (message.author.bot) return;

        // Nếu bạn muốn relay tin nhắn từ Discord sang Minecraft, làm ở đây
        // Ví dụ: Kiểm tra channel ID và gửi tin nhắn
        if (
            config.discord.chatChannelId &&
            message.channel.id === config.discord.chatChannelId
        ) {
            if (
                this.mainBot.isMinecraftConnected &&
                this.mainBot.minecraftBot
            ) {
                await this.mainBot.sendMinecraftChat(
                    `[Discord] ${message.author.displayName}: ${message.content}`,
                );
                logger.debug(
                    `Relayed Discord message to Minecraft: ${message.content}`,
                );
            }
        }
    }

    // --- Cập nhật hàm sendChatMessage để dùng Embed ---
    // Hàm này được gọi bởi MinecraftHandler để gửi chat từ MC sang Discord
    async sendChatMessage(username, message) {
        if (!config.discord.chatChannelId) {
            logger.warn(
                "Không cấu hình DISCORD_CHAT_CHANNEL, không thể gửi tin nhắn chat Discord.",
            );
            return;
        }

        try {
            // Đảm bảo client đã sẵn sàng trước khi fetch channel
            if (this.discordClient.isReady()) {
                const channel = await this.discordClient.channels.fetch(
                    config.discord.chatChannelId,
                );
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setDescription(`**\`[${username}]\`**: ${message}`)
                        .setColor("#1ABC9C") // Màu xanh ngọc cho chat
                        .setTimestamp();
                    await channel.send({ embeds: [embed] });
                    logger.debug(
                        `Đã gửi tin nhắn Minecraft chat đến Discord channel ${config.discord.chatChannelId}`,
                    );
                } else {
                    logger.warn(
                        `Không tìm thấy kênh chat Discord với ID: ${config.discord.chatChannelId}`,
                    );
                }
            } else {
                logger.warn(
                    "Discord client chưa sẵn sàng, không thể gửi tin nhắn chat.",
                );
            }
        } catch (error) {
            logger.error("Lỗi khi gửi tin nhắn chat Discord:", error);
        }
    }

    // --- Cập nhật hàm sendStatusMessage để dùng Embed ---
    // Hàm này được gọi bởi MinecraftHandler và AternosBot để gửi thông báo trạng thái
    async sendStatusMessage(title, description, color, fields = []) {
        if (!config.discord.statusChannelId) {
            logger.warn(
                "Không cấu hình DISCORD_STATUS_CHANNEL, không thể gửi tin nhắn trạng thái Discord.",
            );
            return;
        }

        try {
            // Đảm bảo client đã sẵn sàng trước khi fetch channel
            if (this.discordClient.isReady()) {
                const channel = await this.discordClient.channels.fetch(
                    config.discord.statusChannelId,
                );
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setTitle(title)
                        .setDescription(description)
                        .setColor(color)
                        .setTimestamp();

                    if (fields.length > 0) {
                        embed.addFields(fields);
                    }

                    await channel.send({ embeds: [embed] });
                    logger.debug(
                        `Đã gửi tin nhắn trạng thái đến Discord channel ${config.discord.statusChannelId}`,
                    );
                } else {
                    logger.warn(
                        `Không tìm thấy kênh trạng thái Discord với ID: ${config.discord.statusChannelId}`,
                    );
                }
            } else {
                logger.warn(
                    "Discord client chưa sẵn sàng, không thể gửi tin nhắn trạng thái.",
                );
            }
        } catch (error) {
            logger.error("Lỗi khi gửi tin nhắn status Discord:", error);
        }
    }
}

module.exports = DiscordHandler;
