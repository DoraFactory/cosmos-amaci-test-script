#!/bin/bash

# 同时启动多个测试
./run-and-log.sh --background deactive small
./run-and-log.sh --background no-deactive medium

echo "所有测试已在后台启动" 