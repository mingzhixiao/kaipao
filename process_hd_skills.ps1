Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

public class SkillAssetProcessor {
    public static void ProcessTornado(string src, string dst) {
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
                    bool isGrey = Math.Abs(r - g) <= 8 && Math.Abs(g - b) <= 8;

                    // Black or dark grey checkerboard square removal
                    if (max <= 16 || (isGrey && max <= 85)) {
                        rgb[i + 3] = 0;
                    } else if (isGrey && max < 110) {
                        double a = (max - 85) / 25.0 * 255.0;
                        rgb[i + 3] = (byte)Math.Max(0, Math.Min(255, (int)a));
                    } else if (max < 45) {
                        double a = (max - 16) / 29.0 * 255.0;
                        rgb[i + 3] = (byte)Math.Max(0, Math.Min(255, (int)a));
                    } else {
                        rgb[i + 3] = 255;
                    }
                }

                System.Runtime.InteropServices.Marshal.Copy(rgb, 0, dstData.Scan0, bytes);
                bmp.UnlockBits(srcData);
                outBmp.UnlockBits(dstData);
                outBmp.Save(dst, ImageFormat.Png);
                Console.WriteLine("Successfully created Tornado HD PNG: " + dst);
            }
        }
    }

    public static void ProcessBomber(string src, string dst) {
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

                    if (max <= 12) {
                        rgb[i + 3] = 0;
                    } else if (max < 32) {
                        double a = (max - 12) / 20.0 * 255.0;
                        rgb[i + 3] = (byte)Math.Max(0, Math.Min(255, (int)a));
                    } else {
                        rgb[i + 3] = 255;
                    }
                }

                System.Runtime.InteropServices.Marshal.Copy(rgb, 0, dstData.Scan0, bytes);
                bmp.UnlockBits(srcData);
                outBmp.UnlockBits(dstData);
                outBmp.Save(dst, ImageFormat.Png);
                Console.WriteLine("Successfully created Bomber HD PNG: " + dst);
            }
        }
    }

    public static void ProcessBoomerang(string src, string dst) {
        using (Bitmap bmp = (Bitmap)Image.FromFile(src)) {
            int w = bmp.Width;
            int h = bmp.Height;
            using (Bitmap outBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                BitmapData srcData = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                BitmapData dstData = outBmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
                int bytes = Math.Abs(srcData.Stride) * h;
                byte[] rgb = new byte[bytes];
                System.Runtime.InteropServices.Marshal.Copy(srcData.Scan0, rgb, 0, bytes);

                bool[] isBg = new bool[w * h];
                bool[] visited = new bool[w * h];
                Queue<int> q = new Queue<int>();

                Func<int, int, bool> isCheckerPixel = (x, y) => {
                    int idx = (y * w + x) * 4;
                    int b = rgb[idx];
                    int g = rgb[idx + 1];
                    int r = rgb[idx + 2];
                    int max = Math.Max(r, Math.Max(g, b));
                    bool isGrey = Math.Abs(r - g) <= 8 && Math.Abs(g - b) <= 8;
                    return max <= 16 || (isGrey && max <= 88);
                };

                for (int x = 0; x < w; x++) {
                    if (isCheckerPixel(x, 0)) { visited[x] = true; q.Enqueue(x); }
                    int bIdx = (h - 1) * w + x;
                    if (isCheckerPixel(x, h - 1)) { visited[bIdx] = true; q.Enqueue(bIdx); }
                }
                for (int y = 0; y < h; y++) {
                    int lIdx = y * w;
                    if (!visited[lIdx] && isCheckerPixel(0, y)) { visited[lIdx] = true; q.Enqueue(lIdx); }
                    int rIdx = y * w + (w - 1);
                    if (!visited[rIdx] && isCheckerPixel(w - 1, y)) { visited[rIdx] = true; q.Enqueue(rIdx); }
                }

                int[] dx = new int[] { 1, -1, 0, 0 };
                int[] dy = new int[] { 0, 0, 1, -1 };

                while (q.Count > 0) {
                    int cur = q.Dequeue();
                    isBg[cur] = true;
                    int cx = cur % w;
                    int cy = cur / w;

                    for (int d = 0; d < 4; d++) {
                        int nx = cx + dx[d];
                        int ny = cy + dy[d];
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                            int nIdx = ny * w + nx;
                            if (!visited[nIdx] && isCheckerPixel(nx, ny)) {
                                visited[nIdx] = true;
                                q.Enqueue(nIdx);
                            }
                        }
                    }
                }

                for (int i = 0; i < w * h; i++) {
                    int pIdx = i * 4;
                    if (isBg[i]) {
                        rgb[pIdx + 3] = 0;
                    } else {
                        rgb[pIdx + 3] = 255;
                    }
                }

                System.Runtime.InteropServices.Marshal.Copy(rgb, 0, dstData.Scan0, bytes);
                bmp.UnlockBits(srcData);
                outBmp.UnlockBits(dstData);
                outBmp.Save(dst, ImageFormat.Png);
                Console.WriteLine("Successfully created Boomerang HD PNG: " + dst);
            }
        }
    }
}
"@

[SkillAssetProcessor]::ProcessTornado("C:\Users\15199\.gemini\antigravity-ide\brain\2898142d-7a1e-4d32-b0c3-3700f8c34f8c\hd_tornado_vortex_1788778493543.jpg", "D:\test\kaipao\assets\skills\tornado.png")
[SkillAssetProcessor]::ProcessBomber("C:\Users\15199\.gemini\antigravity-ide\brain\2898142d-7a1e-4d32-b0c3-3700f8c34f8c\hd_stealth_bomber_1788778509273.jpg", "D:\test\kaipao\assets\skills\bomber.png")
[SkillAssetProcessor]::ProcessBoomerang("C:\Users\15199\.gemini\antigravity-ide\brain\2898142d-7a1e-4d32-b0c3-3700f8c34f8c\hd_energy_boomerang_1788778526707.jpg", "D:\test\kaipao\assets\skills\boomerang.png")
