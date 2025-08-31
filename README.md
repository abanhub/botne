# Aternos Minecraft Discord Bot

Bot Discord tự động để giữ server Minecraft Aternos hoạt động 24/7 với tích hợp Discord và xử lý lệnh teleport trong game.

## Tính Năng

### 🎮 Minecraft
- Tự động kết nối và duy trì hoạt động trong server Aternos
- Mô phỏng hoạt động người chơi (di chuyển, nhảy, xoay camera)
- Tự động kết nối lại khi bị ngắt kết nối
- Xử lý lệnh teleport từ chat in-game (`.tp <player>`)
- Relay chat giữa Minecraft và Discord

### 💬 Discord
- Slash commands: `/status`, `/players`, `/say`
- Thông báo trạng thái server tự động
- Relay chat từ Discord vào Minecraft
- Thông báo người chơi join/leave

### ⚙️ Quản Lý
- Cấu hình linh hoạt qua biến môi trường
- Logging chi tiết với nhiều mức độ
- Xử lý lỗi mạnh mẽ
- Tối ưu cho môi trường Replit

## Cài Đặt

### 1. Chuẩn Bị

#### Discord Bot
1. Tạo Discord Application tại [Discord Developer Portal](https://discord.com/developers/applications)
2. Tạo Bot và lấy Token
3. Thêm bot vào server Discord với quyền:
   - Send Messages
   - Use Slash Commands
   - Read Message History
   - Add Reactions

#### Minecraft Account
1. Tài khoản Minecraft hợp lệ (Microsoft hoặc Mojang)
2. Server Aternos đã khởi động
3. Bot cần được cấp quyền OP trong server để sử dụng lệnh teleport

### 2. Cấu Hình

1. Copy file `.env.example` thành `.env`
2. Điền thông tin cấu hình:

```env
# Discord
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_STATUS_CHANNEL=channel_id_for_notifications
DISCORD_CHAT_CHANNEL=channel_id_for_chat_relay

# Minecraft
MC_SERVER_ADDRESS=yourserver.aternos.me
MC_USERNAME=your_minecraft_username
MC_PASSWORD=your_minecraft_password
