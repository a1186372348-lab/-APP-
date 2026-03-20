import { useState, useRef, useCallback } from 'react';
import { Alert } from 'react-native';

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'error';

interface VoiceRecorderResult {
  status: RecordingStatus;
  duration: number; // seconds
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>; // returns transcribed text or null
  cancelRecording: () => void;
}

const MAX_DURATION = 15; // 15秒硬限制

export function useVoiceRecorder(
  onTranscribed: (text: string) => void,
  onError?: (err: string) => void
): VoiceRecorderResult {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [duration, setDuration] = useState(0);
  const recordingRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);

  const startRecording = useCallback(async () => {
    try {
      // expo-audio 录音逻辑
      const { Audio } = await import('expo-av');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      durationRef.current = 0;
      setDuration(0);
      setStatus('recording');

      // 计时器 + 强制 15 秒停止
      timerRef.current = setInterval(async () => {
        durationRef.current += 1;
        setDuration(durationRef.current);
        if (durationRef.current >= MAX_DURATION) {
          await stopRecording();
        }
      }, 1000);
    } catch (err) {
      setStatus('error');
      onError?.('无法启动录音，请检查麦克风权限');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!recordingRef.current) return null;
    if (timerRef.current) clearInterval(timerRef.current);

    setStatus('processing');
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setStatus('idle');
        return null;
      }

      // 上传至服务端转写
      const { aiApi } = await import('../api/client');
      const formData = new FormData();
      formData.append('audio', { uri, type: 'audio/m4a', name: 'recording.m4a' } as any);

      const res = await aiApi.transcribe(formData);
      setStatus('idle');
      setDuration(0);
      onTranscribed(res.data.text);
      return res.data.text;
    } catch (err: any) {
      setStatus('error');
      onError?.(err.response?.data?.error || '转写失败，请重试');
      return null;
    }
  }, [onTranscribed, onError]);

  const cancelRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }
    setStatus('idle');
    setDuration(0);
    durationRef.current = 0;
  }, []);

  return { status, duration, startRecording, stopRecording, cancelRecording };
}
