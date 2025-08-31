        const mineflayer = require("mineflayer");
        const config = require("../config/config");
        const logger = require("../utils/logger");

        class MinecraftHandler {
            constructor(mainBot) {
                // Đổi tên biến để rõ ràng hơn: mainBot là instance của AternosBot
                this.mainBot = mainBot;
                this.activityTimer = null;
                this.lastActivity = Date.now();
            }

            async connect() {
                const botOptions = {
                    host: config.minecraft.serverAddress,
                    port: config.minecraft.serverPort,
                    username: config.minecraft.username,
                    version: config.minecraft.version,
                    auth: config.minecraft.auth, // Sử dụng cấu hình auth từ config
                };

                // mineflayer sẽ tự động xử lý password nếu auth là 'microsoft' và password được cung cấp.
                // Không cần thêm điều kiện đặc biệt cho 'offline' mode.
                if (
                    config.minecraft.password &&
                    config.minecraft.auth === "microsoft"
                ) {
                    botOptions.password = config.minecraft.password;
                }

                logger.info(
                    `Đang kết nối đến ${config.minecraft.serverAddress}:${config.minecraft.serverPort} với username: ${config.minecraft.username} (Auth: ${config.minecraft.auth})`,
                );

                const bot = mineflayer.createBot(botOptions);

                return new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        bot.end("Timeout"); // Kết thúc bot để giải phóng tài nguyên
                        reject(new Error("Timeout khi kết nối Minecraft"));
                    }, 30000); // 30 giây timeout

                    bot.once("spawn", () => {
                        clearTimeout(timeout);
                        logger.info("Bot đã spawn thành công trong game!");
                        this.setupBotEvents(bot);
                        this.startActivityLoop(bot);
                        this.mainBot.discordHandler.setMinecraftBot(bot); // Cập nhật instance bot cho discordHandler
                        resolve(bot);
                    });

                    bot.once("error", (error) => {
                        clearTimeout(timeout);
                        logger.error("Lỗi Minecraft bot:", error);
                        // In ra lỗi khi chưa join được vào world
                        console.log(`[MC JOIN ERROR] ${error?.message || error}`);
                        logger.info(`[MC JOIN ERROR] ${error?.message || error}`);
                        reject(error);
                    });

                    bot.once("kicked", (reason, loggedIn) => {
                        clearTimeout(timeout);
                        // In ra lý do bị kick khi chưa join được vào world
                        console.log(`[MC KICKED BEFORE JOIN] ${reason}`);
                        logger.info(`[MC KICKED BEFORE JOIN] ${reason}`);
                        reject(new Error(`Kicked before join: ${reason}`));
                    });

                    bot.once("end", (reason) => {
                        clearTimeout(timeout);
                        logger.warn("Kết nối Minecraft đã kết thúc:", reason);
                        // In ra lý do end khi chưa join được vào world
                        console.log(`[MC END BEFORE JOIN] ${reason}`);
                        logger.info(`[MC END BEFORE JOIN] ${reason}`);
                        reject(new Error(`Minecraft bot ended: ${reason}`)); // Đẩy lỗi để AternosBot xử lý reconnect
                    });
                });
            }

            setupBotEvents(bot) {
                // Xử lý tin nhắn chat
                bot.on("chat", (username, message) => {
                    if (username === bot.username) return; // Bỏ qua tin nhắn của chính bot

                    logger.info(`[MC Chat] ${username}: ${message}`);

                    // Relay chat đến Discord
                    if (config.bot.chatRelayEnabled) {
                        // Gọi sendChatMessage từ discordHandler đã được khởi tạo trong mainBot
                        this.mainBot.discordHandler.sendChatMessage(username, message);
                    }

                    // Xử lý lệnh teleport
                    if (
                        config.bot.teleportEnabled &&
                        message.startsWith(config.bot.teleportPrefix)
                    ) {
                        this.handleTeleportCommand(bot, username, message);
                    }
                });

                // Xử lý người chơi join/leave
                bot.on("playerJoined", (player) => {
                    logger.info(`Người chơi ${player.username} đã tham gia server`);
                    // Truyền thông tin đầy đủ hơn cho Embed
                    this.mainBot.discordHandler.sendStatusMessage(
                        `📥 Người chơi đã tham gia`,
                        `**${player.username}** đã tham gia server.`,
                        "#2ECC71", // Màu xanh lá
                    );
                });

                bot.on("playerLeft", (player) => {
                    logger.info(`Người chơi ${player.username} đã rời server`);
                    // Truyền thông tin đầy đủ hơn cho Embed
                    this.mainBot.discordHandler.sendStatusMessage(
                        `📤 Người chơi đã rời đi`,
                        `**${player.username}** đã rời server.`,
                        "#E74C3C", // Màu đỏ
                    );
                });

                // Xử lý tin nhắn hệ thống
                bot.on("message", (jsonMsg) => {
                    // Lấy text từ jsonMsg một cách an toàn
                    let plainText;
                    if (typeof jsonMsg === 'string') {
                        plainText = jsonMsg;
                    } else if (jsonMsg && typeof jsonMsg.toString === 'function') {
                        plainText = jsonMsg.toString();
                    } else {
                        plainText = JSON.stringify(jsonMsg);
                    }

                    // In ra mọi respond từ server
                    console.log(`[MC RESPOND] ${plainText}`);
                    logger.info(`[MC RESPOND] ${plainText}`);

                    // Lọc các tin nhắn quan trọng từ server
                    if (
                        plainText.includes("Server") ||
                        plainText.includes("Restart") ||
                        plainText.includes("Shutdown")
                    ) {
                        logger.info(`[Server Message] ${plainText}`);
                        this.mainBot.discordHandler.sendStatusMessage(
                            `🖥️ Thông Báo Server`,
                            `**Server:** ${plainText}`,
                            "#F1C40F", // Màu vàng cảnh báo
                        );
                    }
                });

                // Xử lý lỗi
                bot.on("error", (error) => {
                    logger.error("Minecraft bot error:", error);
                    this.mainBot.discordHandler.sendStatusMessage(
                        `❗ Lỗi Minecraft Bot`,
                        `Bot gặp lỗi: \`\`\`${error.message}\`\`\``,
                        "#E74C3C", // Đỏ
                    );
                });

                // Xử lý kick
                bot.on("kicked", (reason) => {
                    logger.warn("Bot bị kick:", reason);
                    this.mainBot.discordHandler.sendStatusMessage(
                        `⚠️ Bot bị kick khỏi server`,
                        `Lý do: \`\`\`${reason}\`\`\``,
                        "#FF9900", // Cam
                    );
                });

                // Xử lý death
                bot.on("death", () => {
                    logger.info("Bot đã chết, sẽ respawn");
                    this.mainBot.discordHandler.sendStatusMessage(
                        `💀 Bot đã chết`,
                        `Bot đã chết và sẽ respawn.`,
                        "#9B59B6", // Tím
                    );
                    setTimeout(() => {
                        if (bot.game && bot.game.dimension) {
                            bot.respawn();
                        }
                    }, 2000);
                });
            }

            handleTeleportCommand(bot, username, message) {
                try {
                    const args = message.trim().split(" ");

                    if (args.length < 2) {
                        bot.chat(
                            `${username}, cú pháp: ${config.bot.teleportPrefix} <tên_người_chơi>`,
                        );
                        return;
                    }

                    const targetPlayer = args[1];

                    // Kiểm tra xem người chơi có online không
                    const players = bot.players;
                    const targetExists = Object.keys(players).find(
                        (name) => name.toLowerCase() === targetPlayer.toLowerCase(),
                    );

                    if (!targetExists) {
                        bot.chat(
                            `${username}, không tìm thấy người chơi: ${targetPlayer}`,
                        );
                        logger.info(
                            `Teleport failed: Player ${targetPlayer} not found`,
                        );
                        this.mainBot.discordHandler.sendStatusMessage(
                            `❌ Lệnh teleport thất bại`,
                            `Không tìm thấy người chơi **${targetPlayer}** trong game.`,
                            "#E74C3C", // Đỏ
                        );
                        return;
                    }

                    // Thực hiện lệnh teleport
                    // Lưu ý: Lệnh /teleport yêu cầu quyền OP trên server.
                    // Bot sẽ gửi lệnh này như chat bình thường, nếu không có OP sẽ không hoạt động.
                    const teleportCommand = `/teleport ${username} ${targetExists}`;
                    bot.chat(teleportCommand);

                    logger.info(`Teleport command executed: ${teleportCommand}`);
                    this.mainBot.discordHandler.sendStatusMessage(
                        `✅ Đã thực hiện lệnh teleport`,
                        `**${username}** đã được teleport đến **${targetExists}**. (Yêu cầu bot có OP)`,
                        "#2ECC71", // Xanh lá
                    );
                } catch (error) {
                    logger.error("Lỗi khi xử lý lệnh teleport:", error);
                    this.mainBot.discordHandler.sendStatusMessage(
                        `❌ Lỗi khi thực hiện lệnh teleport`,
                        `Có lỗi xảy ra: \`\`\`${error.message}\`\`\``,
                        "#E74C3C", // Đỏ
                    );
                }
            }

            startActivityLoop(bot) {
                // Dừng timer cũ nếu có
                if (this.activityTimer) {
                    clearInterval(this.activityTimer);
                }

                this.activityTimer = setInterval(() => {
                    this.simulateActivity(bot);
                }, config.bot.activityInterval);

                logger.info(
                    `Đã bắt đầu activity loop với interval ${config.bot.activityInterval}ms`,
                );
            }

            simulateActivity(bot) {
                if (!bot || !bot.entity || !bot.entity.position) {
                    logger.debug(
                        "Cannot simulate activity: bot or bot.entity or bot.entity.position is null",
                    );
                    return;
                }

                try {
                    const activities = [
                        () => {
                            // Xoay camera ngẫu nhiên
                            const yaw = (Math.random() - 0.5) * Math.PI * 2; // Full circle
                            const pitch = ((Math.random() - 0.5) * Math.PI) / 2; // Up/down limited
                            bot.look(yaw, pitch);
                            logger.debug("Simulated camera rotation");
                        },
                        () => {
                            // Nhảy ngẫu nhiên
                            if (bot.entity.onGround) {
                                bot.setControlState("jump", true);
                                setTimeout(
                                    () => bot.setControlState("jump", false),
                                    100,
                                );
                                logger.debug("Simulated jump");
                            }
                        },
                        () => {
                            // Di chuyển nhẹ (forward/backward/left/right)
                            const directions = ["forward", "back", "left", "right"];
                            const direction =
                                directions[
                                    Math.floor(Math.random() * directions.length)
                                ];
                            bot.setControlState(direction, true);
                            setTimeout(
                                () => bot.setControlState(direction, false),
                                500,
                            );
                            logger.debug(`Simulated movement: ${direction}`);
                        },
                        () => {
                            // Swing arm
                            bot.swingArm("right");
                            logger.debug("Simulated arm swing");
                        },
                    ];

                    // Chọn ngẫu nhiên 1-2 hoạt động
                    const numActivities = Math.floor(Math.random() * 2) + 1;
                    for (let i = 0; i < numActivities; i++) {
                        const activity =
                            activities[Math.floor(Math.random() * activities.length)];
                        activity();
                    }

                    this.lastActivity = Date.now();
                } catch (error) {
                    logger.error("Lỗi khi mô phỏng hoạt động:", error);
                }
            }

            // handleDisconnect sẽ không được gọi trực tiếp ở đây nữa mà được xử lý bởi AternosBot
            // handleDisconnect(reason) {
            //     logger.warn('Minecraft bot đã bị ngắt kết nối:', reason);
            //     if (this.activityTimer) {
            //         clearInterval(this.activityTimer);
            //         this.activityTimer = null;
            //     }
            //     this.mainBot.isMinecraftConnected = false;
            //     this.mainBot.discordHandler.sendStatusMessage(`🔌 Bot đã mất kết nối khỏi server Minecraft: ${reason}`);
            //     setTimeout(() => {
            //         this.mainBot.handleMinecraftReconnect();
            //     }, 5000);
            // }

            cleanup() {
                if (this.activityTimer) {
                    clearInterval(this.activityTimer);
                    this.activityTimer = null;
                }
            }
        }

        module.exports = MinecraftHandler;
