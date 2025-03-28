#!/bin/bash

# 检查logs目录是否存在，不存在则创建
if [ ! -d "logs" ]; then
    echo "创建logs目录..."
    mkdir -p logs
fi

# 检查是否需要后台运行
if [ "$1" == "--background" ] || [ "$1" == "-b" ]; then
    BACKGROUND=true
    shift  # 移除 --background 参数
else
    BACKGROUND=false
fi

# 获取用户数量参数
VOTER_COUNT="$1"
if [ -z "$VOTER_COUNT" ]; then
    VOTER_COUNT="3"  # 默认值
fi

# 获取当前时间作为日志文件名
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="logs/vote-test-${VOTER_COUNT}_${TIMESTAMP}.log"
PID_FILE="logs/vote-test-${VOTER_COUNT}_${TIMESTAMP}.pid"

# 记录开始时间和命令
echo "=== 执行开始: $(date) ===" > $LOG_FILE
echo "命令: npm run test-votes -- $VOTER_COUNT" >> $LOG_FILE
echo "===========================" >> $LOG_FILE
echo "" >> $LOG_FILE

# 根据是否后台运行执行不同操作
if [ "$BACKGROUND" = true ]; then
    # 在后台执行命令并记录输出
    nohup npm run test-votes -- "$VOTER_COUNT" >> $LOG_FILE 2>&1 &
    PID=$!
    echo $PID > $PID_FILE
    echo "命令在后台运行，PID: $PID"
    echo "日志保存到: $LOG_FILE"
    echo "PID保存到: $PID_FILE"
else
    # 在前台执行命令并记录输出
    npm run test-votes -- "$VOTER_COUNT" 2>&1 | tee -a $LOG_FILE
    
    # 记录结束时间
    echo "" >> $LOG_FILE
    echo "=== 执行结束: $(date) ===" >> $LOG_FILE
    echo "日志已保存到: $LOG_FILE"
fi 