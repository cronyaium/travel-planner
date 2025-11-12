#!/bin/sh

# 替换环境变量
if [ -f /usr/share/nginx/html/index.html ]; then
  envsubst < /usr/share/nginx/html/index.html > /usr/share/nginx/html/index.html.tmp
  mv /usr/share/nginx/html/index.html.tmp /usr/share/nginx/html/index.html
fi

# 运行时启动 nginx（CMD 会执行）
exec "$@"

