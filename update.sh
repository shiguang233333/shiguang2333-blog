#!/bin/bash
# 博客更新脚本
# 用法: ./update.sh

set -e

echo "=== 时光博客更新脚本 ==="
echo ""

# 检查 node 是否可用
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 node，请先安装 Node.js"
    exit 1
fi

# 检查依赖是否已安装
if [ ! -d "node_modules" ]; then
    echo "首次运行，安装依赖..."
    npm install
fi

# 启动服务并导出
echo "启动服务并导出数据..."

node admin/server.js &
SERVER_PID=$!

sleep 2

curl -s http://localhost:3400/api/export | node -e "
const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
console.log('导出完成:');
console.log('  - 文章: ' + data.postsCount + ' 篇');
console.log('  - 文件: ' + data.files.join(', '));
"

kill $SERVER_PID 2>/dev/null || true

echo ""
echo "更新完成! 请将 site/ 目录部署到静态托管。"
