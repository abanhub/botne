require("dotenv").config();

const config = {
    discord: {
        token: process.env.DISCORD_TOKEN || "",
        clientId: process.env.DISCORD_CLIENT_ID || "", // Rất quan trọng cho slash commands
        guildId: process.env.DISCORD_GUILD_ID || "", // Tùy chọn, để đăng ký lệnh cục bộ
        statusChannelId: process.env.DISCORD_STATUS_CHANNEL || "",
        chatChannelId: process.env.DISCORD_CHAT_CHANNEL || "",
        commandChannelId: process.env.DISCORD_COMMAND_CHANNEL || "", // Hiện chưa dùng, nhưng có thể giữ
    },

    minecraft: {
        serverAddress: process.env.MC_SERVER_ADDRESS || "",
        serverPort: parseInt(process.env.MC_SERVER_PORT || ""),
        username: process.env.MC_USERNAME || "",
        password: process.env.MC_PASSWORD || "", // Chỉ cần nếu auth là 'microsoft'
        version: process.env.MC_VERSION || "",
        auth: process.env.MC_AUTH || "offline", // 'offline' cho cracked servers, 'microsoft' cho premium
    },

    bot: {
        teleportPrefix: process.env.TP_PREFIX || ".tp",
        activityInterval: parseInt(process.env.ACTIVITY_INTERVAL || "300000"), // 5 phút (300000ms)
        chatRelayEnabled: process.env.CHAT_RELAY_ENABLED !== "false", // Mặc định là true
        teleportEnabled: process.env.TELEPORT_ENABLED !== "false", // Mặc định là true
    },

    logging: {
        level: process.env.LOG_LEVEL || "info", // 'error', 'warn', 'info', 'debug'
        enableFileLogging: process.env.ENABLE_FILE_LOGGING === "true", // Mặc định là false
    },
};

// Kiểm tra cấu hình bắt buộc
function validateConfig() {
    const required = [
        "discord.token",
        "discord.clientId", // Thêm clientId vào đây
        "minecraft.serverAddress",
        "minecraft.username",
    ];

    const missing = [];

    required.forEach((key) => {
        const keys = key.split(".");
        let value = config;

        for (const k of keys) {
            value = value[k];
            if (value === undefined || value === null || value === "") {
                // Kiểm tra cả chuỗi rỗng
                missing.push(key);
                break;
            }
        }
    });

    if (missing.length > 0) {
        console.error(
            "Thiếu cấu hình bắt buộc hoặc cấu hình rỗng:",
            missing.join(", "),
        );
        console.error("Vui lòng kiểm tra file .env hoặc biến môi trường");
        process.exit(1);
    }
}

validateConfig();

module.exports = config;
