import * as fs from 'fs';
import * as path from 'path';
import * as winston from 'winston';

export class Logger {
    private logFile: string;
    private stream: fs.WriteStream;
    
    constructor(filename: string = 'execution.log') {
        this.logFile = path.join(process.cwd(), filename);
        this.stream = fs.createWriteStream(this.logFile, { flags: 'a' });
        
        // 记录开始时间
        this.log(`=== 执行开始: ${new Date().toISOString()} ===`);
        
        // 捕获未处理的异常
        process.on('uncaughtException', (err) => {
            this.error('未捕获的异常:', err);
        });
        
        // 捕获未处理的 Promise 拒绝
        process.on('unhandledRejection', (reason) => {
            this.error('未处理的 Promise 拒绝:', reason);
        });
        
        // 程序退出时记录
        process.on('exit', () => {
            this.log(`=== 执行结束: ${new Date().toISOString()} ===\n`);
            this.stream.end();
        });
    }
    
    log(...args: any[]) {
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
        ).join(' ');
        
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] INFO: ${message}`;
        
        console.log(message);
        this.stream.write(logMessage + '\n');
    }
    
    error(...args: any[]) {
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
        ).join(' ');
        
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ERROR: ${message}`;
        
        console.error(message);
        this.stream.write(logMessage + '\n');
    }
    
    // 记录性能指标
    timing(label: string, startTime: [number, number]) {
        const endTime = process.hrtime(startTime);
        const duration = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
        this.log(`${label} 耗时: ${duration}ms`);
    }
}

// 创建全局日志实例
export const logger = new Logger();

// 创建 Winston 日志记录器
export const winstonLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'maci-test' },
    transports: [
        // 写入所有日志到 combined.log
        new winston.transports.File({ filename: 'combined.log' }),
        // 写入错误日志到 error.log
        new winston.transports.File({ level: 'error', filename: 'error.log' }),
        // 在控制台输出
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
}); 