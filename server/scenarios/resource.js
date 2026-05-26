const os = require('os');
const { v4: uuidv4 } = require('uuid');

function memStats() {
  const total = os.totalmem();
  const free  = os.freemem();
  return {
    totalMb:     Math.round(total / 1024 / 1024),
    usedMb:      Math.round((total - free) / 1024 / 1024),
    freeMb:      Math.round(free / 1024 / 1024),
    usedPercent: Math.round(((total - free) / total) * 100),
  };
}

module.exports = {
  high_cpu: (logger) => {
    const meta = {
      requestId: uuidv4(), cpuPercent: 94, pid: process.pid,
      process: 'node server.js', durationSec: 38,
      loadAvg: os.loadavg().map(v => +v.toFixed(2)), threshold: 80,
    };
    logger.warn('High CPU utilization detected', meta);
    return meta;
  },

  cpu_critical: (logger) => {
    const meta = {
      requestId: uuidv4(), cpuPercent: 99,
      loadAvg: os.loadavg().map(v => +v.toFixed(2)),
      queueDepth: 143, droppedReqs: 27, action: 'ALERT_SENT',
    };
    logger.error('CPU critically overloaded — requests queuing', meta);
    return meta;
  },

  low_memory: (logger) => {
    const heap = process.memoryUsage();
    const meta = {
      requestId: uuidv4(),
      heapUsedMb:  Math.round(heap.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(heap.heapTotal / 1024 / 1024),
      rssMb:       Math.round(heap.rss / 1024 / 1024),
      ...memStats(),
      simulatedUsedPercent: 88, threshold: 85,
    };
    logger.warn('Low memory warning — approaching OOM threshold', meta);
    return meta;
  },

  oom_kill: (logger) => {
    const meta = {
      requestId: uuidv4(), pid: process.pid, signal: 'SIGKILL',
      memUsedPercent: 99, service: 'api-server',
      restartNo: 3, action: 'PROCESS_RESTART',
    };
    logger.error('OOM kill triggered — process forcefully terminated', meta);
    return meta;
  },

  disk_io_saturation: (logger) => {
    const meta = {
      requestId: uuidv4(), ioWaitPercent: 91,
      writeQueueMbps: 184, throughputMbps: 23,
      mount: '/var/data', threshold: 75,
    };
    logger.warn('Disk I/O saturation — write queue full', meta);
    return meta;
  },

  network_saturation: (logger) => {
    const meta = {
      requestId: uuidv4(), rxMbps: 912, txMbps: 743,
      capacityMbps: 1000, usedPercent: 96,
      packetLoss: '1.8%', interface: 'eth0',
    };
    logger.error('Network bandwidth near saturation — packet loss detected', meta);
    return meta;
  },

  thread_leak: (logger) => {
    const meta = {
      requestId: uuidv4(), activeThreads: 487, baseline: 24,
      growthPerMin: 14, pool: 'worker-pool',
      suspected: 'unclosed DB connections',
    };
    logger.error('Thread count anomaly — possible resource leak', meta);
    return meta;
  },

  gc_pause: (logger) => {
    const meta = {
      requestId: uuidv4(), pauseMs: 420,
      heapBeforeMb: 3640, heapAfterMb: 1920,
      generation: 'old', thresholdMs: 200, impact: 'p99 latency +420ms',
    };
    logger.warn('GC stop-the-world pause — latency spike', meta);
    return meta;
  },

  memory_leak: (logger) => {
    const meta = {
      requestId: uuidv4(), growthMbPerHr: 87, uptimeHrs: 14,
      currentHeapMb: 3340, suspectedModule: 'EventEmitter / socket handler',
      action: 'HEAP_DUMP_TRIGGERED',
    };
    logger.error('Potential memory leak — heap growing steadily', meta);
    return meta;
  },

  snapshot: (logger) => {
    const heap = process.memoryUsage();
    const meta = {
      requestId:        uuidv4(),
      ...memStats(),
      loadAvg:          os.loadavg().map(v => +v.toFixed(2)),
      uptimeSec:        Math.round(os.uptime()),
      processUptimeSec: Math.round(process.uptime()),
      heapUsedMb:       Math.round(heap.heapUsed / 1024 / 1024),
      heapTotalMb:      Math.round(heap.heapTotal / 1024 / 1024),
      rssMb:            Math.round(heap.rss / 1024 / 1024),
      platform:         os.platform(),
      nodeVersion:      process.version,
    };
    logger.info('Resource snapshot captured', meta);
    return meta;
  },
};
