import React from 'react';

export function logLineClass(line: string): string {
  if (line.startsWith('[cmd-err]')) return 'log-cmd-err';
  if (line.startsWith('[cmd]')) return 'log-cmd';
  if (line.startsWith('[status]')) return 'log-status';
  if (line.startsWith('[agent]')) return 'log-agent';
  return 'log-other';
}

export function formatProgressLine(line?: string): string {
  if (!line) return '';
  return line.replace(/^\[(status|cmd|cmd-err|agent)\]\s*/, '');
}

export function renderLogLine(line: string, key: React.Key) {
  const cls = logLineClass(line);
  const text = line.replace(/^\[(status|cmd|cmd-err|agent)\]\s*/, '');
  return (
    <div key={key} className={`sa-log-line ${cls}`}>
      {cls === 'log-cmd' && <span className="sa-log-prefix">$</span>}
      {cls === 'log-cmd-err' && <span className="sa-log-prefix">!</span>}
      {text}
    </div>
  );
}
