Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class RuneIconGenerator {
    private static GraphicsPath CreateBevelRect(Rectangle rect, int bevel) {
        GraphicsPath path = new GraphicsPath();
        path.AddLine(rect.Left + bevel, rect.Top, rect.Right - bevel, rect.Top);
        path.AddLine(rect.Right - bevel, rect.Top, rect.Right, rect.Top + bevel);
        path.AddLine(rect.Right, rect.Top + bevel, rect.Right, rect.Bottom - bevel);
        path.AddLine(rect.Right, rect.Bottom - bevel, rect.Right - bevel, rect.Bottom);
        path.AddLine(rect.Right - bevel, rect.Bottom, rect.Left + bevel, rect.Bottom);
        path.AddLine(rect.Left + bevel, rect.Bottom, rect.Left, rect.Bottom - bevel);
        path.AddLine(rect.Left, rect.Bottom - bevel, rect.Left, rect.Top + bevel);
        path.CloseFigure();
        return path;
    }

    private static void DrawBaseFrame(Graphics g, int size, Color primaryGlow, Color accentColor) {
        int pad = 10;
        int bevel = 28;
        Rectangle rect = new Rectangle(pad, pad, size - pad * 2, size - pad * 2);

        // 1. Dark tech background gradient
        using (LinearGradientBrush bgBrush = new LinearGradientBrush(
            new Point(pad, pad), new Point(size - pad, size - pad),
            Color.FromArgb(255, 14, 20, 32), Color.FromArgb(255, 4, 7, 14))) {
            using (GraphicsPath path = CreateBevelRect(rect, bevel)) {
                g.FillPath(bgBrush, path);
            }
        }

        // 2. Subtle circuit grid inside
        using (Pen gridPen = new Pen(Color.FromArgb(22, primaryGlow.R, primaryGlow.G, primaryGlow.B), 1.5f)) {
            for (int i = pad + 24; i < size - pad - 20; i += 24) {
                g.DrawLine(gridPen, i, pad + 15, i, size - pad - 15);
                g.DrawLine(gridPen, pad + 15, i, size - pad - 15, i);
            }
        }

        // 3. Central ambient glow
        using (GraphicsPath glowP = new GraphicsPath()) {
            glowP.AddEllipse(size / 2 - 90, size / 2 - 90, 180, 180);
            using (PathGradientBrush pgb = new PathGradientBrush(glowP)) {
                pgb.CenterColor = Color.FromArgb(70, primaryGlow.R, primaryGlow.G, primaryGlow.B);
                pgb.SurroundColors = new Color[] { Color.Transparent };
                g.FillPath(pgb, glowP);
            }
        }

        // 4. Outer metallic bevel frame
        using (Pen framePen = new Pen(Color.FromArgb(255, 45, 60, 85), 5f)) {
            using (GraphicsPath path = CreateBevelRect(rect, bevel)) {
                g.DrawPath(framePen, path);
            }
        }

        // 5. Inner glowing border
        using (Pen glowPen = new Pen(Color.FromArgb(170, primaryGlow.R, primaryGlow.G, primaryGlow.B), 2.5f)) {
            Rectangle innerRect = new Rectangle(pad + 5, pad + 5, size - (pad + 5) * 2, size - (pad + 5) * 2);
            using (GraphicsPath path = CreateBevelRect(innerRect, bevel - 4)) {
                g.DrawPath(glowPen, path);
            }
        }

        // 6. Corner tech LEDs / rivets
        using (SolidBrush ledBrush = new SolidBrush(accentColor)) {
            g.FillEllipse(ledBrush, pad + 16, pad + 8, 7, 7);
            g.FillEllipse(ledBrush, size - pad - 23, pad + 8, 7, 7);
            g.FillEllipse(ledBrush, pad + 16, size - pad - 15, 7, 7);
            g.FillEllipse(ledBrush, size - pad - 23, size - pad - 15, 7, 7);
        }
    }

    // 1. 穿甲弹头 (attack)
    public static void GenerateAttackIcon(string dst) {
        int size = 256;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                Color glow = Color.FromArgb(255, 120, 0);
                Color accent = Color.FromArgb(255, 200, 50);
                DrawBaseFrame(g, size, glow, accent);

                int cx = size / 2;
                int cy = size / 2;

                // Speed lines
                using (Pen streakPen = new Pen(Color.FromArgb(90, 255, 160, 0), 2f)) {
                    g.DrawLine(streakPen, cx - 60, cy + 65, cx - 35, cy - 20);
                    g.DrawLine(streakPen, cx + 60, cy + 65, cx + 35, cy - 20);
                    g.DrawLine(streakPen, cx - 45, cy + 75, cx - 25, cy + 15);
                    g.DrawLine(streakPen, cx + 45, cy + 75, cx + 25, cy + 15);
                }

                // Heavy Bullet Body (Cartridge & Piercing Core)
                PointF[] bulletTip = new PointF[] {
                    new PointF(cx, cy - 70),
                    new PointF(cx + 34, cy - 10),
                    new PointF(cx + 26, cy + 65),
                    new PointF(cx - 26, cy + 65),
                    new PointF(cx - 34, cy - 10)
                };
                using (LinearGradientBrush bBrush = new LinearGradientBrush(
                    new Point(cx - 34, 0), new Point(cx + 34, 0),
                    Color.FromArgb(255, 255, 230, 160), Color.FromArgb(255, 180, 80, 0))) {
                    g.FillPolygon(bBrush, bulletTip);
                }
                using (Pen bPen = new Pen(Color.FromArgb(255, 255, 240, 190), 3f)) {
                    g.DrawPolygon(bPen, bulletTip);
                }

                // Inner piercing kinetic groove
                PointF[] core = new PointF[] {
                    new PointF(cx, cy - 60),
                    new PointF(cx + 12, cy - 10),
                    new PointF(cx + 8, cy + 55),
                    new PointF(cx - 8, cy + 55),
                    new PointF(cx - 12, cy - 10)
                };
                using (LinearGradientBrush coreBrush = new LinearGradientBrush(
                    new Point(0, cy - 60), new Point(0, cy + 55),
                    Color.White, Color.FromArgb(255, 255, 100, 0))) {
                    g.FillPolygon(coreBrush, core);
                }

                // Muzzle blast spark at bullet tip
                using (SolidBrush spark = new SolidBrush(Color.White)) {
                    g.FillEllipse(spark, cx - 6, cy - 74, 12, 12);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 2. 超频扳机 (firerate)
    public static void GenerateFirerateIcon(string dst) {
        int size = 256;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                Color glow = Color.FromArgb(0, 230, 255);
                Color accent = Color.FromArgb(0, 255, 200);
                DrawBaseFrame(g, size, glow, accent);

                int cx = size / 2;
                int cy = size / 2;

                // Electric arcs
                using (Pen arcPen = new Pen(Color.FromArgb(220, 150, 250, 255), 2.5f)) {
                    g.DrawLines(arcPen, new PointF[] {
                        new PointF(cx - 65, cy - 35), new PointF(cx - 35, cy - 45),
                        new PointF(cx - 15, cy - 30), new PointF(cx + 15, cy - 50),
                        new PointF(cx + 50, cy - 30), new PointF(cx + 70, cy - 40)
                    });
                }

                // Gun Trigger Housing (Cyber Mech Receiver)
                GraphicsPath trigger = new GraphicsPath();
                trigger.AddLine(cx - 45, cy - 45, cx + 25, cy - 45);
                trigger.AddLine(cx + 25, cy - 45, cx + 45, cy - 15);
                trigger.AddLine(cx + 45, cy - 15, cx + 45, cy + 45);
                trigger.AddLine(cx + 45, cy + 45, cx + 20, cy + 60);
                trigger.AddLine(cx + 20, cy + 60, cx - 15, cy + 60);
                trigger.AddLine(cx - 15, cy + 60, cx - 25, cy + 15);
                trigger.AddLine(cx - 25, cy + 15, cx - 45, cy + 15);
                trigger.CloseFigure();

                using (LinearGradientBrush tBrush = new LinearGradientBrush(
                    new Point(0, cy - 45), new Point(0, cy + 60),
                    Color.FromArgb(255, 70, 95, 130), Color.FromArgb(255, 20, 30, 45))) {
                    g.FillPath(tBrush, trigger);
                }
                using (Pen tPen = new Pen(Color.FromArgb(255, 0, 220, 255), 3f)) {
                    g.DrawPath(tPen, trigger);
                }

                // The Trigger lever itself (curved high-tech silver/cyan blade)
                GraphicsPath blade = new GraphicsPath();
                blade.AddBezier(cx - 5, cy - 15, cx + 20, cy, cx + 15, cy + 35, cx - 10, cy + 45);
                blade.AddBezier(cx - 10, cy + 45, cx + 5, cy + 28, cx + 6, cy + 5, cx - 18, cy - 10);
                blade.CloseFigure();

                using (LinearGradientBrush bBrush = new LinearGradientBrush(
                    new Point(0, cy - 15), new Point(0, cy + 45),
                    Color.White, Color.FromArgb(255, 0, 180, 255))) {
                    g.FillPath(bBrush, blade);
                }

                // Rapid fire pulse rings
                using (Pen ringPen = new Pen(Color.FromArgb(180, 0, 255, 230), 2f)) {
                    g.DrawArc(ringPen, cx - 60, cy - 60, 120, 120, -45, 120);
                    g.DrawArc(ringPen, cx - 75, cy - 75, 150, 150, -45, 120);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 3. 弱点标定 (crit)
    public static void GenerateCritIcon(string dst) {
        int size = 256;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                Color glow = Color.FromArgb(255, 30, 80);
                Color accent = Color.FromArgb(255, 80, 120);
                DrawBaseFrame(g, size, glow, accent);

                int cx = size / 2;
                int cy = size / 2;

                // Concentric Crosshair Rings
                using (Pen reticlePen = new Pen(Color.FromArgb(220, 255, 40, 80), 3f)) {
                    g.DrawEllipse(reticlePen, cx - 58, cy - 58, 116, 116);
                }
                using (Pen innerReticle = new Pen(Color.FromArgb(255, 255, 120, 150), 2f)) {
                    innerReticle.DashStyle = DashStyle.Dash;
                    g.DrawEllipse(innerReticle, cx - 35, cy - 35, 70, 70);
                }

                // 4 Reticle Notch ticks
                using (Pen tickPen = new Pen(Color.White, 3.5f)) {
                    g.DrawLine(tickPen, cx - 72, cy, cx - 44, cy);
                    g.DrawLine(tickPen, cx + 44, cy, cx + 72, cy);
                    g.DrawLine(tickPen, cx, cy - 72, cx, cy - 44);
                    g.DrawLine(tickPen, cx, cy + 44, cx, cy + 72);
                }

                // 4 Corner Brackets
                using (Pen brPen = new Pen(Color.FromArgb(255, 255, 80, 100), 2.5f)) {
                    int bLen = 14; int bDist = 48;
                    // TL
                    g.DrawLine(brPen, cx - bDist, cy - bDist, cx - bDist + bLen, cy - bDist);
                    g.DrawLine(brPen, cx - bDist, cy - bDist, cx - bDist, cy - bDist + bLen);
                    // TR
                    g.DrawLine(brPen, cx + bDist, cy - bDist, cx + bDist - bLen, cy - bDist);
                    g.DrawLine(brPen, cx + bDist, cy - bDist, cx + bDist, cy - bDist + bLen);
                    // BL
                    g.DrawLine(brPen, cx - bDist, cy + bDist, cx - bDist + bLen, cy + bDist);
                    g.DrawLine(brPen, cx - bDist, cy + bDist, cx - bDist, cy + bDist - bLen);
                    // BR
                    g.DrawLine(brPen, cx + bDist, cy + bDist, cx + bDist - bLen, cy + bDist);
                    g.DrawLine(brPen, cx + bDist, cy + bDist, cx + bDist, cy + bDist - bLen);
                }

                // Red Critical Weakpoint Diamond at center
                PointF[] diamond = new PointF[] {
                    new PointF(cx, cy - 14), new PointF(cx + 14, cy),
                    new PointF(cx, cy + 14), new PointF(cx - 14, cy)
                };
                using (SolidBrush dBrush = new SolidBrush(Color.FromArgb(255, 255, 30, 80))) {
                    g.FillPolygon(dBrush, diamond);
                }
                using (SolidBrush centerDot = new SolidBrush(Color.White)) {
                    g.FillEllipse(centerDot, cx - 4, cy - 4, 8, 8);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 4. 致命打击 (critDmg)
    public static void GenerateCritDmgIcon(string dst) {
        int size = 256;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                Color glow = Color.FromArgb(255, 80, 0);
                Color accent = Color.FromArgb(255, 220, 0);
                DrawBaseFrame(g, size, glow, accent);

                int cx = size / 2;
                int cy = size / 2;

                // 8-Pointed explosive burst shards
                int numRays = 8;
                float outerR = 68f;
                float innerR = 24f;
                PointF[] starPoints = new PointF[numRays * 2];
                for (int i = 0; i < numRays * 2; i++) {
                    double angle = i * Math.PI / numRays - Math.PI / 2.0;
                    float r = (i % 2 == 0) ? outerR : innerR;
                    if (i % 4 == 0) r += 14f; // Major compass spikes longer
                    starPoints[i] = new PointF(cx + (float)(r * Math.Cos(angle)), cy + (float)(r * Math.Sin(angle)));
                }

                using (LinearGradientBrush sBrush = new LinearGradientBrush(
                    new Point(cx, cy - 80), new Point(cx, cy + 80),
                    Color.FromArgb(255, 255, 240, 100), Color.FromArgb(255, 220, 20, 0))) {
                    g.FillPolygon(sBrush, starPoints);
                }
                using (Pen sPen = new Pen(Color.FromArgb(255, 255, 255, 200), 2.5f)) {
                    g.DrawPolygon(sPen, starPoints);
                }

                // Shattered lightning fractures from center
                using (Pen crackPen = new Pen(Color.White, 2.5f)) {
                    g.DrawLine(crackPen, cx, cy, cx - 30, cy - 40);
                    g.DrawLine(crackPen, cx, cy, cx + 38, cy - 25);
                    g.DrawLine(crackPen, cx, cy, cx + 20, cy + 45);
                    g.DrawLine(crackPen, cx, cy, cx - 35, cy + 30);
                }

                // White-hot core
                using (SolidBrush cBrush = new SolidBrush(Color.White)) {
                    g.FillEllipse(cBrush, cx - 12, cy - 12, 24, 24);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 5. 弹道延程 (range)
    public static void GenerateRangeIcon(string dst) {
        int size = 256;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                Color glow = Color.FromArgb(0, 160, 255);
                Color accent = Color.FromArgb(100, 220, 255);
                DrawBaseFrame(g, size, glow, accent);

                int cx = size / 2;
                int cy = size / 2;

                // Long range radar sweep sector
                using (GraphicsPath sector = new GraphicsPath()) {
                    sector.AddPie(cx - 70, cy - 70, 140, 140, -135, 90);
                    using (PathGradientBrush pgb = new PathGradientBrush(sector)) {
                        pgb.CenterColor = Color.FromArgb(90, 0, 200, 255);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, sector);
                    }
                }

                // Range rings
                using (Pen ringPen = new Pen(Color.FromArgb(140, 0, 190, 255), 2f)) {
                    ringPen.DashStyle = DashStyle.Dash;
                    g.DrawArc(ringPen, cx - 30, cy - 30, 60, 60, -160, 140);
                    g.DrawArc(ringPen, cx - 50, cy - 50, 100, 100, -160, 140);
                    g.DrawArc(ringPen, cx - 70, cy - 70, 140, 140, -160, 140);
                }

                // High speed sniper beam trajectory (from bottom-left to top-right)
                using (Pen beamOuter = new Pen(Color.FromArgb(180, 0, 220, 255), 6f)) {
                    g.DrawLine(beamOuter, cx - 55, cy + 55, cx + 55, cy - 55);
                }
                using (Pen beamCore = new Pen(Color.White, 2.5f)) {
                    g.DrawLine(beamCore, cx - 55, cy + 55, cx + 55, cy - 55);
                }

                // Arrow head at terminal end
                PointF[] arrow = new PointF[] {
                    new PointF(cx + 65, cy - 65),
                    new PointF(cx + 42, cy - 64),
                    new PointF(cx + 64, cy - 42)
                };
                using (SolidBrush arrBrush = new SolidBrush(Color.White)) {
                    g.FillPolygon(arrBrush, arrow);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 6. 贯穿协议 (pierce)
    public static void GeneratePierceIcon(string dst) {
        int size = 256;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                Color glow = Color.FromArgb(255, 140, 0);
                Color accent = Color.FromArgb(255, 80, 0);
                DrawBaseFrame(g, size, glow, accent);

                int cx = size / 2;
                int cy = size / 2;

                // Two heavy armor plates
                Rectangle plate1 = new Rectangle(cx - 32, cy - 50, 14, 100);
                Rectangle plate2 = new Rectangle(cx + 18, cy - 50, 14, 100);

                using (LinearGradientBrush pBrush = new LinearGradientBrush(
                    new Point(0, cy - 50), new Point(0, cy + 50),
                    Color.FromArgb(255, 75, 90, 115), Color.FromArgb(255, 25, 35, 50))) {
                    g.FillRectangle(pBrush, plate1);
                    g.FillRectangle(pBrush, plate2);
                }
                using (Pen pPen = new Pen(Color.FromArgb(255, 120, 145, 180), 2f)) {
                    g.DrawRectangle(pPen, plate1);
                    g.DrawRectangle(pPen, plate2);
                }

                // Kinetic Impaler Spear slicing through both plates
                PointF[] spear = new PointF[] {
                    new PointF(cx + 70, cy),
                    new PointF(cx - 65, cy - 14),
                    new PointF(cx - 50, cy),
                    new PointF(cx - 65, cy + 14)
                };
                using (LinearGradientBrush sBrush = new LinearGradientBrush(
                    new Point(cx - 65, 0), new Point(cx + 70, 0),
                    Color.FromArgb(255, 255, 100, 0), Color.White)) {
                    g.FillPolygon(sBrush, spear);
                }
                using (Pen sPen = new Pen(Color.White, 2f)) {
                    g.DrawPolygon(sPen, spear);
                }

                // Breach explosion sparks at plate intersection
                using (SolidBrush spark = new SolidBrush(Color.FromArgb(255, 255, 210, 50))) {
                    g.FillEllipse(spark, cx - 29, cy - 7, 14, 14);
                    g.FillEllipse(spark, cx + 21, cy - 7, 14, 14);
                }
                using (SolidBrush whiteCore = new SolidBrush(Color.White)) {
                    g.FillEllipse(whiteCore, cx - 26, cy - 4, 8, 8);
                    g.FillEllipse(whiteCore, cx + 24, cy - 4, 8, 8);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 7. 分裂膛线 (multishot)
    public static void GenerateMultishotIcon(string dst) {
        int size = 256;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                Color glow = Color.FromArgb(255, 190, 0);
                Color accent = Color.FromArgb(255, 240, 100);
                DrawBaseFrame(g, size, glow, accent);

                int cx = size / 2;
                int cy = size / 2 + 30;

                // 3 diverging plasma bolts (-28 deg, 0 deg, +28 deg)
                float[] angles = new float[] { -26f, 0f, 26f };
                foreach (float angle in angles) {
                    GraphicsState state = g.Save();
                    g.TranslateTransform(cx, cy);
                    g.RotateTransform(angle);

                    // Energy trail
                    using (Pen trailPen = new Pen(Color.FromArgb(120, 255, 160, 0), 4f)) {
                        g.DrawLine(trailPen, 0, 0, 0, -85);
                    }

                    // Bolt head
                    PointF[] bolt = new PointF[] {
                        new PointF(0, -95),
                        new PointF(10, -65),
                        new PointF(0, -75),
                        new PointF(-10, -65)
                    };
                    using (LinearGradientBrush bBrush = new LinearGradientBrush(
                        new Point(0, -95), new Point(0, -65),
                        Color.White, Color.FromArgb(255, 255, 140, 0))) {
                        g.FillPolygon(bBrush, bolt);
                    }
                    using (Pen bPen = new Pen(Color.White, 1.5f)) {
                        g.DrawPolygon(bPen, bolt);
                    }

                    g.Restore(state);
                }

                // Origin muzzle node
                using (SolidBrush node = new SolidBrush(Color.FromArgb(255, 255, 210, 40))) {
                    g.FillEllipse(node, cx - 14, cy - 14, 28, 28);
                }
                using (SolidBrush whiteCenter = new SolidBrush(Color.White)) {
                    g.FillEllipse(whiteCenter, cx - 7, cy - 7, 14, 14);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 8. 纳米护甲 (hp)
    public static void GenerateHpIcon(string dst) {
        int size = 256;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                Color glow = Color.FromArgb(16, 185, 129); // Emerald Shield
                Color accent = Color.FromArgb(52, 211, 153);
                DrawBaseFrame(g, size, glow, accent);

                int cx = size / 2;
                int cy = size / 2;

                // Heavy Mech Shield Silhouette
                GraphicsPath shield = new GraphicsPath();
                shield.AddLine(cx - 52, cy - 55, cx + 52, cy - 55);
                shield.AddLine(cx + 52, cy - 55, cx + 46, cy + 10);
                shield.AddLine(cx + 46, cy + 10, cx, cy + 65);
                shield.AddLine(cx, cy + 65, cx - 46, cy + 10);
                shield.CloseFigure();

                using (LinearGradientBrush sBrush = new LinearGradientBrush(
                    new Point(0, cy - 55), new Point(0, cy + 65),
                    Color.FromArgb(255, 16, 85, 65), Color.FromArgb(255, 5, 25, 20))) {
                    g.FillPath(sBrush, shield);
                }
                using (Pen sPen = new Pen(Color.FromArgb(255, 52, 211, 153), 3.5f)) {
                    g.DrawPath(sPen, shield);
                }

                // Inner Cross / Medical Matrix
                using (SolidBrush cBrush = new SolidBrush(Color.FromArgb(230, 255, 255, 255))) {
                    g.FillRectangle(cBrush, cx - 9, cy - 32, 18, 54);
                    g.FillRectangle(cBrush, cx - 27, cy - 14, 54, 18);
                }

                // Emerald Core Gem in center
                using (SolidBrush gBrush = new SolidBrush(Color.FromArgb(255, 16, 185, 129))) {
                    g.FillRectangle(gBrush, cx - 6, cy - 11, 12, 12);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 9. 能量屏障 (shield)
    public static void GenerateShieldIcon(string dst) {
        int size = 256;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                Color glow = Color.FromArgb(56, 189, 248); // Sky Blue Plasma
                Color accent = Color.FromArgb(14, 165, 233);
                DrawBaseFrame(g, size, glow, accent);

                int cx = size / 2;
                int cy = size / 2;

                // Spherical forcefield bubble
                using (GraphicsPath bubble = new GraphicsPath()) {
                    bubble.AddEllipse(cx - 62, cy - 62, 124, 124);
                    using (PathGradientBrush pgb = new PathGradientBrush(bubble)) {
                        pgb.CenterColor = Color.FromArgb(120, 100, 220, 255);
                        pgb.SurroundColors = new Color[] { Color.FromArgb(240, 14, 165, 233) };
                        g.FillPath(pgb, bubble);
                    }
                }
                using (Pen bPen = new Pen(Color.FromArgb(255, 180, 240, 255), 3f)) {
                    g.DrawEllipse(bPen, cx - 62, cy - 62, 124, 124);
                }

                // Hexagonal energy grid overlays inside
                using (Pen hexPen = new Pen(Color.FromArgb(160, 255, 255, 255), 2f)) {
                    PointF[] h1 = new PointF[] {
                        new PointF(cx, cy - 40), new PointF(cx + 35, cy - 20),
                        new PointF(cx + 35, cy + 20), new PointF(cx, cy + 40),
                        new PointF(cx - 35, cy + 20), new PointF(cx - 35, cy - 20)
                    };
                    g.DrawPolygon(hexPen, h1);
                }

                // Central high-energy diamond nucleus
                PointF[] d = new PointF[] {
                    new PointF(cx, cy - 18), new PointF(cx + 18, cy),
                    new PointF(cx, cy + 18), new PointF(cx - 18, cy)
                };
                using (SolidBrush dBrush = new SolidBrush(Color.White)) {
                    g.FillPolygon(dBrush, d);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 10. 战术增幅 (skillPower)
    public static void GenerateSkillPowerIcon(string dst) {
        int size = 256;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                Color glow = Color.FromArgb(168, 85, 247); // Violet Power
                Color accent = Color.FromArgb(216, 180, 254);
                DrawBaseFrame(g, size, glow, accent);

                int cx = size / 2;
                int cy = size / 2;

                // 4-Thruster Core or Overdrive Rocket
                PointF[] rocket = new PointF[] {
                    new PointF(cx, cy - 68),
                    new PointF(cx + 22, cy - 25),
                    new PointF(cx + 22, cy + 30),
                    new PointF(cx + 45, cy + 50),
                    new PointF(cx + 20, cy + 45),
                    new PointF(cx, cy + 38),
                    new PointF(cx - 20, cy + 45),
                    new PointF(cx - 45, cy + 50),
                    new PointF(cx - 22, cy + 30),
                    new PointF(cx - 22, cy - 25)
                };
                using (LinearGradientBrush rBrush = new LinearGradientBrush(
                    new Point(0, cy - 68), new Point(0, cy + 50),
                    Color.FromArgb(255, 245, 230, 255), Color.FromArgb(255, 126, 34, 206))) {
                    g.FillPolygon(rBrush, rocket);
                }
                using (Pen rPen = new Pen(Color.FromArgb(255, 230, 200, 255), 2.5f)) {
                    g.DrawPolygon(rPen, rocket);
                }

                // Plasma exhaust plumes
                PointF[] flame = new PointF[] {
                    new PointF(cx - 15, cy + 45),
                    new PointF(cx, cy + 78),
                    new PointF(cx + 15, cy + 45),
                    new PointF(cx, cy + 55)
                };
                using (LinearGradientBrush fBrush = new LinearGradientBrush(
                    new Point(0, cy + 45), new Point(0, cy + 78),
                    Color.FromArgb(255, 255, 180, 255), Color.FromArgb(255, 168, 85, 247))) {
                    g.FillPolygon(fBrush, flame);
                }

                // Core reactor icon
                using (SolidBrush core = new SolidBrush(Color.White)) {
                    g.FillEllipse(core, cx - 8, cy - 5, 16, 16);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 11. 冷却压缩 (skillCd)
    public static void GenerateSkillCdIcon(string dst) {
        int size = 256;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                Color glow = Color.FromArgb(59, 130, 246);
                Color accent = Color.FromArgb(96, 165, 250);
                DrawBaseFrame(g, size, glow, accent);

                int cx = size / 2;
                int cy = size / 2;

                // Outer Chrono Dial
                using (Pen dialPen = new Pen(Color.FromArgb(220, 96, 165, 250), 3f)) {
                    g.DrawEllipse(dialPen, cx - 55, cy - 55, 110, 110);
                }

                // 8 Clock tick marks
                using (Pen tickPen = new Pen(Color.White, 2.5f)) {
                    for (int i = 0; i < 8; i++) {
                        double a = i * Math.PI / 4.0;
                        float x1 = cx + (float)(44 * Math.Cos(a));
                        float y1 = cy + (float)(44 * Math.Sin(a));
                        float x2 = cx + (float)(53 * Math.Cos(a));
                        float y2 = cy + (float)(53 * Math.Sin(a));
                        g.DrawLine(tickPen, x1, y1, x2, y2);
                    }
                }

                // Clock hands (pointing to 10:10 / accelerated state)
                using (Pen handHour = new Pen(Color.White, 4f)) {
                    handHour.StartCap = LineCap.Round;
                    handHour.EndCap = LineCap.ArrowAnchor;
                    g.DrawLine(handHour, cx, cy, cx - 22, cy - 20);
                }
                using (Pen handMin = new Pen(Color.FromArgb(255, 96, 165, 250), 3f)) {
                    handMin.StartCap = LineCap.Round;
                    handMin.EndCap = LineCap.ArrowAnchor;
                    g.DrawLine(handMin, cx, cy, cx + 25, cy - 28);
                }

                // Reverse speed-up swoosh arrows
                using (Pen swoosh = new Pen(Color.FromArgb(200, 255, 255, 255), 2.5f)) {
                    g.DrawArc(swoosh, cx - 68, cy - 68, 136, 136, -30, 220);
                }

                using (SolidBrush cPin = new SolidBrush(Color.White)) {
                    g.FillEllipse(cPin, cx - 6, cy - 6, 12, 12);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 12. 覆盖拓展 (skillRange)
    public static void GenerateSkillRangeIcon(string dst) {
        int size = 256;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                Color glow = Color.FromArgb(20, 184, 166); // Teal vortex
                Color accent = Color.FromArgb(94, 234, 212);
                DrawBaseFrame(g, size, glow, accent);

                int cx = size / 2;
                int cy = size / 2;

                // 3 expanding vortex wave ripples
                using (Pen wavePen = new Pen(Color.FromArgb(140, 94, 234, 212), 2.5f)) {
                    g.DrawEllipse(wavePen, cx - 30, cy - 30, 60, 60);
                    g.DrawEllipse(wavePen, cx - 48, cy - 48, 96, 96);
                    g.DrawEllipse(wavePen, cx - 66, cy - 66, 132, 132);
                }

                // 4 Outward expanding directional arrows
                int[][] dirs = new int[][] {
                    new int[] { 0, -56 }, new int[] { 56, 0 },
                    new int[] { 0, 56 }, new int[] { -56, 0 }
                };
                using (Pen arrPen = new Pen(Color.White, 3f)) {
                    arrPen.EndCap = LineCap.ArrowAnchor;
                    foreach (var d in dirs) {
                        g.DrawLine(arrPen, cx + d[0] / 3, cy + d[1] / 3, cx + d[0], cy + d[1]);
                    }
                }

                // Central shockwave core
                using (SolidBrush core = new SolidBrush(Color.White)) {
                    g.FillEllipse(core, cx - 10, cy - 10, 20, 20);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 13. 磁吸阵列 (magnet)
    public static void GenerateMagnetIcon(string dst) {
        int size = 256;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                Color glow = Color.FromArgb(239, 68, 68); // Red Magnet
                Color accent = Color.FromArgb(251, 146, 60);
                DrawBaseFrame(g, size, glow, accent);

                int cx = size / 2;
                int cy = size / 2;

                // Horseshoe Magnet Shape
                GraphicsPath magnet = new GraphicsPath();
                magnet.AddArc(cx - 48, cy - 55, 96, 96, 180, 180);
                magnet.AddLine(cx + 48, cy - 7, cx + 48, cy + 30);
                magnet.AddLine(cx + 48, cy + 30, cx + 24, cy + 30);
                magnet.AddLine(cx + 24, cy + 30, cx + 24, cy - 7);
                magnet.AddArc(cx - 24, cy - 31, 48, 48, 0, -180);
                magnet.AddLine(cx - 24, cy - 7, cx - 24, cy + 30);
                magnet.AddLine(cx - 24, cy + 30, cx - 48, cy + 30);
                magnet.AddLine(cx - 48, cy + 30, cx - 48, cy - 7);
                magnet.CloseFigure();

                using (LinearGradientBrush mBrush = new LinearGradientBrush(
                    new Point(0, cy - 55), new Point(0, cy + 30),
                    Color.FromArgb(255, 239, 68, 68), Color.FromArgb(255, 153, 27, 27))) {
                    g.FillPath(mBrush, magnet);
                }
                using (Pen mPen = new Pen(Color.FromArgb(255, 254, 202, 202), 2.5f)) {
                    g.DrawPath(mPen, magnet);
                }

                // Silver poles on tips
                Rectangle leftPole = new Rectangle(cx - 48, cy + 12, 24, 18);
                Rectangle rightPole = new Rectangle(cx + 24, cy + 12, 24, 18);
                using (SolidBrush poleBrush = new SolidBrush(Color.FromArgb(255, 226, 232, 240))) {
                    g.FillRectangle(poleBrush, leftPole);
                    g.FillRectangle(poleBrush, rightPole);
                }

                // Attracted golden energy scrap/coins
                using (SolidBrush gold = new SolidBrush(Color.FromArgb(255, 250, 204, 21))) {
                    g.FillEllipse(gold, cx - 18, cy + 50, 12, 12);
                    g.FillEllipse(gold, cx + 6, cy + 46, 15, 15);
                    g.FillEllipse(gold, cx - 4, cy + 62, 10, 10);
                }
                using (Pen arc = new Pen(Color.FromArgb(180, 255, 255, 255), 2f)) {
                    g.DrawArc(arc, cx - 35, cy + 28, 70, 40, 20, 140);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 14. 数据窃取 (exp)
    public static void GenerateExpIcon(string dst) {
        int size = 256;
        using (Bitmap bmp = new Bitmap(size, size, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                Color glow = Color.FromArgb(34, 197, 94); // Neon Green Data
                Color accent = Color.FromArgb(134, 239, 172);
                DrawBaseFrame(g, size, glow, accent);

                int cx = size / 2;
                int cy = size / 2;

                // Rising Holographic Data Bars (3 bars)
                Rectangle b1 = new Rectangle(cx - 44, cy + 5, 22, 45);
                Rectangle b2 = new Rectangle(cx - 11, cy - 18, 22, 68);
                Rectangle b3 = new Rectangle(cx + 22, cy - 42, 22, 92);

                using (LinearGradientBrush barBrush = new LinearGradientBrush(
                    new Point(0, cy - 42), new Point(0, cy + 50),
                    Color.FromArgb(255, 74, 222, 128), Color.FromArgb(255, 20, 83, 45))) {
                    g.FillRectangle(barBrush, b1);
                    g.FillRectangle(barBrush, b2);
                    g.FillRectangle(barBrush, b3);
                }
                using (Pen barPen = new Pen(Color.FromArgb(255, 187, 247, 208), 2f)) {
                    g.DrawRectangle(barPen, b1);
                    g.DrawRectangle(barPen, b2);
                    g.DrawRectangle(barPen, b3);
                }

                // Sharp rising arrow soaring across bars
                PointF[] arrow = new PointF[] {
                    new PointF(cx - 52, cy + 25),
                    new PointF(cx + 25, cy - 50),
                    new PointF(cx + 10, cy - 50),
                    new PointF(cx + 46, cy - 65),
                    new PointF(cx + 46, cy - 30),
                    new PointF(cx + 34, cy - 38),
                    new PointF(cx - 45, cy + 35)
                };
                using (SolidBrush arrBrush = new SolidBrush(Color.White)) {
                    g.FillPolygon(arrBrush, arrow);
                }

                // Data matrix bit nodes
                using (SolidBrush node = new SolidBrush(Color.FromArgb(255, 220, 252, 231))) {
                    g.FillEllipse(node, cx - 35, cy - 20, 6, 6);
                    g.FillEllipse(node, cx - 2, cy - 38, 6, 6);
                    g.FillEllipse(node, cx + 32, cy - 60, 6, 6);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }
}
"@

$runesDir = "D:\test\kaipao\assets\runes"
[RuneIconGenerator]::GenerateAttackIcon("$runesDir\rune_attack.png")
[RuneIconGenerator]::GenerateFirerateIcon("$runesDir\rune_firerate.png")
[RuneIconGenerator]::GenerateCritIcon("$runesDir\rune_crit.png")
[RuneIconGenerator]::GenerateCritDmgIcon("$runesDir\rune_critDmg.png")
[RuneIconGenerator]::GenerateRangeIcon("$runesDir\rune_range.png")
[RuneIconGenerator]::GeneratePierceIcon("$runesDir\rune_pierce.png")
[RuneIconGenerator]::GenerateMultishotIcon("$runesDir\rune_multishot.png")
[RuneIconGenerator]::GenerateHpIcon("$runesDir\rune_hp.png")
[RuneIconGenerator]::GenerateShieldIcon("$runesDir\rune_shield.png")
[RuneIconGenerator]::GenerateSkillPowerIcon("$runesDir\rune_skillPower.png")
[RuneIconGenerator]::GenerateSkillCdIcon("$runesDir\rune_skillCd.png")
[RuneIconGenerator]::GenerateSkillRangeIcon("$runesDir\rune_skillRange.png")
[RuneIconGenerator]::GenerateMagnetIcon("$runesDir\rune_magnet.png")
[RuneIconGenerator]::GenerateExpIcon("$runesDir\rune_exp.png")

Write-Host "All 14 rune icons generated successfully!"
