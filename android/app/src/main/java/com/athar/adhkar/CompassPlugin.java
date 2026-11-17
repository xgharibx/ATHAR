package com.athar.adhkar;

import android.app.Activity;
import android.content.Context;
import android.hardware.GeomagneticField;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.SystemClock;
import android.view.Display;
import android.view.Surface;
import android.view.WindowManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The Qibla compass's heading, from Android's own sensor fusion.
 *
 * The web view's compass events are magnetic-north readings (and on some
 * devices only relative ones). This plugin reads the fused rotation vector
 * (accelerometer, magnetometer and gyroscope together), so the needle is steady,
 * and corrects magnetic north to true north with the World Magnetic Model
 * that Android ships (GeomagneticField) for the user's location.
 *
 *   start({ latitude?, longitude?, altitude? })  begins updates; each one
 *       arrives as a "heading" event:
 *       { magneticHeading, trueHeading?, accuracy?, calibrationNeeded }
 *   setLocation({ latitude, longitude, altitude? })  updates the correction.
 *   stop()  ends updates.
 *
 * Headings are measured from the top of the screen in its current rotation,
 * or from the back camera when the phone is held upright.
 */
@CapacitorPlugin(name = "Compass")
public class CompassPlugin extends Plugin implements SensorEventListener {

    /** About 30 updates a second is smooth without flooding the bridge. */
    private static final long MIN_INTERVAL_MS = 33;
    /** Beyond this many degrees of possible error, ask the user to calibrate. */
    private static final double CALIBRATION_THRESHOLD_DEG = 25;
    private static final float GRAVITY_SMOOTHING = 0.8f;

    private SensorManager sensors;
    private Sensor rotationVector;
    private Sensor accelerometer;
    private Sensor magnetometer;

    private final float[] gravity = new float[3];
    private final float[] geomagnetic = new float[3];
    private final float[] rotation = new float[9];
    private final float[] remapped = new float[9];
    private final float[] rotationValues = new float[4];
    private boolean hasGravity;
    private boolean hasGeomagnetic;

    private boolean running;
    private long lastSentAt;
    private int magneticAccuracy = -1;
    private Float declination;

    @Override
    public void load() {
        sensors = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
    }

