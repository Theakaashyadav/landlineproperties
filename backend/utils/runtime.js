function isHostingerRuntime() {
  return Boolean(
    process.env.LSNODE_SOCKET
    || process.env.LSNODE_CONSOLE_LOG
    || String(process.env.NODE_OPTIONS || '').includes('preload-timestamp.js')
  );
}

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || isHostingerRuntime();
}

module.exports = { isHostingerRuntime, isProductionRuntime };
