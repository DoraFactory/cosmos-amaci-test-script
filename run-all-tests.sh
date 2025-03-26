#!/bin/bash

# 创建日志目录
mkdir -p logs

# 记录开始时间
START_TIME=$(date)
echo "=== 开始执行所有测试: $START_TIME ==="

# 启动所有测试
./run-and-log.sh --background deactive small
./run-and-log.sh --background deactive medium
./run-and-log.sh --background deactive large
./run-and-log.sh --background no-deactive small
./run-and-log.sh --background no-deactive medium
./run-and-log.sh --background no-deactive large

echo "所有测试已在后台启动"
echo "使用 'ps aux | grep \"npm run\"' 查看运行状态"
echo "使用 'tail -f logs/*.log' 查看所有日志" 