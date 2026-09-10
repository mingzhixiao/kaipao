Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;

public class SpriteProcessor {
    public static void ProcessBlackBg(string src, string dst, int threshold, int feather) {
        using (Bitmap bmp = (Bitmap)Image.FromFile(src)) {
            int w = bmp.Width;
            int h = bmp.Height;
            using (Bitmap outBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                BitmapData srcData = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                BitmapData dstData = outBmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
                int bytes = Math.Abs(srcData.Stride) * h;
                byte[] rgb = new byte[bytes];
                System.Runtime.InteropServices.Marshal.Copy(srcData.Scan0, rgb, 0, bytes);

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

                System.Runtime.InteropServices.Marshal.Copy(rgb, 0, dstData.Scan0, bytes);
                bmp.UnlockBits(srcData);
                outBmp.UnlockBits(dstData);
                outBmp.Save(dst, ImageFormat.Png);
                Console.WriteLine("Successfully created: " + dst);
            }
        }
    }

    public static void ProcessWhiteBg(string src, string dst, int threshold, int feather) {
        using (Bitmap bmp = (Bitmap)Image.FromFile(src)) {
            int w = bmp.Width;
            int h = bmp.Height;
            using (Bitmap outBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                BitmapData srcData = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                BitmapData dstData = outBmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
                int bytes = Math.Abs(srcData.Stride) * h;
                byte[] rgb = new byte[bytes];
                System.Runtime.InteropServices.Marshal.Copy(srcData.Scan0, rgb, 0, bytes);

                for (int i = 0; i < bytes; i += 4) {
                    byte b = rgb[i];
                    byte g = rgb[i + 1];
                    byte r = rgb[i + 2];
                    int min = Math.Min(r, Math.Min(g, b));

                    if (min >= threshold) {
                        rgb[i + 3] = 0;
                    } else if (min > threshold - feather) {
                        double alpha = (threshold - min) / (double)feather * 255.0;
                        rgb[i + 3] = (byte)Math.Max(0, Math.Min(255, (int)alpha));
                    } else {
                        rgb[i + 3] = 255;
                    }
                }

                System.Runtime.InteropServices.Marshal.Copy(rgb, 0, dstData.Scan0, bytes);
                bmp.UnlockBits(srcData);
                outBmp.UnlockBits(dstData);
                outBmp.Save(dst, ImageFormat.Png);
                Console.WriteLine("Successfully created: " + dst);
            }
        }
    }
}
"@

[SpriteProcessor]::ProcessBlackBg("D:\test\kaipao\assets\enemy_runner.jpg", "D:\test\kaipao\assets\runner.png", 22, 28)
[SpriteProcessor]::ProcessWhiteBg("D:\test\kaipao\assets\enemy_charger.jpg", "D:\test\kaipao\assets\charger.png", 228, 35)
[SpriteProcessor]::ProcessBlackBg("D:\test\kaipao\assets\enemy_behemoth.jpg", "D:\test\kaipao\assets\behemoth.png", 18, 25)
[SpriteProcessor]::ProcessBlackBg("D:\test\kaipao\assets\boss_overlord.jpg", "D:\test\kaipao\assets\boss_overlord.png", 20, 26)
