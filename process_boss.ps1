Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;

public class ImageUtils {
    public static void ProcessColorKey(string src, string dst, double tolerance, double feather) {
        using (Bitmap bmp = (Bitmap)Image.FromFile(src)) {
            int w = bmp.Width;
            int h = bmp.Height;
            using (Bitmap outBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                BitmapData srcData = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                BitmapData dstData = outBmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
                int bytes = Math.Abs(srcData.Stride) * h;
                byte[] rgb = new byte[bytes];
                System.Runtime.InteropServices.Marshal.Copy(srcData.Scan0, rgb, 0, bytes);
                int stride = Math.Abs(srcData.Stride);
                int[][] probes = new int[][] {
                    new int[]{5, 5}, new int[]{w-6, 5}, new int[]{5, h-6}, new int[]{w-6, h-6},
                    new int[]{w/2, 5}, new int[]{w/2, h-6}, new int[]{5, h/2}, new int[]{w-6, h/2}
                };
                double sumR = 0, sumG = 0, sumB = 0;
                foreach (int[] p in probes) {
                    int i = p[1] * stride + p[0] * 4;
                    sumB += rgb[i];
                    sumG += rgb[i+1];
                    sumR += rgb[i+2];
                }
                double bgR = sumR / probes.Length;
                double bgG = sumG / probes.Length;
                double bgB = sumB / probes.Length;
                Console.WriteLine("Auto-detected BG Palette: R=" + (int)bgR + ", G=" + (int)bgG + ", B=" + (int)bgB);
                for (int i = 0; i < bytes; i += 4) {
                    double b = rgb[i];
                    double g = rgb[i+1];
                    double r = rgb[i+2];
                    double dist = Math.Sqrt((r-bgR)*(r-bgR) + (g-bgG)*(g-bgG) + (b-bgB)*(b-bgB));
                    if (dist <= tolerance) {
                        rgb[i+3] = 0;
                    } else if (dist < tolerance + feather) {
                        double a = (dist - tolerance) / feather * 255.0;
                        rgb[i+3] = (byte)Math.Max(0, Math.Min(255, (int)a));
                    } else {
                        rgb[i+3] = 255;
                    }
                }
                System.Runtime.InteropServices.Marshal.Copy(rgb, 0, dstData.Scan0, bytes);
                bmp.UnlockBits(srcData);
                outBmp.UnlockBits(dstData);
                outBmp.Save(dst, ImageFormat.Png);
                Console.WriteLine("Successfully created transparent: " + dst);
            }
        }
    }
}
"@

[ImageUtils]::ProcessColorKey('D:\test\kaipao\assets\boss_overlord.jpg', 'D:\test\kaipao\assets\boss_overlord.png', 40.0, 22.0)
