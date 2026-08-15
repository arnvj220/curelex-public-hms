// PM2 process definition. Run from hms-backend/: pm2 start ecosystem.config.cjs
//
// instances is pinned to 1: doctor online/offline status and telemedicine socket
// state live in in-process globals (global.doctorStatus, global.socketToDoctor) in
// server.js, not in Mongo or Redis. Running more than one instance would split that
// state across processes and give different users inconsistent realtime status.
// Don't raise this without adding a Socket.IO Redis adapter first.
module.exports = {
  apps: [
    {
      name: 'curelex-api',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '600M',
      time: true,
    },
  ],
};