    @PluginMethod
    public void start(PluginCall call) {
        JSObject result = new JSObject();
        if (sensors == null) {
            result.put("available", false);
            call.resolve(result);
            return;
        }
        rotationVector = sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
        accelerometer = sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        magnetometer = sensors.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);
        if (rotationVector == null && (accelerometer == null || magnetometer == null)) {
            result.put("available", false);
            call.resolve(result);
            return;
        }
        applyLocation(call);
        running = true;
        register();
        result.put("available", true);
        call.resolve(result);
    }

    @PluginMethod
    public void setLocation(PluginCall call) {
        applyLocation(call);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        running = false;
        unregister();
        call.resolve();
    }

    @Override
    protected void handleOnPause() {
        super.handleOnPause();
        if (running) unregister();
    }

    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (running) register();
    }

    @Override
    protected void handleOnDestroy() {
        running = false;
        unregister();
        super.handleOnDestroy();
    }

    private void register() {
        unregister();
        hasGravity = false;
        hasGeomagnetic = false;
        if (rotationVector != null) {
            sensors.registerListener(this, rotationVector, SensorManager.SENSOR_DELAY_GAME);
        } else if (accelerometer != null) {
            sensors.registerListener(this, accelerometer, SensorManager.SENSOR_DELAY_GAME);
        }
        // The magnetometer also reports when it needs calibrating.
        if (magnetometer != null) {
            int rate = rotationVector != null ? SensorManager.SENSOR_DELAY_UI : SensorManager.SENSOR_DELAY_GAME;
            sensors.registerListener(this, magnetometer, rate);
        }
    }

    private void unregister() {
        if (sensors != null) sensors.unregisterListener(this);
    }

    private void applyLocation(PluginCall call) {
        Double latitude = call.getDouble("latitude");
        Double longitude = call.getDouble("longitude");
        if (latitude == null || longitude == null
            || latitude.isNaN() || longitude.isNaN()
            || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
            return;
        }
        Double altitude = call.getDouble("altitude", 0.0);
        GeomagneticField field = new GeomagneticField(
            latitude.floatValue(),
            longitude.floatValue(),
            altitude == null ? 0f : altitude.floatValue(),
            System.currentTimeMillis()
        );
        // Positive declination: magnetic north lies east of true north.
        declination = field.getDeclination();
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        int type = event.sensor.getType();
        double accuracyDegrees = -1;

        if (type == Sensor.TYPE_ROTATION_VECTOR) {
            // Some devices send more than four values, which older
            // getRotationMatrixFromVector implementations reject.
            System.arraycopy(event.values, 0, rotationValues, 0, 4);
            SensorManager.getRotationMatrixFromVector(rotation, rotationValues);
            if (event.values.length > 4 && event.values[4] > 0) {
                accuracyDegrees = Math.toDegrees(event.values[4]);
            }
        } else if (type == Sensor.TYPE_ACCELEROMETER) {
            for (int i = 0; i < 3; i++) {
                gravity[i] = hasGravity
                    ? GRAVITY_SMOOTHING * gravity[i] + (1 - GRAVITY_SMOOTHING) * event.values[i]
                    : event.values[i];
            }
            hasGravity = true;
            return;
        } else if (type == Sensor.TYPE_MAGNETIC_FIELD) {
            System.arraycopy(event.values, 0, geomagnetic, 0, 3);
            hasGeomagnetic = true;
            // With a rotation vector, the magnetometer is only watched for its accuracy.
            if (rotationVector != null || !hasGravity) return;
            if (!SensorManager.getRotationMatrix(rotation, null, gravity, geomagnetic)) return;
        } else {
            return;
        }

        long now = SystemClock.elapsedRealtime();
        if (now - lastSentAt < MIN_INTERVAL_MS) return;
        lastSentAt = now;

        float[] matrix = remapForDisplay(rotation);
        // World frame: x east, y north, z up. Column 1 is the top of the
        // screen, column 2 points out of it (so its opposite is the camera).
        double topEast = matrix[1];
        double topNorth = matrix[4];
        double backEast = -matrix[2];
        double backNorth = -matrix[5];
        double radians = Math.hypot(topEast, topNorth) >= Math.hypot(backEast, backNorth)
            ? Math.atan2(topEast, topNorth)
            : Math.atan2(backEast, backNorth);
        double magnetic = normalize(Math.toDegrees(radians));

        boolean calibrationNeeded =
            magneticAccuracy == SensorManager.SENSOR_STATUS_UNRELIABLE
                || magneticAccuracy == SensorManager.SENSOR_STATUS_ACCURACY_LOW
                || accuracyDegrees > CALIBRATION_THRESHOLD_DEG;

        JSObject data = new JSObject();
        data.put("magneticHeading", magnetic);
        if (declination != null) data.put("trueHeading", normalize(magnetic + declination));
        if (accuracyDegrees > 0) data.put("accuracy", accuracyDegrees);
        data.put("calibrationNeeded", calibrationNeeded);
        notifyListeners("heading", data);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        if (sensor.getType() == Sensor.TYPE_MAGNETIC_FIELD) magneticAccuracy = accuracy;
    }

    private float[] remapForDisplay(float[] matrix) {
        int axisX;
        int axisY;
        switch (displayRotation()) {
            case Surface.ROTATION_90:
                axisX = SensorManager.AXIS_Y;
                axisY = SensorManager.AXIS_MINUS_X;
                break;
            case Surface.ROTATION_180:
                axisX = SensorManager.AXIS_MINUS_X;
                axisY = SensorManager.AXIS_MINUS_Y;
                break;
            case Surface.ROTATION_270:
                axisX = SensorManager.AXIS_MINUS_Y;
                axisY = SensorManager.AXIS_X;
                break;
            default:
                return matrix;
        }
        SensorManager.remapCoordinateSystem(matrix, axisX, axisY, remapped);
        return remapped;
    }

    @SuppressWarnings("deprecation")
    private int displayRotation() {
        Activity activity = getActivity();
        if (activity == null) return Surface.ROTATION_0;
        Display display;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            display = activity.getDisplay();
        } else {
            WindowManager windows = activity.getWindowManager();
            display = windows == null ? null : windows.getDefaultDisplay();
        }
        return display == null ? Surface.ROTATION_0 : display.getRotation();
    }

    private static double normalize(double degrees) {
        double value = degrees % 360;
        return value < 0 ? value + 360 : value;
    }
}
