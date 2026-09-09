using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public class Program {
    public static void Main(string[] args) {
        string brainDir = @"C:\Users\15199\.gemini\antigravity-ide\brain\4dfa9f08-eb66-4001-9b0a-f23a27b3bac9";
        string bgSrc = brainDir + @"\bg_highway_scifi_1788942554750.jpg";
        string wallSrc = brainDir + @"\fortress_wall_scifi_1788942575284.jpg";
        string truckSrc = brainDir + @"\maglev_sweeper_vessel_1788942604399.jpg";
        string fluffySrc = brainDir + @"\tactical_drone_orb_1788942629390.jpg";

        string bgDst = @"D:\test\kaipao\assets\environment\bg_highway.png";
        string wallDst = @"D:\test\kaipao\assets\environment\fortress_wall.png";
        string truckDst = @"D:\test\kaipao\assets\vehicles\truck.png";
        string truckF0Dst = @"D:\test\kaipao\assets\vehicles\truck_frame_0.png";
        string truckF1Dst = @"D:\test\kaipao\assets\vehicles\truck_frame_1.png";
        string truckCardDst = @"D:\test\kaipao\assets\cards\icon_truck.png";
        string truckItemDst = @"D:\test\kaipao\assets\items\item_chip_truck.png";
        string fluffyDst = @"D:\test\kaipao\assets\pets\fluffy.png";
        string fluffyItemDst = @"D:\test\kaipao\assets\items\item_fluffy_shard.png";

        Console.WriteLine("[1/4] Processing Background...");
        ResizeImage(bgSrc, bgDst, 768, 1376);

        Console.WriteLine("[2/4] Processing Fortress Wall...");
        ProcessFortressWall(wallSrc, wallDst, 1376, 660);

        Console.WriteLine("[3/4] Processing Maglev Sweeper Vessel (Rotating 90deg CW & Keying)...");
        KeyBlackAndResize(truckSrc, truckDst, 1024, 1024, 18, 30, RotateFlipType.Rotate90FlipNone);
        KeyBlackAndResize(truckSrc, truckF0Dst, 1024, 1024, 18, 30, RotateFlipType.Rotate90FlipNone);
        KeyBlackAndResize(truckSrc, truckF1Dst, 1024, 1024, 18, 30, RotateFlipType.Rotate90FlipNone);
        KeyBlackAndResize(truckSrc, truckCardDst, 160, 160, 18, 30, RotateFlipType.Rotate90FlipNone);
        KeyBlackAndResize(truckSrc, truckItemDst, 136, 136, 18, 30, RotateFlipType.Rotate90FlipNone);

        Console.WriteLine("[4/4] Processing Tactical Drone Orb (Keying)...");
        KeyBlackAndResize(fluffySrc, fluffyDst, 480, 480, 20, 32, RotateFlipType.RotateNoneFlipNone);
        KeyBlackAndResize(fluffySrc, fluffyItemDst, 136, 136, 20, 32, RotateFlipType.RotateNoneFlipNone);

        Console.WriteLine("All Starcore Defense visual assets processed and deployed successfully!");
    }

    public static void ResizeImage(string src, string dst, int targetW, int targetH) {
        using (Image srcImg = Image.FromFile(src))
        using (Bitmap outBmp = new Bitmap(targetW, targetH, PixelFormat.Format32bppArgb))
        using (Graphics g = Graphics.FromImage(outBmp)) {
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.SmoothingMode = SmoothingMode.HighQuality;
            g.DrawImage(srcImg, 0, 0, targetW, targetH);
            outBmp.Save(dst, ImageFormat.Png);
        }
    }

    public static void KeyBlackAndResize(string src, string dst, int targetW, int targetH, int threshold, int feather, RotateFlipType rotate) {
        using (Bitmap bmp = (Bitmap)Image.FromFile(src)) {
            if (rotate != RotateFlipType.RotateNoneFlipNone) {
                bmp.RotateFlip(rotate);
            }

            int w = bmp.Width;
            int h = bmp.Height;
            using (Bitmap keyedBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                BitmapData srcData = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                BitmapData dstData = keyedBmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
                int bytes = Math.Abs(srcData.Stride) * h;
                byte[] rgb = new byte[bytes];
                Marshal.Copy(srcData.Scan0, rgb, 0, bytes);

                for (int i = 0; i < bytes; i += 4) {
                    byte b = rgb[i];
                    byte g = rgb[i + 1];
                    byte r = rgb[i + 2];
                    int max = Math.Max(r, Math.Max(g, b));

                    if (max <= threshold) {
                        rgb[i + 3] = 0;
                    } else if (max < threshold + feather) {
                        double alpha = (max - threshold) / (double)feather * 255.0;
                        rgb[i + 3] = (byte)Math.Max(0, Math.Min(255, (int)alpha));
                    } else {
                        rgb[i + 3] = 255;
                    }
                }

                Marshal.Copy(rgb, 0, dstData.Scan0, bytes);
                bmp.UnlockBits(srcData);
                keyedBmp.UnlockBits(dstData);

                using (Bitmap finalBmp = new Bitmap(targetW, targetH, PixelFormat.Format32bppArgb))
                using (Graphics g = Graphics.FromImage(finalBmp)) {
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    g.SmoothingMode = SmoothingMode.HighQuality;
                    g.DrawImage(keyedBmp, 0, 0, targetW, targetH);
                    finalBmp.Save(dst, ImageFormat.Png);
                }
            }
        }
    }

    public static void ProcessFortressWall(string src, string dst, int targetW, int targetH) {
        using (Bitmap bmp = (Bitmap)Image.FromFile(src)) {
            int w = bmp.Width;
            int h = bmp.Height;

            using (Bitmap keyedBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                BitmapData srcData = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                BitmapData dstData = keyedBmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
                int bytes = Math.Abs(srcData.Stride) * h;
                byte[] rgb = new byte[bytes];
                Marshal.Copy(srcData.Scan0, rgb, 0, bytes);

                int stride = Math.Abs(srcData.Stride);
                for (int y = 0; y < h; y++) {
                    for (int x = 0; x < w; x++) {
                        int idx = y * stride + x * 4;
                        byte b = rgb[idx];
                        byte g = rgb[idx + 1];
                        byte r = rgb[idx + 2];
                        int max = Math.Max(r, Math.Max(g, b));

                        // 顶部背景透明化，墙体金属与能量光路保留
                        if (y < h * 0.85 && max <= 18) {
                            rgb[idx + 3] = 0;
                        } else if (y < h * 0.85 && max < 40) {
                            double alpha = (max - 18) / 22.0 * 255.0;
                            rgb[idx + 3] = (byte)Math.Max(0, Math.Min(255, (int)alpha));
                        } else {
                            rgb[idx + 3] = 255;
                        }
                    }
                }

                Marshal.Copy(rgb, 0, dstData.Scan0, bytes);
                bmp.UnlockBits(srcData);
                keyedBmp.UnlockBits(dstData);

                using (Bitmap finalBmp = new Bitmap(targetW, targetH, PixelFormat.Format32bppArgb))
                using (Graphics g = Graphics.FromImage(finalBmp)) {
                    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    g.SmoothingMode = SmoothingMode.HighQuality;
                    g.DrawImage(keyedBmp, 0, 0, targetW, targetH);
                    finalBmp.Save(dst, ImageFormat.Png);
                }
            }
        }
    }
}
