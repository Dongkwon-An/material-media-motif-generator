import { useState } from 'react';
import { canRecordVideo, copyShareUrl, exportPng, exportSvg, recordVideo } from '../../export/export';
import { Segmented } from './controls';

const DURATIONS = ['3s', '5s', '10s'] as const;
type Duration = (typeof DURATIONS)[number];

/** Export: 현재 화면을 PNG·SVG로 저장, 몇 초간 녹화, 설정을 담은 공유 URL 복사 */
export function ExportPanel() {
  const [duration, setDuration] = useState<Duration>('5s');
  const [recording, setRecording] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const run = async (label: string, fn: () => unknown) => {
    try {
      await fn();
      setStatus(`${label} 저장됨`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    }
  };

  const record = () =>
    run('Video', async () => {
      setRecording(0);
      try {
        await recordVideo(parseInt(duration), setRecording);
      } finally {
        setRecording(null);
      }
    });

  const share = async () => {
    const { url, copied } = await copyShareUrl();
    setStatus(copied ? 'URL 복사됨' : `URL: ${url}`);
  };

  return (
    <>
      <div className="mm-export">
        <button className="mm-btn" onClick={() => run('PNG', exportPng)}>PNG</button>
        <button className="mm-btn" onClick={() => run('SVG', exportSvg)}>SVG</button>
      </div>
      <Segmented<Duration> label="Video length" value={duration} options={DURATIONS} onChange={setDuration} />
      <button className="mm-btn" disabled={recording !== null || !canRecordVideo()} onClick={record}>
        {recording !== null ? `Recording… ${Math.round(recording * 100)}%` : 'Record video'}
      </button>
      <button className="mm-btn" onClick={share}>Copy share URL</button>
      {status && <p className="mm-hint mm-export__status" role="status">{status}</p>}
    </>
  );
}
