package com.athar.adhkar;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;

/**
 * Tasbeeh counted by voice with the phone's speech recogniser
 * (src/lib/voiceTasbeeh.ts). The web view has no speech recognition, so the
 * app listens here and sends the growing transcript to the page, which counts
 * each repetition.
 *
 * Android's recogniser stops after each pause; a new segment starts straight
 * away until the person stops, and gives up only if it keeps failing.
 *
 *   available() → { available }
 *   start({ locale })    events: "transcript" { text, segment, final }, "state" { state }
 *   stop()
 */
@CapacitorPlugin(
    name = "VoiceTasbeeh",
    permissions = { @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone") }
)
public class VoiceTasbeehPlugin extends Plugin {
    private final Handler main = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private String locale = "ar-SA";
    private boolean listening = false;
    private int segment = 0;
    private final ArrayList<Long> recentFailures = new ArrayList<>();

    @PluginMethod
    public void available(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", SpeechRecognizer.isRecognitionAvailable(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void start(PluginCall call) {
        locale = call.getString("locale", "ar-SA");
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphoneCallback");
            return;
        }
        begin(call);
    }

    @PermissionCallback
    private void microphoneCallback(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            emitState("denied");
            call.reject("denied");
            return;
        }
        begin(call);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        main.post(() -> {
            stopListening();
            call.resolve();
        });
    }

    private void begin(PluginCall call) {
        main.post(() -> {
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
                emitState("unavailable");
                call.reject("unavailable");
                return;
            }
            stopListening();
            recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
            recognizer.setRecognitionListener(listener);
            listening = true;
            recentFailures.clear();
            startSegment();
            call.resolve();
        });
    }

    private void startSegment() {
        if (!listening || recognizer == null) return;
        segment += 1;
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale);
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());
        // Long dhikr sessions: let a pause run on before the segment closes.
        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 4000L);
        intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 4000L);
        try {
            recognizer.startListening(intent);
        } catch (RuntimeException e) {
            nextSegment(true);
        }
    }

    private void nextSegment(boolean failed) {
        if (!listening) return;
        if (failed) {
            long now = System.currentTimeMillis();
            recentFailures.removeIf(at -> now - at > 10_000L);
            recentFailures.add(now);
            if (recentFailures.size() > 5) {
                stopListening();
                emitState("error");
                return;
            }
        }
        // A short gap lets the recogniser release the microphone.
        main.postDelayed(this::startSegment, failed ? 300 : 50);
    }

    private void stopListening() {
        listening = false;
        main.removeCallbacksAndMessages(null);
        if (recognizer != null) {
            try {
                recognizer.cancel();
                recognizer.destroy();
            } catch (RuntimeException ignored) {
                // Already released.
            }
            recognizer = null;
        }
    }

    private void emitTranscript(Bundle results, boolean isFinal) {
        ArrayList<String> texts = results == null ? null : results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (texts == null || texts.isEmpty() || texts.get(0) == null) return;
        JSObject data = new JSObject();
        data.put("text", texts.get(0));
        data.put("segment", "android-" + segment);
        data.put("final", isFinal);
        notifyListeners("transcript", data);
    }

    private void emitState(String state) {
        JSObject data = new JSObject();
        data.put("state", state);
        notifyListeners("state", data);
    }

    private final RecognitionListener listener = new RecognitionListener() {
        @Override public void onReadyForSpeech(Bundle params) {}
        @Override public void onBeginningOfSpeech() {}
        @Override public void onRmsChanged(float rmsdB) {}
        @Override public void onBufferReceived(byte[] buffer) {}
        @Override public void onEndOfSpeech() {}
        @Override public void onEvent(int eventType, Bundle params) {}

        @Override
        public void onPartialResults(Bundle partialResults) {
            if (listening) emitTranscript(partialResults, false);
        }

        @Override
        public void onResults(Bundle results) {
            if (!listening) return;
            emitTranscript(results, true);
            nextSegment(false);
        }

        @Override
        public void onError(int error) {
            if (!listening) return;
            if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
                stopListening();
                emitState("denied");
                return;
            }
            // Silence or nothing understood is normal between phrases: carry on.
            boolean quiet = error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT;
            nextSegment(!quiet);
        }
    };

    @Override
    protected void handleOnDestroy() {
        stopListening();
        super.handleOnDestroy();
    }
}
