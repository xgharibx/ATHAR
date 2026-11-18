package com.athar.adhkar;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/** Runs PrayerTopUp twice a day, and right after the app hands over a new plan. */
public class PrayerTopUpWorker extends Worker {
    public PrayerTopUpWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        PrayerTopUp.run(getApplicationContext());
        return Result.success();
    }
}
