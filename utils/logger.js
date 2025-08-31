const fs = require('fs');
const path = require('path');
const config = require('../config/config');

class Logger {
    constructor() {
        this.logLevels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        
        this.currentLevel = this.logLevels[config.logging.level] || this.logLevels.info;
        this.enableFileLogging = config.logging.enableFileLogging;
        
        if (this.enableFileLogging) {
            this.setupFileLogging();
        }
    }

    setupFileLogging() {
        try {
            // Tạo thư mục logs nếu chưa tồn tại
            const logsDir = path.join(process.cwd(), 'logs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }

            // Tạo file log với timestamp
            const today = new Date().toISOString().split('T')[0];
            this.logFile = path.join(logsDir, `bot-${today}.log`);
            
        } catch (error) {
            console.error('Không thể thiết lập file logging:', error);
            this.enableFileLogging = false;
        }
    }

    formatMessage(level, ...args) {
        const timestamp = new Date().toISOString();
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        
        return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    }

    writeToFile(level, ...args) {
        if (!this.enableFileLogging || !this.logFile) return;
        
        try {
            const logMessage = this.formatMessage(level, ...args) + '\n';
            fs.appendFileSync(this.logFile, logMessage);
        } catch (error) {
            console.error('Lỗi khi ghi log file:', error);
        }
    }

    log(level, ...args) {
        const levelNum = this.logLevels[level];
        if (levelNum === undefined || levelNum > this.currentLevel) return;

        const formattedMessage = this.formatMessage(level, ...args);
        
        // Console output với màu sắc
        switch (level) {
            case 'error':
                console.error('\x1b[31m%s\x1b[0m', formattedMessage); // Đỏ
                break;
            case 'warn':
                console.warn('\x1b[33m%s\x1b[0m', formattedMessage); // Vàng
                break;
            case 'info':
                console.info('\x1b[32m%s\x1b[0m', formattedMessage); // Xanh lá
                break;
            case 'debug':
                console.debug('\x1b[36m%s\x1b[0m', formattedMessage); // Xanh dương
                break;
            default:
                console.log(formattedMessage);
        }

        // Ghi vào file nếu được bật
        this.writeToFile(level, ...args);
    }

    error(...args) {
        this.log('error', ...args);
    }

    warn(...args) {
        this.log('warn', ...args);
    }

    info(...args) {
        this.log('info', ...args);
    }

    debug(...args) {
        this.log('debug', ...args);
    }
}

module.exports = new Logger();
