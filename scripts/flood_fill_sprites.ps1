Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

public class FloodFillKeyer {
    public static void RemoveBorderBg(string src, string dst, bool isWhiteBg, int colorThreshold, int feather) {
        using (Bitmap bmp = (Bitmap)Image.FromFile(src)) {
            int w = bmp.Width;
            int h = bmp.Height;
            using (Bitmap outBmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                BitmapData srcData = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
                BitmapData dstData = outBmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
                int bytes = Math.Abs(srcData.Stride) * h;
                byte[] rgb = new byte[bytes];
                System.Runtime.InteropServices.Marshal.Copy(srcData.Scan0, rgb, 0, bytes);

                // isBgMatch checks if a pixel is candidate background
                Func<int, int, bool> isBgMatch = (x, y) => {
                    int i = (y * w + x) * 4;
                    int b = rgb[i];
                    int g = rgb[i + 1];
                    int r = rgb[i + 2];
                    if (isWhiteBg) {
                        int min = Math.Min(r, Math.Min(g, b));
                        return min >= (colorThreshold - feather);
                    } else {
                        int max = Math.Max(r, Math.Max(g, b));
                        return max <= (colorThreshold + feather);
                    }
                };

                // Distance/Alpha map: 0 = not visited/foreground, >0 = distance from fg
                byte[] alpha = new byte[w * h];
                for (int i = 0; i < alpha.Length; i++) alpha[i] = 255; // default fully opaque

                bool[] visited = new bool[w * h];
                Queue<int> queue = new Queue<int>();

                // Push all border pixels that match bg candidate
                Action<int, int> tryEnqueueBorder = (x, y) => {
                    int idx = y * w + x;
                    if (!visited[idx] && isBgMatch(x, y)) {
                        visited[idx] = true;
                        queue.Enqueue(idx);
                    }
                };

                for (int x = 0; x < w; x++) {
                    tryEnqueueBorder(x, 0);
                    tryEnqueueBorder(x, h - 1);
                }
                for (int y = 0; y < h; y++) {
                    tryEnqueueBorder(0, y);
                    tryEnqueueBorder(w - 1, y);
                }

                // BFS flood fill
                int[] dx = new int[] { 1, -1, 0, 0 };
                int[] dy = new int[] { 0, 0, 1, -1 };

                while (queue.Count > 0) {
                    int cur = queue.Dequeue();
                    int cx = cur % w;
                    int cy = cur / w;

                    int pIdx = cur * 4;
                    int b = rgb[pIdx];
                    int g = rgb[pIdx + 1];
                    int r = rgb[pIdx + 2];

                    if (isWhiteBg) {
                        int min = Math.Min(r, Math.Min(g, b));
                        if (min >= colorThreshold) {
                            alpha[cur] = 0; // completely transparent background
                        } else {
                            // Feather edge
                            double t = (colorThreshold - min) / (double)feather;
                            alpha[cur] = (byte)Math.Max(0, Math.Min(255, (int)(t * 255.0)));
                        }
                    } else {
                        int max = Math.Max(r, Math.Max(g, b));
                        if (max <= colorThreshold) {
                            alpha[cur] = 0; // completely transparent background
                        } else {
                            // Feather edge
                            double t = (max - colorThreshold) / (double)feather;
                            alpha[cur] = (byte)Math.Max(0, Math.Min(255, (int)(t * 255.0)));
                        }
                    }

                    // Expand to 4 neighbors
                    for (int d = 0; d < 4; d++) {
                        int nx = cx + dx[d];
                        int ny = cy + dy[d];
                        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                            int nIdx = ny * w + nx;
                            if (!visited[nIdx] && isBgMatch(nx, ny)) {
                                visited[nIdx] = true;
                                queue.Enqueue(nIdx);
                            }
                        }
                    }
                }

                // Apply alpha to output
                for (int y = 0; y < h; y++) {
                    for (int x = 0; x < w; x++) {
                        int idx = y * w + x;
                        int pIdx = idx * 4;
                        rgb[pIdx + 3] = alpha[idx];
                    }
                }

                System.Runtime.InteropServices.Marshal.Copy(rgb, 0, dstData.Scan0, bytes);
                bmp.UnlockBits(srcData);
                outBmp.UnlockBits(dstData);
                outBmp.Save(dst, ImageFormat.Png);
                Console.WriteLine("Flood-fill transparency created: " + dst);
            }
        }
    }
}
"@

# enemy_runner.jpg has dark black background, threshold 22, feather 18
[FloodFillKeyer]::RemoveBorderBg("D:\test\kaipao\assets\enemy_runner.jpg", "D:\test\kaipao\assets\runner.png", $false, 24, 20)

# enemy_charger.jpg has white background, threshold 230, feather 25
[FloodFillKeyer]::RemoveBorderBg("D:\test\kaipao\assets\enemy_charger.jpg", "D:\test\kaipao\assets\charger.png", $true, 230, 25)

# enemy_behemoth.jpg has black background, threshold 20, feather 18
[FloodFillKeyer]::RemoveBorderBg("D:\test\kaipao\assets\enemy_behemoth.jpg", "D:\test\kaipao\assets\behemoth.png", $false, 20, 18)

# boss_overlord.jpg has black background, threshold 22, feather 18
[FloodFillKeyer]::RemoveBorderBg("D:\test\kaipao\assets\boss_overlord.jpg", "D:\test\kaipao\assets\boss_overlord.png", $false, 22, 18)
