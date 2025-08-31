# Aternos Minecraft Discord Bot

## Overview

This is a Discord bot designed to keep Minecraft Aternos servers running 24/7 by maintaining an active presence in the game. The bot integrates Discord communication with Minecraft gameplay, featuring automated player simulation, chat relay, and teleportation command handling.

## System Architecture

### Core Components
- **Discord Bot**: Built with discord.js v14, handles slash commands and message relaying
- **Minecraft Bot**: Uses Mineflayer library to connect and simulate player activities
- **Chat Relay System**: Bidirectional communication between Discord and Minecraft
- **Command Handler**: Processes in-game teleportation commands and Discord slash commands

### Technology Stack
- **Node.js**: Runtime environment
- **discord.js v14**: Discord API integration
- **mineflayer v4.25**: Minecraft bot automation
- **dotenv**: Environment configuration management

## Key Components

### 1. Main Application (`index.js`)
- Central orchestrator managing both Discord and Minecraft connections
- Handles reconnection logic with exponential backoff
- Coordinates between Discord and Minecraft handlers

### 2. Discord Handler (`handlers/discord.js`)
- Manages Discord client events and interactions
- Implements slash commands: `/status`, `/players`, `/say`
- Handles message relaying from Discord to Minecraft
- Creates rich embeds for status reporting

### 3. Minecraft Handler (`handlers/minecraft.js`)
- Establishes and maintains Minecraft server connection
- Simulates player activity (movement, jumping, camera rotation)
- Processes in-game teleportation commands (`.tp` prefix)
- Manages chat message processing and relaying

### 4. Configuration System (`config/config.js`)
- Environment-based configuration management
- Validates required configuration parameters
- Supports both Microsoft and Mojang authentication

### 5. Logging System (`utils/logger.js`)
- Multi-level logging (error, warn, info, debug)
- Optional file logging with daily rotation
- Structured log formatting with timestamps

## Data Flow

### Discord to Minecraft
1. User sends message in Discord chat channel
2. Discord handler captures message
3. Message is relayed to Minecraft chat via bot

### Minecraft to Discord
1. Minecraft chat events are captured by bot
2. Messages are processed and filtered
3. Relevant messages are sent to Discord status/chat channels

### Teleportation Commands
1. Player types `.tp <target>` in Minecraft chat
2. Bot parses command and validates target player
3. Bot executes `/teleport` command if it has OP permissions
4. Result is reported to both Minecraft and Discord

### Activity Simulation
1. Bot performs periodic activities (configurable interval)
2. Activities include movement, jumping, and camera rotation
3. Prevents server from shutting down due to inactivity

## External Dependencies

### Required Services
- **Discord Developer Portal**: Bot token and application configuration
- **Minecraft Account**: Valid Microsoft or Mojang account for bot
- **Aternos Server**: Target Minecraft server (bot needs OP permissions for teleport)

### NPM Dependencies
- `discord.js ^14.21.0`: Discord API wrapper
- `mineflayer ^4.25.0`: Minecraft bot framework
- `dotenv ^17.0.0`: Environment variable management

## Deployment Strategy

### Environment Configuration
- Uses `.env` file for sensitive configuration
- Supports deployment on Replit with environment variables
- Configuration validation ensures required parameters are present

### Connection Management
- Automatic reconnection for both Discord and Minecraft connections
- Exponential backoff for failed connection attempts
- Graceful error handling and recovery

### Monitoring
- Comprehensive logging system
- Status reporting through Discord commands
- Real-time connection status tracking

## Changelog
- June 30, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.