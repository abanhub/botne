const { Client, GatewayIntentBits, Collection } = require("discord.js");
const config = require("./config/config");
const logger = require("./utils/logger");
const DiscordHandler = require("./handlers/discord");
const MinecraftHandler = require("./handlers/minecraft");


const express = require('express');
const app = express();
const port = 3000; // Hoặc một cổng bất kỳ bạn muốn (ví dụ: 8080)

app.get('/', (req, res) => {
  res.send('Bot của bạn đang chạy!');
});

app.listen(port, () => {
  console.log(`Web server đang lắng nghe trên cổng ${port}`);
});

// --- Phần code bot Minecraft/Discord của bạn sẽ nằm ở dưới đây ---
// (ví dụ: const mineflayer = require('mineflayer'); ...)



class AternosBot {
    constructor() {
        // Khởi tạo Discord client với intents cần thiết
        this.discordClient = new Client({
            intents: [
                GatewayIntentBits.Guilds, // Bắt buộc cho slash commands
                GatewayIntentBits.GuildMessages, // Để nhận sự kiện messageCreate
                GatewayIntentBits.MessageContent, // Rất quan trọng để bot có thể đọc nội dung tin nhắn
                GatewayIntentBits.GuildMembers, // Có thể cần để lấy thông tin user/member đầy đủ
            ],
        });

        this.minecraftBot = null; // mineflayer bot instance
        this.isMinecraftConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectDelay = 30000; // 30 giây

        // Khởi tạo handlers, truyền 'this' (AternosBot instance) vào constructor của chúng
        this.discordHandler = new DiscordHandler(this);
        this.minecraftHandler = new MinecraftHandler(this);

        // Thiết lập event listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Discord events
        this.discordClient.on("ready", async () => {
            logger.info(
                `Discord bot đã sẵn sàng! Đăng nhập với tên: ${this.discordClient.user.tag}`,
            );
            // Đăng ký slash commands khi bot đã sẵn sàng
            await this.discordHandler.registerCommands();
            // Bắt đầu kết nối Minecraft sau khi Discord sẵn sàng
            this.connectToMinecraft();
        });

        this.discordClient.on("interactionCreate", (interaction) => {
            this.discordHandler.handleInteraction(interaction);
        });

        // Chỉ lắng nghe messageCreate nếu chat relay hoặc các tính năng tin nhắn khác được bật
        if (config.bot.chatRelayEnabled) {
            this.discordClient.on("messageCreate", (message) => {
                this.discordHandler.handleMessage(message);
            });
        }

        this.discordClient.on("error", (error) => {
            logger.error("Discord client error:", error);
        });

        // Process events
        process.on("SIGINT", () => {
            this.shutdown();
        });

        process.on("SIGTERM", () => {
            this.shutdown();
        });

        process.on("uncaughtException", (error) => {
            logger.error("Uncaught Exception:", error);
            // Có thể gửi thông báo Discord về lỗi nghiêm trọng
            this.discordHandler
                .sendStatusMessage(
                    "Fatal Error",
                    `Uncaught Exception: \`\`\`${error.stack || error.message}\`\`\``,
                    "#E74C3C",
                )
                .catch((err) =>
                    logger.error(
                        "Failed to send fatal error message to Discord:",
                        err,
                    ),
                );
            // Tắt ứng dụng sau một thời gian để đảm bảo log và thông báo được gửi
            setTimeout(() => process.exit(1), 5000);
        });

        process.on("unhandledRejection", (reason, promise) => {
            logger.error("Unhandled Rejection at:", promise, "reason:", reason);
            // Có thể gửi thông báo Discord về lỗi nghiêm trọng
            this.discordHandler
                .sendStatusMessage(
                    "Unhandled Rejection",
                    `Unhandled Rejection: \`\`\`${reason}\`\`\``,
                    "#E74C3C",
                )
                .catch((err) =>
                    logger.error(
                        "Failed to send unhandled rejection message to Discord:",
                        err,
                    ),
                );
        });
    }

