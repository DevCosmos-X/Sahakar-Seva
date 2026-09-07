import { useEffect, useRef, useState, useCallback } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import {
  addEventListener,
  startListening,
  stopListening,
  destroy,
  isRecognitionAvailable,
  setRecognitionLanguage,
  speechRecogntionEvents,
} from 'react-native-speech-recognition-kit';

/**
 * useSpeechToText — reusable wrapper around react-native-speech-recognition-kit (Phase 10b).
 *
 * WHY THIS LIBRARY: the original @react-native-voice/voice is deprecated AND is a legacy
 * (bridge-era) native module — under React Native's New Architecture (bridgeless), its JS looked
 * up NativeModules.Voice which resolved to null ("Cannot read property 'startSpeech' of null"),
 * so it never worked here. This library is a proper TurboModule (native to the New Arch), on-device
 * (Apple SFSpeechRecognizer / Android SpeechRecognizer), no cloud, and bare-RN (no Expo). See
 * MIGRATION_NOTES.md §6-ish for the full rationale.
 *
 * Shared by the BookingScreen describe-field mic and the ChatWidget mic. Handles: RECORD_AUDIO
 * runtime permission, engine-availability detection, start/stop, partial + final results, and a
 * GRACEFUL FALLBACK — if the device has no recognition engine (e.g. Android emulator) or permission
 * is denied, `error` is set and the caller shows a "please type" hint. The booking + chat flows
 * both work fully without voice.
 *
 * Language: the kit takes a BCP-47 locale. We map the app's language code (en/hi/bn) to
 * en-IN / hi-IN / bn-IN so Hindi/Bengali dictation works when the device has those packs.
 *
 * @param {object} opts
 * @param {string} opts.language  app language code 'en' | 'hi' | 'bn'
 * @param {(text: string) => void} opts.onFinalResult  called with recognized text on completion
 * @returns {{ listening, available, error, partial, start, stop }}
 */

const LOCALE = { en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN' };

export default function useSpeechToText({ language = 'en', onFinalResult } = {}) {
  const [listening, setListening] = useState(false);
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState(null);
  const [partial, setPartial] = useState('');

  // Keep the latest onFinalResult without re-subscribing listeners on every render.
  const onFinalRef = useRef(onFinalResult);
  useEffect(() => {
    onFinalRef.current = onFinalResult;
  }, [onFinalResult]);

  useEffect(() => {
    let mounted = true;

    Promise.resolve(isRecognitionAvailable())
      .then((v) => {
        if (mounted) setAvailable(Boolean(v));
      })
      .catch(() => {
        if (mounted) setAvailable(false);
      });

    const subs = [
      addEventListener(speechRecogntionEvents.START, () => {
        setError(null);
        setListening(true);
      }),
      addEventListener(speechRecogntionEvents.END, () => setListening(false)),
      addEventListener(speechRecogntionEvents.PARTIAL_RESULTS, (e) => {
        if (e?.value) setPartial(e.value);
      }),
      addEventListener(speechRecogntionEvents.RESULTS, (e) => {
        if (e?.value && onFinalRef.current) onFinalRef.current(e.value);
        setPartial('');
        setListening(false);
      }),
      addEventListener(speechRecogntionEvents.ERROR, (e) => {
        setError(e?.message || 'Speech recognition error');
        setListening(false);
      }),
    ];

    return () => {
      mounted = false;
      try {
        destroy();
      } catch {
        // ignore
      }
      subs.forEach((s) => s?.remove && s.remove());
    };
  }, []);

  const ensurePermission = useCallback(async () => {
    if (Platform.OS !== 'android') return true;
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone access',
          message: 'Sahakar Seva needs the microphone to let you speak your request.',
          buttonPositive: 'Allow',
          buttonNegative: 'Not now',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setPartial('');
    const ok = await ensurePermission();
    if (!ok) {
      setError('Microphone permission denied');
      return;
    }
    try {
      await setRecognitionLanguage(LOCALE[language] || 'en-IN');
    } catch {
      // non-fatal — fall back to the engine's default language
    }
    try {
      await startListening();
    } catch (e) {
      setError(e?.message || 'Could not start voice recognition');
      setListening(false);
    }
  }, [ensurePermission, language]);

  const stop = useCallback(async () => {
    try {
      await stopListening();
    } catch {
      // ignore — stop can throw if not currently listening
    }
    setListening(false);
  }, []);

  return { listening, available, error, partial, start, stop };
}
