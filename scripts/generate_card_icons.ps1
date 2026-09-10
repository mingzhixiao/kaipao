Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class IconGenerator {
    private static void DrawTechFrame(Graphics g, int size, Color glowColor, Color frameColor) {
        int pad = 12;
        int corner = 36;
        Rectangle rect = new Rectangle(pad, pad, size - pad * 2, size - pad * 2);

        // Dark background with gradient
        using (LinearGradientBrush bgBrush = new LinearGradientBrush(new Point(0, 0), new Point(0, size), Color.FromArgb(255, 12, 18, 30), Color.FromArgb(255, 4, 7, 14))) {
            using (GraphicsPath path = CreateRoundedRect(rect, corner)) {
                g.FillPath(bgBrush, path);
            }
        }

        // Inner circuit / texture lines
        using (Pen gridPen = new Pen(Color.FromArgb(30, glowColor.R, glowColor.G, glowColor.B), 1.5f)) {
            for (int i = 40; i < size - 40; i += 32) {
                g.DrawLine(gridPen, i, 30, i, size - 30);
                g.DrawLine(gridPen, 30, i, size - 30, i);
            }
        }

        // Outer Metallic Frame
        using (Pen framePen = new Pen(Color.FromArgb(255, 40, 56, 80), 8f)) {
            using (GraphicsPath path = CreateRoundedRect(rect, corner)) {
                g.DrawPath(framePen, path);
            }
        }

        // Inner Cyber Glow Border
        using (Pen glowPen = new Pen(Color.FromArgb(180, glowColor.R, glowColor.G, glowColor.B), 3.5f)) {
            Rectangle innerRect = new Rectangle(pad + 4, pad + 4, size - (pad + 4) * 2, size - (pad + 4) * 2);
            using (GraphicsPath path = CreateRoundedRect(innerRect, corner - 4)) {
                g.DrawPath(glowPen, path);
            }
        }

        // 4 Corner Tech LED accents
        using (SolidBrush ledBrush = new SolidBrush(glowColor)) {
            g.FillRectangle(ledBrush, pad + 10, pad + 6, 16, 4);
            g.FillRectangle(ledBrush, size - pad - 26, pad + 6, 16, 4);
            g.FillRectangle(ledBrush, pad + 10, size - pad - 10, 16, 4);
            g.FillRectangle(ledBrush, size - pad - 26, size - pad - 10, 16, 4);
        }
    }

    private static GraphicsPath CreateRoundedRect(Rectangle bounds, int radius) {
        int diameter = radius * 2;
        Size size = new Size(diameter, diameter);
        Rectangle arc = new Rectangle(bounds.Location, size);
        GraphicsPath path = new GraphicsPath();

        if (radius == 0) {
            path.AddRectangle(bounds);
            return path;
        }

        path.AddArc(arc, 180, 90);
        arc.X = bounds.Right - diameter;
        path.AddArc(arc, 270, 90);
        arc.Y = bounds.Bottom - diameter;
        path.AddArc(arc, 0, 90);
        arc.X = bounds.Left;
        path.AddArc(arc, 90, 90);
        path.CloseFigure();
        return path;
    }

    // 1. 多重弹道模组 (Multishot: 3 连发散射等离子穿甲光矛)
    public static void GenerateMultishotIcon(string dst) {
        int size = 512;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawTechFrame(g, size, Color.FromArgb(0, 240, 255), Color.FromArgb(30, 60, 90));

                int cx = size / 2;
                int cy = size / 2 + 10;

                // Central back glow
                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 140, cy - 140, 280, 280);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(160, 0, 240, 255);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // 3 diverging plasma bolts (-28 deg, 0 deg, +28 deg)
                float[] angles = new float[] { -26f, 0f, 26f };
                foreach (float angle in angles) {
                    GraphicsState state = g.Save();
                    g.TranslateTransform(cx, cy + 80);
                    g.RotateTransform(angle);

                    // Trailing energy wake
                    using (LinearGradientBrush wake = new LinearGradientBrush(new Point(0, 0), new Point(0, -220), Color.Transparent, Color.FromArgb(200, 0, 240, 255))) {
                        PointF[] pts = new PointF[] {
                            new PointF(-12, 0),
                            new PointF(12, 0),
                            new PointF(22, -180),
                            new PointF(0, -230),
                            new PointF(-22, -180)
                        };
                        g.FillPolygon(wake, pts);
                    }

                    // Solid bullet core
                    using (LinearGradientBrush core = new LinearGradientBrush(new Point(0, -60), new Point(0, -220), Color.FromArgb(255, 0, 180, 255), Color.White)) {
                        PointF[] pts = new PointF[] {
                            new PointF(-9, -60),
                            new PointF(9, -60),
                            new PointF(14, -180),
                            new PointF(0, -225),
                            new PointF(-14, -180)
                        };
                        g.FillPolygon(core, pts);
                    }

                    // Intense white tip
                    using (SolidBrush white = new SolidBrush(Color.White)) {
                        PointF[] pts = new PointF[] {
                            new PointF(-7, -180),
                            new PointF(7, -180),
                            new PointF(0, -225)
                        };
                        g.FillPolygon(white, pts);
                    }

                    g.Restore(state);
                }

                // Divergence trajectory fan arcs
                using (Pen arcPen = new Pen(Color.FromArgb(140, 0, 240, 255), 2.5f)) {
                    arcPen.DashStyle = DashStyle.Dash;
                    g.DrawArc(arcPen, cx - 180, cy - 140, 360, 360, 210, 120);
                    g.DrawArc(arcPen, cx - 120, cy - 80, 240, 240, 210, 120);
                }

                // Muzzle burst at origin
                using (SolidBrush burst = new SolidBrush(Color.FromArgb(255, 255, 255))) {
                    g.FillEllipse(burst, cx - 18, cy + 70, 36, 36);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
            Console.WriteLine("Created multishot icon: " + dst);
        }
    }

    // 2. 超频连发机匣 (Firerate: 旋转加特林高射速风暴 + 弹壳抛射)
    public static void GenerateFirerateIcon(string dst) {
        int size = 512;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawTechFrame(g, size, Color.FromArgb(255, 170, 0), Color.FromArgb(80, 50, 20));

                int cx = size / 2;
                int cy = size / 2;

                // Orange-amber radial glow
                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 150, cy - 150, 300, 300);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(180, 255, 120, 0);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // Speed streaks (Rotary motion blur rings)
                using (Pen streakPen = new Pen(Color.FromArgb(180, 255, 200, 50), 3.5f)) {
                    g.DrawArc(streakPen, cx - 130, cy - 130, 260, 260, 20, 70);
                    g.DrawArc(streakPen, cx - 130, cy - 130, 260, 260, 140, 70);
                    g.DrawArc(streakPen, cx - 130, cy - 130, 260, 260, 260, 70);
                }
                using (Pen streakPen2 = new Pen(Color.FromArgb(140, 255, 100, 0), 2f)) {
                    g.DrawArc(streakPen2, cx - 155, cy - 155, 310, 310, 60, 90);
                    g.DrawArc(streakPen2, cx - 155, cy - 155, 310, 310, 210, 90);
                }

                // Central Gatling barrel housing (6 rotary barrels)
                int numBarrels = 6;
                float barrelDist = 72f;
                using (SolidBrush darkHub = new SolidBrush(Color.FromArgb(255, 32, 40, 54))) {
                    g.FillEllipse(darkHub, cx - 45, cy - 45, 90, 90);
                }
                using (Pen hubRim = new Pen(Color.FromArgb(255, 255, 180, 0), 4f)) {
                    g.DrawEllipse(hubRim, cx - 45, cy - 45, 90, 90);
                }

                for (int i = 0; i < numBarrels; i++) {
                    double rad = (i * 60) * Math.PI / 180.0;
                    float bx = cx + (float)(Math.Cos(rad) * barrelDist);
                    float by = cy + (float)(Math.Sin(rad) * barrelDist);

                    // Barrel outer
                    using (SolidBrush barrelBrush = new SolidBrush(Color.FromArgb(255, 45, 55, 72))) {
                        g.FillEllipse(barrelBrush, bx - 22, by - 22, 44, 44);
                    }
                    using (Pen barrelRim = new Pen(Color.FromArgb(255, 180, 200, 220), 3f)) {
                        g.DrawEllipse(barrelRim, bx - 22, by - 22, 44, 44);
                    }
                    // Barrel hole with fiery glow
                    using (SolidBrush innerHole = new SolidBrush(Color.FromArgb(255, 15, 20, 28))) {
                        g.FillEllipse(innerHole, bx - 14, by - 14, 28, 28);
                    }
                    if (i == 0 || i == 5) {
                        // Firing muzzle flame in top barrels
                        using (SolidBrush fireCore = new SolidBrush(Color.FromArgb(255, 255, 220, 100))) {
                            g.FillEllipse(fireCore, bx - 8, by - 8, 16, 16);
                        }
                    }
                }

                // Blazing Muzzle Flash star at top-right
                PointF[] star = new PointF[] {
                    new PointF(cx + 80, cy - 140), new PointF(cx + 90, cy - 110),
                    new PointF(cx + 120, cy - 100), new PointF(cx + 90, cy - 90),
                    new PointF(cx + 80, cy - 60), new PointF(cx + 70, cy - 90),
                    new PointF(cx + 40, cy - 100), new PointF(cx + 70, cy - 110)
                };
                using (SolidBrush starBrush = new SolidBrush(Color.FromArgb(255, 255, 240, 150))) {
                    g.FillPolygon(starBrush, star);
                }

                // Flying golden ammo cartridge
                GraphicsState cState = g.Save();
                g.TranslateTransform(cx - 105, cy + 95);
                g.RotateTransform(-35);
                using (LinearGradientBrush brass = new LinearGradientBrush(new Point(0, 0), new Point(25, 60), Color.FromArgb(255, 255, 215, 0), Color.FromArgb(255, 180, 110, 0))) {
                    g.FillRectangle(brass, 0, 0, 24, 52);
                }
                using (SolidBrush primer = new SolidBrush(Color.FromArgb(255, 220, 160, 20))) {
                    g.FillRectangle(primer, -3, 46, 30, 8);
                }
                g.Restore(cState);
            }
            bmp.Save(dst, ImageFormat.Png);
            Console.WriteLine("Created firerate icon: " + dst);
        }
    }

    // 3. 战术弱点瞄准仪 (Crit: 红外战术瞄准十字线 + 致命弱点锁定)
    public static void GenerateCritIcon(string dst) {
        int size = 512;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawTechFrame(g, size, Color.FromArgb(255, 42, 95), Color.FromArgb(80, 20, 40));

                int cx = size / 2;
                int cy = size / 2;

                // Crimson radial glow
                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 160, cy - 160, 320, 320);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(170, 255, 0, 70);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // Concentric Range Rings
                using (Pen ringPen = new Pen(Color.FromArgb(140, 255, 42, 95), 2.5f)) {
                    g.DrawEllipse(ringPen, cx - 130, cy - 130, 260, 260);
                    g.DrawEllipse(ringPen, cx - 80, cy - 80, 160, 160);
                }
                using (Pen dashedRing = new Pen(Color.FromArgb(180, 255, 80, 120), 2.0f)) {
                    dashedRing.DashStyle = DashStyle.Dash;
                    g.DrawEllipse(dashedRing, cx - 160, cy - 160, 320, 320);
                }

                // 4 Corner Target Lock Brackets: [  ]
                int bDist = 110;
                int bLen = 35;
                using (Pen bracketPen = new Pen(Color.FromArgb(255, 255, 200, 50), 4.5f)) {
                    // Top-Left
                    g.DrawLines(bracketPen, new Point[] { new Point(cx - bDist, cy - bDist + bLen), new Point(cx - bDist, cy - bDist), new Point(cx - bDist + bLen, cy - bDist) });
                    // Top-Right
                    g.DrawLines(bracketPen, new Point[] { new Point(cx + bDist - bLen, cy - bDist), new Point(cx + bDist, cy - bDist), new Point(cx + bDist, cy - bDist + bLen) });
                    // Bottom-Left
                    g.DrawLines(bracketPen, new Point[] { new Point(cx - bDist, cy + bDist - bLen), new Point(cx - bDist, cy + bDist), new Point(cx - bDist + bLen, cy + bDist) });
                    // Bottom-Right
                    g.DrawLines(bracketPen, new Point[] { new Point(cx + bDist - bLen, cy + bDist), new Point(cx + bDist, cy + bDist), new Point(cx + bDist, cy + bDist - bLen) });
                }

                // Crosshair Reticle lines
                using (Pen crossPen = new Pen(Color.FromArgb(255, 255, 42, 95), 3f)) {
                    g.DrawLine(crossPen, cx - 150, cy, cx - 35, cy);
                    g.DrawLine(crossPen, cx + 35, cy, cx + 150, cy);
                    g.DrawLine(crossPen, cx, cy - 150, cx, cy - 35);
                    g.DrawLine(crossPen, cx, cy + 35, cx, cy + 150);
                }

                // Central Diamond Weakpoint with glowing skull/core
                PointF[] diamond = new PointF[] {
                    new PointF(cx, cy - 32),
                    new PointF(cx + 32, cy),
                    new PointF(cx, cy + 32),
                    new PointF(cx - 32, cy)
                };
                using (LinearGradientBrush dBrush = new LinearGradientBrush(new Point(cx, cy - 32), new Point(cx, cy + 32), Color.FromArgb(255, 255, 230, 80), Color.FromArgb(255, 255, 42, 95))) {
                    g.FillPolygon(dBrush, diamond);
                }

                // High-intensity white center point
                using (SolidBrush dot = new SolidBrush(Color.White)) {
                    g.FillEllipse(dot, cx - 6, cy - 6, 12, 12);
                }

                // Telemetry font marks (CRIT 250%)
                using (Font font = new Font("Arial", 16, FontStyle.Bold)) {
                    using (SolidBrush textBrush = new SolidBrush(Color.FromArgb(255, 255, 200, 50))) {
                        g.DrawString("TARGET LOCK", font, textBrush, cx - 60, cy + 125);
                    }
                }
            }
            bmp.Save(dst, ImageFormat.Png);
            Console.WriteLine("Created crit icon: " + dst);
        }
    }

    // 4. 重装喷火战车 (Truck Inferno: 装甲巨车咆哮喷火 + 炽热烈焰风暴)
    public static void GenerateInfernoIcon(string dst) {
        int size = 512;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawTechFrame(g, size, Color.FromArgb(255, 80, 0), Color.FromArgb(90, 40, 10));

                int cx = size / 2;
                int cy = size / 2;

                // Blazing fire background
                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 160, cy - 160, 320, 320);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(200, 255, 60, 0);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // Giant Roaring Flamethrower Fire plume
                PointF[] flamePts = new PointF[] {
                    new PointF(cx - 30, cy + 20),
                    new PointF(cx - 100, cy - 40),
                    new PointF(cx - 140, cy - 130),
                    new PointF(cx - 80, cy - 180),
                    new PointF(cx, cy - 210),
                    new PointF(cx + 80, cy - 180),
                    new PointF(cx + 140, cy - 130),
                    new PointF(cx + 100, cy - 40),
                    new PointF(cx + 30, cy + 20)
                };
                using (LinearGradientBrush fBrush = new LinearGradientBrush(new Point(0, cy + 20), new Point(0, cy - 210), Color.FromArgb(255, 255, 60, 0), Color.FromArgb(255, 255, 220, 50))) {
                    g.FillPolygon(fBrush, flamePts);
                }

                // Inner white-hot flame core
                PointF[] innerFlame = new PointF[] {
                    new PointF(cx - 18, cy + 10),
                    new PointF(cx - 50, cy - 50),
                    new PointF(cx, cy - 150),
                    new PointF(cx + 50, cy - 50),
                    new PointF(cx + 18, cy + 10)
                };
                using (LinearGradientBrush innerBrush = new LinearGradientBrush(new Point(0, cy + 10), new Point(0, cy - 150), Color.FromArgb(255, 255, 200, 30), Color.White)) {
                    g.FillPolygon(innerBrush, innerFlame);
                }

                // Armored Vehicle Chassis Silhouette at bottom
                using (SolidBrush truckDark = new SolidBrush(Color.FromArgb(255, 28, 36, 48))) {
                    g.FillRectangle(truckDark, cx - 80, cy + 30, 160, 100);
                }
                using (Pen truckOutline = new Pen(Color.FromArgb(255, 255, 120, 0), 4f)) {
                    g.DrawRectangle(truckOutline, cx - 80, cy + 30, 160, 100);
                }

                // Spiked bumper
                PointF[] bumper = new PointF[] {
                    new PointF(cx - 95, cy + 130),
                    new PointF(cx, cy + 160),
                    new PointF(cx + 95, cy + 130)
                };
                using (SolidBrush bumperBrush = new SolidBrush(Color.FromArgb(255, 45, 55, 75))) {
                    g.FillPolygon(bumperBrush, bumper);
                }
                using (Pen bPen = new Pen(Color.FromArgb(255, 255, 80, 0), 3f)) {
                    g.DrawPolygon(bPen, bumper);
                }

                // Twin exhaust pipes blasting fire
                using (SolidBrush pipe = new SolidBrush(Color.FromArgb(255, 60, 70, 85))) {
                    g.FillRectangle(pipe, cx - 50, cy + 10, 20, 30);
                    g.FillRectangle(pipe, cx + 30, cy + 10, 20, 30);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
            Console.WriteLine("Created inferno icon: " + dst);
        }
    }

    // 5. 极寒深冻碎裂 (Cryo Shatter: 坚冰晶体瞬间炸裂 + 爆散冰晶刺)
    public static void GenerateShatterIcon(string dst) {
        int size = 512;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawTechFrame(g, size, Color.FromArgb(0, 220, 255), Color.FromArgb(20, 50, 80));

                int cx = size / 2;
                int cy = size / 2;

                // Cyan frost radial background
                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 160, cy - 160, 320, 320);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(180, 0, 220, 255);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // Exploding Ice Shards flying outward
                float[] shardAngles = new float[] { 15f, 45f, 80f, 120f, 160f, 195f, 235f, 270f, 310f, 345f };
                float[] shardDists = new float[] { 130f, 150f, 125f, 145f, 135f, 155f, 140f, 150f, 130f, 145f };
                for (int i = 0; i < shardAngles.Length; i++) {
                    GraphicsState s = g.Save();
                    g.TranslateTransform(cx, cy);
                    g.RotateTransform(shardAngles[i]);

                    PointF[] shard = new PointF[] {
                        new PointF(0, shardDists[i] + 35),
                        new PointF(-12, shardDists[i]),
                        new PointF(0, shardDists[i] - 25),
                        new PointF(12, shardDists[i])
                    };
                    using (LinearGradientBrush sBrush = new LinearGradientBrush(shard[2], shard[0], Color.White, Color.FromArgb(220, 0, 180, 255))) {
                        g.FillPolygon(sBrush, shard);
                    }
                    using (Pen sPen = new Pen(Color.FromArgb(255, 200, 250, 255), 1.5f)) {
                        g.DrawPolygon(sPen, shard);
                    }
                    g.Restore(s);
                }

                // Central Large Shattered Crystal
                PointF[] mainDiamond = new PointF[] {
                    new PointF(cx, cy - 90),
                    new PointF(cx + 75, cy),
                    new PointF(cx, cy + 90),
                    new PointF(cx - 75, cy)
                };
                using (LinearGradientBrush mainBrush = new LinearGradientBrush(new Point(cx, cy - 90), new Point(cx, cy + 90), Color.FromArgb(255, 220, 250, 255), Color.FromArgb(255, 0, 140, 220))) {
                    g.FillPolygon(mainBrush, mainDiamond);
                }

                // Sharp Fracture Crack lines across the crystal
                using (Pen crackPen = new Pen(Color.White, 3.5f)) {
                    g.DrawLine(crackPen, cx - 75, cy, cx - 15, cy - 20);
                    g.DrawLine(crackPen, cx - 15, cy - 20, cx + 25, cy - 50);
                    g.DrawLine(crackPen, cx - 15, cy - 20, cx, cy + 15);
                    g.DrawLine(crackPen, cx, cy + 15, cx + 45, cy + 25);
                    g.DrawLine(crackPen, cx + 45, cy + 25, cx + 75, cy);
                    g.DrawLine(crackPen, cx, cy + 15, cx - 20, cy + 70);
                }

                // Glowing fracture sparks
                using (SolidBrush spark = new SolidBrush(Color.White)) {
                    g.FillEllipse(spark, cx - 18, cy - 23, 8, 8);
                    g.FillEllipse(spark, cx - 2, cy + 12, 10, 10);
                    g.FillEllipse(spark, cx + 42, cy + 22, 8, 8);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
            Console.WriteLine("Created shatter icon: " + dst);
        }
    }
}
"@

[IconGenerator]::GenerateMultishotIcon("D:\test\kaipao\assets\icon_multishot.png")
[IconGenerator]::GenerateFirerateIcon("D:\test\kaipao\assets\icon_firerate.png")
[IconGenerator]::GenerateCritIcon("D:\test\kaipao\assets\icon_crit.png")
[IconGenerator]::GenerateInfernoIcon("D:\test\kaipao\assets\icon_inferno.png")
[IconGenerator]::GenerateShatterIcon("D:\test\kaipao\assets\icon_shatter.png")