    async connectToMinecraft() {
        try {
            logger.info("Đang kết nối đến server Minecraft...");

            // Nếu mineflayer bot đã tồn tại và đang kết nối, kết thúc nó trước
            if (this.minecraftBot && this.minecraftBot.end) {
                this.minecraftBot.end("Reconnecting");
                this.minecraftBot = null;
            }

            // Kết nối Minecraft thông qua MinecraftHandler
            this.minecraftBot = await this.minecraftHandler.connect();
            this.isMinecraftConnected = true;
            this.reconnectAttempts = 0; // Reset số lần thử lại

            logger.info("Đã kết nối thành công đến server Minecraft!");
            await this.discordHandler.sendStatusMessage(
                "✅ Kết nối Minecraft thành công",
                `Bot đã kết nối thành công đến server \`${config.minecraft.serverAddress}\`!`,
                "#2ECC71",
            );

            // Gán lại mineflayer bot instance cho DiscordHandler
            this.discordHandler.setMinecraftBot(this.minecraftBot);

            // Lắng nghe sự kiện 'end' của mineflayer bot TẠI ĐÂY để xử lý reconnect tập trung
            this.minecraftBot.once("end", (reason) => {
                logger.warn(
                    "Mineflayer bot đã kết thúc (từ index.js):",
                    reason,
                );
                this.isMinecraftConnected = false;
                this.discordHandler
                    .sendStatusMessage(
                        `🔌 Mất kết nối Minecraft`,
                        `Bot đã mất kết nối khỏi server Minecraft. Lý do: \`\`\`${reason}\`\`\``,
                        "#E74C3C",
                    )
                    .catch((err) =>
                        logger.error("Failed to send disconnect message:", err),
                    );
                this.handleMinecraftReconnect();
            });
        } catch (error) {
            logger.error("Lỗi khi kết nối Minecraft:", error.message || error);
            this.isMinecraftConnected = false;
            // Chỉ gửi thông báo lỗi nếu không phải là lỗi Timeout đã được xử lý
            if (!error.message.includes("Timeout")) {
                await this.discordHandler.sendStatusMessage(
                    "❌ Lỗi Kết nối Minecraft",
                    `Không thể kết nối đến server Minecraft: \`\`\`${error.message}\`\`\``,
                    "#E74C3C",
                );
            }
            this.handleMinecraftReconnect();
        }
    }

    async handleMinecraftReconnect() {
        if (this.isMinecraftConnected) {
            logger.debug(
                "Already connected to Minecraft, skipping reconnect attempt.",
            );
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error(
                "Đã vượt quá số lần thử kết nối lại tối đa. Dừng kết nối lại.",
            );
            await this.discordHandler.sendStatusMessage(
                "⛔ Kết nối lại thất bại",
                "❌ Không thể kết nối đến server Minecraft sau nhiều lần thử!",
                "#E74C3C",
            );
            return;
        }

        this.reconnectAttempts++;
        logger.info(
            `Thử kết nối lại lần ${this.reconnectAttempts}/${this.maxReconnectAttempts} sau ${this.reconnectDelay / 1000} giây...`,
        );

        await this.discordHandler.sendStatusMessage(
            "🔄 Đang kết nối lại Minecraft",
            `Đang thử kết nối lại Minecraft... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
            "#F39C12", // Màu cam
        );

        setTimeout(() => {
            this.connectToMinecraft();
        }, this.reconnectDelay);
    }

    // Hàm này được gọi từ DiscordHandler khi lệnh /say được thực thi
    async sendMinecraftChat(message) {
        if (this.minecraftBot && this.isMinecraftConnected) {
            try {
                this.minecraftBot.chat(message);
                logger.debug(`Đã gửi chat tới Minecraft: "${message}"`);
                return true;
            } catch (error) {
                logger.error("Lỗi khi gửi chat Minecraft:", error);
                return false;
            }
        }
        logger.warn(
            "Không thể gửi chat Minecraft: Bot không kết nối hoặc mineflayerBot chưa khởi tạo.",
        );
        return false;
    }

    // Hàm này được gọi từ DiscordHandler để lấy trạng thái
    getMinecraftStatus() {
        if (!this.minecraftBot || !this.isMinecraftConnected) {
            return {
                online: false,
                players: [],
                serverName: config.minecraft.serverAddress,
                botUsername: config.minecraft.username, // Vẫn trả về username dù offline
            };
        }

        return {
            online: true,
            players: this.minecraftBot.players
                ? Object.keys(this.minecraftBot.players).filter(
                      (p) => p !== this.minecraftBot.username,
                  )
                : [], // Lọc bot ra khỏi danh sách
            serverName: config.minecraft.serverAddress,
            botUsername: this.minecraftBot.username,
        };
    }

    async start() {
        try {
            logger.info("Khởi động bot...");

            // Không đăng ký slash commands ở đây nữa, mà là trong sự kiện 'ready' của Discord client
            // await this.discordHandler.registerCommands();

            // Đăng nhập Discord bot
            await this.discordClient.login(config.discord.token);
        } catch (error) {
            logger.error("Lỗi khi khởi động bot:", error.message || error);
            logger.error(
                "Chi tiết lỗi:",
                error.stack || "Không có stack trace",
            );
            process.exit(1);
        }
    }

    async shutdown() {
        logger.info("Đang tắt bot...");

        try {
            if (this.minecraftBot) {
                logger.info("Đang đóng kết nối Minecraft bot...");
                this.minecraftBot.end("Shutdown"); // Gửi lý do shutdown
                this.minecraftHandler.cleanup(); // Dọn dẹp timer
                this.minecraftBot = null;
            }

            if (this.discordClient && this.discordClient.isReady()) {
                // Kiểm tra isReady trước khi destroy
                logger.info("Đang đóng kết nối Discord client...");
                await this.discordClient.destroy();
            }

            logger.info("Bot đã tắt thành công");
            process.exit(0);
        } catch (error) {
            logger.error("Lỗi khi tắt bot:", error);
            process.exit(1);
        }
    }
}

// Khởi động bot
const bot = new AternosBot();
bot.start();

// Export bot instance nếu cần cho các unit test hoặc mở rộng khác
module.exports = AternosBot;
