import { describe, expect, it, vi } from 'vitest';

import { AUTO_THRESHOLD_MIN, MicNoiseGateProcessor } from '../micNoiseGate';

function createFakeAnalyser(level: number) {
  const byte = Math.max(0, Math.min(255, Math.round(128 + level * 128)));
  return {
    getByteTimeDomainData(buffer: Uint8Array) {
      buffer.fill(byte);
    },
  };
}

function createProcessor() {
  const onSpeakingStateChange = vi.fn();
  const onMetricsChange = vi.fn();
  const processor = new MicNoiseGateProcessor(
    {
      automaticSensitivity: false,
      manualThreshold: 0.02,
      releaseMs: 30,
      noiseSuppressionEnabled: true,
      inputVolume: 1,
    },
    {
      onSpeakingStateChange,
      onMetricsChange,
    },
  );

  return {
    processor: processor as never as Record<string, unknown>,
    onSpeakingStateChange,
    onMetricsChange,
  };
}

describe('MicNoiseGateProcessor', () => {
  it('uses raw microphone level for speaking detection even if processed output is low', () => {
    const { processor, onSpeakingStateChange } = createProcessor();

    processor.rawAnalyser = createFakeAnalyser(0.035);
    processor.processedAnalyser = createFakeAnalyser(0.002);
    processor.outputAnalyser = createFakeAnalyser(0);
    processor.rawSamples = new Uint8Array(256);
    processor.processedSamples = new Uint8Array(256);
    processor.outputSamples = new Uint8Array(256);
    processor.noiseFloor = AUTO_THRESHOLD_MIN;
    processor.speaking = false;
    processor.holdUntil = 0;

    (processor.tick as () => void)();

    expect(onSpeakingStateChange).toHaveBeenCalledWith(true);
  });

  it('does not let processed audio alone trigger speaking when raw mic input is below threshold', () => {
    const { processor, onSpeakingStateChange, onMetricsChange } = createProcessor();

    processor.rawAnalyser = createFakeAnalyser(0.008);
    processor.processedAnalyser = createFakeAnalyser(0.045);
    processor.outputAnalyser = createFakeAnalyser(0.045);
    processor.rawSamples = new Uint8Array(256);
    processor.processedSamples = new Uint8Array(256);
    processor.outputSamples = new Uint8Array(256);
    processor.noiseFloor = AUTO_THRESHOLD_MIN;
    processor.speaking = false;
    processor.holdUntil = 0;

    (processor.tick as () => void)();

    expect(onSpeakingStateChange).not.toHaveBeenCalledWith(true);
    expect(onMetricsChange).toHaveBeenCalled();
    const [metrics] = onMetricsChange.mock.lastCall as [{ level: number; rawLevel?: number; processedLevel?: number; outputLevel?: number }];
    expect(metrics.level).toBeCloseTo(metrics.rawLevel ?? 0, 3);
    expect((metrics.processedLevel ?? 0)).toBeGreaterThan(metrics.level);
  });
});