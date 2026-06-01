import imageio.v2 as iio2
import os

DOWNLOADS = r"C:\Users\Amrab\Downloads"
OUT = r"C:\Users\Amrab\Downloads\noor-adhkar\tools\video_frames"
os.makedirs(OUT, exist_ok=True)

videos = ["1000137716.mp4", "1000137722.mp4"]

for vid in videos:
    path = os.path.join(DOWNLOADS, vid)
    name = os.path.splitext(vid)[0]
    print(f"\n=== {vid} ===")
    try:
        reader = iio2.get_reader(path, "ffmpeg")
        meta = reader.get_meta_data()
        nframes = reader.count_frames()
        fps = meta.get("fps", 30)
        print("fps:", fps, "nframes:", nframes, "size:", meta.get("size"), "duration:", meta.get("duration"))
        n = 10
        idxs = [int(i * (nframes - 1) / (n - 1)) for i in range(n)]
        for j, fi in enumerate(idxs):
            try:
                frame = reader.get_data(fi)
                out = os.path.join(OUT, f"{name}_f{j:02d}.jpg")
                iio2.imwrite(out, frame)
                print("wrote", out)
            except Exception as e:
                print("frame", fi, "error:", e)
        reader.close()
    except Exception as e:
        print("error:", e)
