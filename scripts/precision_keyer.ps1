Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

public class PrecisionKeyer {
    public static void ProcessPureBlack(string src, string dst, int maxBg) {
        using (Bitmap bmp = (Bitmap)Image.FromFile(src)) {
            int w = bmp.Width;
            int h = bmp.Height;
            using (Bitmap outBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                BitmapData srcData = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                BitmapData dstData = outBmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
                int bytes = Math.Abs(srcData.Stride) * h;
                byte[] rgb = new byte[bytes];
                System.Runtime.InteropServices.Marshal.Copy(srcData.Scan0, rgb, 0, bytes);

                // Flood fill from borders only where max(r,g,b) <= maxBg
                bool[] isBg = new bool[w * h];
                bool[] visited = new bool[w * h];
                Queue<int> q = new Queue<int>();

                Func<int, int, bool> isNearBlack = (x, y) => {
                    int i = (y * w + x) * 4;
                    int b = rgb[i];
                    int g = rgb[i + 1];
                    int r = rgb[i + 2];
                    return Math.Max(r, Math.Max(g, b)) <= maxBg;
                };

                for (int x = 0; x < w; x++) {
                    if (isNearBlack(x, 0)) { visited[x] = true; q.Enqueue(x); }
                    int bIdx = (h - 1) * w + x;
                    if (isNearBlack(x, h - 1)) { visited[bIdx] = true; q.Enqueue(bIdx); }
                }
                for (int y = 0; y < h; y++) {
                    int lIdx = y * w;
                    if (!visited[lIdx] && isNearBlack(0, y)) { visited[lIdx] = true; q.Enqueue(lIdx); }
                    int rIdx = y * w + (w - 1);
                    if (!visited[rIdx] && isNearBlack(w - 1, y)) { visited[rIdx] = true; q.Enqueue(rIdx); }
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
                            if (!visited[nIdx] && isNearBlack(nx, ny)) {
                                visited[nIdx] = true;
                                q.Enqueue(nIdx);
                            }
                        }
                    }
                }

                // Apply alpha: if isBg -> alpha = 0. Else alpha = 255.
                for (int i = 0; i < w * h; i++) {
                    int pIdx = i * 4;
                    if (isBg[i]) {
                        rgb[pIdx + 3] = 0;
                    } else {
                        // Check if on edge of bg for a 1-pixel soft antialiasing
                        rgb[pIdx + 3] = 255;
                    }
                }

                System.Runtime.InteropServices.Marshal.Copy(rgb, 0, dstData.Scan0, bytes);
                bmp.UnlockBits(srcData);
                outBmp.UnlockBits(dstData);
                outBmp.Save(dst, ImageFormat.Png);
                Console.WriteLine("Precision pure black removed: " + dst);
            }
        }
    }

    public static void ProcessBossBg(string src, string dst) {
        using (Bitmap bmp = (Bitmap)Image.FromFile(src)) {
            int w = bmp.Width;
            int h = bmp.Height;
            using (Bitmap outBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                BitmapData srcData = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                BitmapData dstData = outBmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
                int bytes = Math.Abs(srcData.Stride) * h;
                byte[] rgb = new byte[bytes];
                System.Runtime.InteropServices.Marshal.Copy(srcData.Scan0, rgb, 0, bytes);

                // Boss bg color is around R=16, G=15, B=23. Distance in color space <= 12
                bool[] isBg = new bool[w * h];
                bool[] visited = new bool[w * h];
                Queue<int> q = new Queue<int>();

                Func<int, int, bool> isBgColor = (x, y) => {
                    int i = (y * w + x) * 4;
                    int b = rgb[i];
                    int g = rgb[i + 1];
                    int r = rgb[i + 2];
                    double dist = Math.Sqrt((r - 16)*(r - 16) + (g - 15)*(g - 15) + (b - 23)*(b - 23));
                    return dist <= 12.0;
                };

                for (int x = 0; x < w; x++) {
                    if (isBgColor(x, 0)) { visited[x] = true; q.Enqueue(x); }
                    int bIdx = (h - 1) * w + x;
                    if (isBgColor(x, h - 1)) { visited[bIdx] = true; q.Enqueue(bIdx); }
                }
                for (int y = 0; y < h; y++) {
                    int lIdx = y * w;
                    if (!visited[lIdx] && isBgColor(0, y)) { visited[lIdx] = true; q.Enqueue(lIdx); }
                    int rIdx = y * w + (w - 1);
                    if (!visited[rIdx] && isBgColor(w - 1, y)) { visited[rIdx] = true; q.Enqueue(rIdx); }
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
                            if (!visited[nIdx] && isBgColor(nx, ny)) {
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
                Console.WriteLine("Boss precision transparent created: " + dst);
            }
        }
    }
}
"@

# Pure black background extraction with strict maxBg = 5!
[PrecisionKeyer]::ProcessPureBlack("D:\test\kaipao\assets\enemy_runner.jpg", "D:\test\kaipao\assets\runner.png", 5)
[PrecisionKeyer]::ProcessPureBlack("D:\test\kaipao\assets\enemy_behemoth.jpg", "D:\test\kaipao\assets\behemoth.png", 5)
[PrecisionKeyer]::ProcessBossBg("D:\test\kaipao\assets\boss_overlord.jpg", "D:\test\kaipao\assets\boss_overlord.png")
