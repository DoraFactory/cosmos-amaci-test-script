#!/bin/bash

# 分批执行 xlarge 测试
echo "开始分批执行 xlarge 测试..."

# 第一批：前100个用户
./run-and-log.sh no-deactive large
echo "第一批完成，等待 3 分钟..."
sleep 180

# 第二批：接下来的100个用户
BATCH2_START=101 BATCH2_END=200 ./run-and-log.sh custom-batch
echo "第二批完成，等待 3 分钟..."
sleep 180

# 继续其他批次... 