
#!/usr/bin/env bash
echo "Run prisma migrate and start servers"
npx prisma generate
echo "Start the socket server in background (or run manually): node server/index.js"
