Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class IconKeyer {
    public static void ProcessIcon(string srcPath, string dstPath, int blackThreshold, int featherRange) {
        using (Bitmap srcBmp = (Bitmap)Image.FromFile(srcPath)) {
            int w = srcBmp.Width;
            int h = srcBmp.Height;

            // Step 1: Extract alpha mask using flood fill from edges
            byte[] alphas = new byte[w * h];
            bool[] visited = new bool[w * h];
            Queue<int> q = new Queue<int>();

            BitmapData srcData = srcBmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            int stride = Math.Abs(srcData.Stride);
            int bytes = stride * h;
            byte[] rgb = new byte[bytes];
            System.Runtime.InteropServices.Marshal.Copy(srcData.Scan0, rgb, 0, bytes);
            srcBmp.UnlockBits(srcData);

            Func<int, int, bool> isBlackBg = (x, y) => {
                int idx = y * stride + x * 4;
                byte b = rgb[idx];
                byte g = rgb[idx + 1];
                byte r = rgb[idx + 2];
                return Math.Max(r, Math.Max(g, b)) <= blackThreshold;
            };

            // Seed 4 outer borders
            for (int x = 0; x < w; x++) {
                if (isBlackBg(x, 0)) { visited[x] = true; q.Enqueue(x); }
                int bIdx = (h - 1) * w + x;
                if (isBlackBg(x, h - 1)) { visited[bIdx] = true; q.Enqueue(bIdx); }
            }
            for (int y = 0; y < h; y++) {
                int lIdx = y * w;
                if (!visited[lIdx] && isBlackBg(0, y)) { visited[lIdx] = true; q.Enqueue(lIdx); }
                int rIdx = y * w + (w - 1);
                if (!visited[rIdx] && isBlackBg(w - 1, y)) { visited[rIdx] = true; q.Enqueue(rIdx); }
            }

            int[] dx = new int[] { 1, -1, 0, 0 };
            int[] dy = new int[] { 0, 0, 1, -1 };

            while (q.Count > 0) {
                int cur = q.Dequeue();
                int cx = cur % w;
                int cy = cur / w;

                for (int d = 0; d < 4; d++) {
                    int nx = cx + dx[d];
                    int ny = cy + dy[d];
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                        int nIdx = ny * w + nx;
                        if (!visited[nIdx] && isBlackBg(nx, ny)) {
                            visited[nIdx] = true;
                            q.Enqueue(nIdx);
                        }
                    }
                }
            }

            // Compute alpha:
            // If visited -> background (alpha = 0)
            // If not visited -> check distance to background or color luminosity for edge feathering
            for (int y = 0; y < h; y++) {
                for (int x = 0; x < w; x++) {
                    int p = y * w + x;
                    int idx = y * stride + x * 4;
                    if (visited[p]) {
                        rgb[idx + 3] = 0;
                    } else {
                        byte b = rgb[idx];
                        byte g = rgb[idx + 1];
                        byte r = rgb[idx + 2];
                        int maxVal = Math.Max(r, Math.Max(g, b));

                        if (maxVal <= blackThreshold) {
                            rgb[idx + 3] = 0;
                        } else if (maxVal < blackThreshold + featherRange) {
                            double ratio = (double)(maxVal - blackThreshold) / featherRange;
                            rgb[idx + 3] = (byte)Math.Min(255, Math.Max(0, (int)(ratio * 255.0)));
                        } else {
                            rgb[idx + 3] = 255;
                        }
                    }
                }
            }

            // Create intermediate transparent 1024x1024 bitmap
            using (Bitmap transBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                BitmapData transData = transBmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
                System.Runtime.InteropServices.Marshal.Copy(rgb, 0, transData.Scan0, bytes);
                transBmp.UnlockBits(transData);

                // Downscale to 512x512 with HighQualityBicubic
                using (Bitmap outBmp = new Bitmap(512, 512, PixelFormat.Format32bppArgb)) {
                    using (Graphics g = Graphics.FromImage(outBmp)) {
                        g.SmoothingMode = SmoothingMode.HighQuality;
                        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                        g.CompositingQuality = CompositingQuality.HighQuality;
                        g.Clear(Color.Transparent);
                        g.DrawImage(transBmp, new Rectangle(0, 0, 512, 512));
                    }
                    outBmp.Save(dstPath, ImageFormat.Png);
                    Console.WriteLine("Saved: " + dstPath);
                }
            }
        }
    }
}
"@
