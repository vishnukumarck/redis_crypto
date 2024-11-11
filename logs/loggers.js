const log4js = require('log4js');

log4js.configure({
    appenders: {
        console: { type: 'console' },
        error: { type: 'file', filename: 'logs/error.log' },
        combined: { type: 'file', filename: 'logs/combined.log' },
    },
    categories: {
        default: { appenders: ['console', 'combined'], level: 'debug' },
        error: { appenders: ['console', 'error'], level: 'error' }
    }
});

const logger = log4js.getLogger();
const errorLogger = log4js.getLogger('error');

module.exports = { logger, errorLogger };