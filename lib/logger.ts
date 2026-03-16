type Level = 'debug' | 'info' | 'warn' | 'error';

const parseLevel = (lvl?: string): Level => {
  switch ((lvl || 'info').toLowerCase()) {
    case 'debug':
    case 'info':
    case 'warn':
    case 'error':
      return lvl as Level;
    default:
      return 'info';
  }
};

const level = parseLevel(process.env.LOG_LEVEL);

const shouldLog = (lvl: Level): boolean => {
  const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
  return order[lvl] >= order[level];
};

const emit = (lvl: Level, msg: string, context?: Record<string, unknown>) => {
  if (!shouldLog(lvl)) return;
  const payload = {
    ts: new Date().toISOString(),
    level: lvl,
    message: msg,
    context: context || {}
  };
  console.log(JSON.stringify(payload));
};

export const logger = {
  debug: (msg: string, context?: Record<string, unknown>) => emit('debug', msg, context),
  info: (msg: string, context?: Record<string, unknown>) => emit('info', msg, context),
  warn: (msg: string, context?: Record<string, unknown>) => emit('warn', msg, context),
  error: (msg: string, context?: Record<string, unknown>) => emit('error', msg, context)
};
