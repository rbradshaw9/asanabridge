module.exports = {
  apps: [{
    name: 'asanabridge',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/asanabridge-error.log',
    out_file: '/var/log/pm2/asanabridge-out.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}