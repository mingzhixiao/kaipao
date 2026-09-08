using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class StudioAssetGenerator {

    // 辅助：创建圆角矩形
    public static GraphicsPath CreateRoundedRect(Rectangle bounds, int radius) {
        int diameter = radius * 2;
        Size size = new Size(diameter, diameter);
        Rectangle arc = new Rectangle(bounds.Location, size);
        GraphicsPath path = new GraphicsPath();
        if (radius == 0) { path.AddRectangle(bounds); return path; }
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

    // 辅助：创建八角倒角切边矩形 (科幻装甲板底框)
    public static GraphicsPath CreateChamferRect(Rectangle rect, int chamfer) {
        GraphicsPath path = new GraphicsPath();
        path.AddLine(rect.Left + chamfer, rect.Top, rect.Right - chamfer, rect.Top);
        path.AddLine(rect.Right - chamfer, rect.Top, rect.Right, rect.Top + chamfer);
        path.AddLine(rect.Right, rect.Top + chamfer, rect.Right, rect.Bottom - chamfer);
        path.AddLine(rect.Right, rect.Bottom - chamfer, rect.Right - chamfer, rect.Bottom);
        path.AddLine(rect.Right - chamfer, rect.Bottom, rect.Left + chamfer, rect.Bottom);
        path.AddLine(rect.Left + chamfer, rect.Bottom, rect.Left, rect.Bottom - chamfer);
        path.AddLine(rect.Left, rect.Bottom - chamfer, rect.Left, rect.Top + chamfer);
        path.CloseFigure();
        return path;
    }

    // 绘制高阶科幻装甲符文底盘
    public static void DrawRuneChassis(Graphics g, int size, Color primaryGlow, Color accentColor, string category) {
        int pad = 16;
        int chamfer = 42;
        Rectangle rect = new Rectangle(pad, pad, size - pad * 2, size - pad * 2);

        // 1. 深渊金属装甲底板渐变
        using (LinearGradientBrush bgBrush = new LinearGradientBrush(
            new Point(pad, pad), new Point(size - pad, size - pad),
            Color.FromArgb(255, 15, 23, 38), Color.FromArgb(255, 4, 7, 14))) {
            using (GraphicsPath path = CreateChamferRect(rect, chamfer)) {
                g.FillPath(bgBrush, path);
            }
        }

        // 2. 碳纤维蜂窝纹理网格
        using (Pen gridPen = new Pen(Color.FromArgb(28, primaryGlow.R, primaryGlow.G, primaryGlow.B), 1.8f)) {
            for (int i = pad + 32; i < size - pad - 20; i += 32) {
                g.DrawLine(gridPen, i, pad + 20, i, size - pad - 20);
                g.DrawLine(gridPen, pad + 20, i, size - pad - 20, i);
            }
        }

        // 3. 核心大范围环境光晕 (Radial Glow)
        using (GraphicsPath glowP = new GraphicsPath()) {
            glowP.AddEllipse(size / 2 - 140, size / 2 - 140, 280, 280);
            using (PathGradientBrush pgb = new PathGradientBrush(glowP)) {
                pgb.CenterColor = Color.FromArgb(85, primaryGlow.R, primaryGlow.G, primaryGlow.B);
                pgb.SurroundColors = new Color[] { Color.Transparent };
                g.FillPath(pgb, glowP);
            }
        }

        // 4. 重型金属外边框
        using (Pen framePen = new Pen(Color.FromArgb(255, 45, 62, 88), 6f)) {
            using (GraphicsPath path = CreateChamferRect(rect, chamfer)) {
                g.DrawPath(framePen, path);
            }
        }

        // 5. 内嵌流光能量边线
        using (Pen glowPen = new Pen(Color.FromArgb(200, primaryGlow.R, primaryGlow.G, primaryGlow.B), 3.5f)) {
            Rectangle innerRect = new Rectangle(pad + 8, pad + 8, size - (pad + 8) * 2, size - (pad + 8) * 2);
            using (GraphicsPath path = CreateChamferRect(innerRect, chamfer - 6)) {
                g.DrawPath(glowPen, path);
            }
        }

        // 6. 四角科幻重装铆钉与高亮光标
        using (SolidBrush ledBrush = new SolidBrush(accentColor)) {
            g.FillRectangle(ledBrush, pad + 16, pad + 10, 20, 5);
            g.FillRectangle(ledBrush, size - pad - 36, pad + 10, 20, 5);
            g.FillRectangle(ledBrush, pad + 16, size - pad - 15, 20, 5);
            g.FillRectangle(ledBrush, size - pad - 36, size - pad - 15, 20, 5);
        }

        // 7. 顶部品类科技标识徽记
        using (SolidBrush tagBg = new SolidBrush(Color.FromArgb(160, 10, 15, 25))) {
            g.FillRectangle(tagBg, size / 2 - 40, pad + 4, 80, 14);
        }
        using (Pen tagPen = new Pen(primaryGlow, 1.5f)) {
            g.DrawRectangle(tagPen, size / 2 - 40, pad + 4, 80, 14);
        }
    }

    // 辅助：保存超采样图像 (1024x1024 渲染 -> 512x512 高保真双三次插值缩放输出)
    public static void SaveSuperSampled(Bitmap hiResBmp, string dstPath, int finalSize) {
        using (Bitmap finalBmp = new Bitmap(finalSize, finalSize, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(finalBmp)) {
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.SmoothingMode = SmoothingMode.HighQuality;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.CompositingQuality = CompositingQuality.HighQuality;
                g.DrawImage(hiResBmp, 0, 0, finalSize, finalSize);
            }
            finalBmp.Save(dstPath, ImageFormat.Png);
        }
    }

    // =========================================================================
    // 14 大高阶精致符文生成器
    // =========================================================================

    // 1. 穿甲弹头 (rune_attack) - 重装炽热钨合金穿甲弹尖与音爆激波环
    public static void GenerateRuneAttack(string dst) {
        int S = 1024;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawRuneChassis(g, S, Color.FromArgb(249, 115, 22), Color.FromArgb(253, 224, 71), "GUN");
                int cx = S / 2, cy = S / 2;

                // 爆发光轮
                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 240, cy - 240, 480, 480);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(160, 249, 115, 22);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // 音爆超音速震波圆环 (2 层)
                using (Pen wavePen = new Pen(Color.FromArgb(150, 255, 170, 0), 6f)) {
                    g.DrawEllipse(wavePen, cx - 220, cy - 60, 440, 160);
                }
                using (Pen wavePen2 = new Pen(Color.FromArgb(220, 255, 220, 100), 4f)) {
                    g.DrawEllipse(wavePen2, cx - 160, cy + 80, 320, 110);
                }

                // 重型钨合金穿甲弹体 (巨大尖锥)
                Point[] bulletPts = new Point[] {
                    new Point(cx, cy - 260),
                    new Point(cx + 85, cy - 90),
                    new Point(cx + 85, cy + 200),
                    new Point(cx - 85, cy + 200),
                    new Point(cx - 85, cy - 90)
                };
                using (LinearGradientBrush bBrush = new LinearGradientBrush(
                    new Point(cx - 85, 0), new Point(cx + 85, 0),
                    Color.FromArgb(255, 254, 240, 138), Color.FromArgb(255, 234, 88, 12))) {
                    g.FillPolygon(bBrush, bulletPts);
                }
                using (Pen bPen = new Pen(Color.FromArgb(255, 255, 255, 255), 6f)) {
                    g.DrawPolygon(bPen, bulletPts);
                }

                // 弹头炽烈灼热高光芯 (White-hot Core)
                Point[] corePts = new Point[] {
                    new Point(cx, cy - 250),
                    new Point(cx + 35, cy - 90),
                    new Point(cx + 35, cy + 180),
                    new Point(cx - 35, cy + 180),
                    new Point(cx - 35, cy - 90)
                };
                using (SolidBrush coreB = new SolidBrush(Color.FromArgb(230, 255, 255, 255))) {
                    g.FillPolygon(coreB, corePts);
                }

                // 侧翼导流槽高科技刻线
                using (Pen groovePen = new Pen(Color.FromArgb(255, 180, 40, 0), 5f)) {
                    g.DrawLine(groovePen, cx - 50, cy - 60, cx - 50, cy + 160);
                    g.DrawLine(groovePen, cx + 50, cy - 60, cx + 50, cy + 160);
                }
            }
            SaveSuperSampled(bmp, dst, 512);
        }
    }

    // 2. 超频扳机 (rune_firerate) - 赛博高能轻触扳机与极速多重开火弧线
    public static void GenerateRuneFirerate(string dst) {
        int S = 1024;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawRuneChassis(g, S, Color.FromArgb(6, 182, 212), Color.FromArgb(165, 243, 252), "GUN");
                int cx = S / 2, cy = S / 2;

                // 极速流线光晕
                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 240, cy - 240, 480, 480);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(140, 6, 182, 212);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // 动态射频脉冲光弧 (3 道同心扩散加速圆环)
                for (int r = 140; r <= 280; r += 70) {
                    using (Pen arcPen = new Pen(Color.FromArgb(160 - (r - 140) / 2, 6, 182, 212), 8f)) {
                        arcPen.DashStyle = DashStyle.Dash;
                        g.DrawArc(arcPen, cx - r, cy - r, r * 2, r * 2, 180, 160);
                    }
                }

                // 枪机护圈与金属机匣骨架
                using (Pen guardPen = new Pen(Color.FromArgb(255, 71, 85, 105), 24f)) {
                    guardPen.StartCap = LineCap.Round; guardPen.EndCap = LineCap.Round;
                    g.DrawArc(guardPen, cx - 170, cy - 180, 340, 360, 40, 200);
                }
                using (Pen guardNeon = new Pen(Color.FromArgb(255, 6, 182, 212), 6f)) {
                    g.DrawArc(guardNeon, cx - 170, cy - 180, 340, 360, 40, 200);
                }

                // 碳纤维弧形竞赛扳机
                GraphicsPath triggerPath = new GraphicsPath();
                triggerPath.AddBezier(
                    new Point(cx + 20, cy - 150),
                    new Point(cx - 70, cy - 40),
                    new Point(cx - 90, cy + 90),
                    new Point(cx - 10, cy + 160)
                );
                triggerPath.AddLine(cx - 10, cy + 160, cx + 25, cy + 140);
                triggerPath.AddBezier(
                    new Point(cx + 25, cy + 140),
                    new Point(cx - 40, cy + 80),
                    new Point(cx - 20, cy - 40),
                    new Point(cx + 60, cy - 130)
                );
                triggerPath.CloseFigure();

                using (LinearGradientBrush tBrush = new LinearGradientBrush(
                    new Point(cx - 80, 0), new Point(cx + 60, 0),
                    Color.FromArgb(255, 165, 243, 252), Color.FromArgb(255, 8, 145, 178))) {
                    g.FillPath(tBrush, triggerPath);
                }
                using (Pen tPen = new Pen(Color.FromArgb(255, 255, 255, 255), 5f)) {
                    g.DrawPath(tPen, triggerPath);
                }

                // 扳机上的轻量化镂空孔与高光
                using (SolidBrush holeB = new SolidBrush(Color.FromArgb(255, 15, 23, 42))) {
                    g.FillEllipse(holeB, cx - 35, cy - 30, 22, 22);
                    g.FillEllipse(holeB, cx - 45, cy + 25, 22, 22);
                    g.FillEllipse(holeB, cx - 35, cy + 80, 22, 22);
                }
            }
            SaveSuperSampled(bmp, dst, 512);
        }
    }

    // 3. 弱点标定 (rune_crit) - 全息狙击瞄准准星与弱点锁定十字
    public static void GenerateRuneCrit(string dst) {
        int S = 1024;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawRuneChassis(g, S, Color.FromArgb(239, 68, 68), Color.FromArgb(254, 202, 202), "GUN");
                int cx = S / 2, cy = S / 2;

                // 核心锁定光晕
                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 240, cy - 240, 480, 480);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(160, 239, 68, 68);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // 外层战术测距刻度圆环
                using (Pen ringPen = new Pen(Color.FromArgb(200, 239, 68, 68), 7f)) {
                    g.DrawEllipse(ringPen, cx - 210, cy - 210, 420, 420);
                }
                using (Pen tickPen = new Pen(Color.FromArgb(255, 254, 202, 202), 4f)) {
                    for (int angle = 0; angle < 360; angle += 30) {
                        double rad = angle * Math.PI / 180.0;
                        int x1 = (int)(cx + Math.Cos(rad) * 195);
                        int y1 = (int)(cy + Math.Sin(rad) * 195);
                        int x2 = (int)(cx + Math.Cos(rad) * 215);
                        int y2 = (int)(cy + Math.Sin(rad) * 215);
                        g.DrawLine(tickPen, x1, y1, x2, y2);
                    }
                }

                // 4 个锁定角标 (Corner Reticles)
                using (Pen cornerPen = new Pen(Color.FromArgb(255, 255, 255, 255), 9f)) {
                    int sz = 130;
                    int arm = 45;
                    // Top-Left
                    g.DrawLine(cornerPen, cx - sz, cy - sz + arm, cx - sz, cy - sz);
                    g.DrawLine(cornerPen, cx - sz, cy - sz, cx - sz + arm, cy - sz);
                    // Top-Right
                    g.DrawLine(cornerPen, cx + sz, cy - sz + arm, cx + sz, cy - sz);
                    g.DrawLine(cornerPen, cx + sz, cy - sz, cx + sz - arm, cy - sz);
                    // Bottom-Left
                    g.DrawLine(cornerPen, cx - sz, cy + sz - arm, cx - sz, cy + sz);
                    g.DrawLine(cornerPen, cx - sz, cy + sz, cx - sz + arm, cy + sz);
                    // Bottom-Right
                    g.DrawLine(cornerPen, cx + sz, cy + sz - arm, cx + sz, cy + sz);
                    g.DrawLine(cornerPen, cx + sz, cy + sz, cx + sz - arm, cy + sz);
                }

                // 中间十字准星带断点
                using (Pen crossPen = new Pen(Color.FromArgb(255, 239, 68, 68), 6f)) {
                    g.DrawLine(crossPen, cx - 250, cy, cx - 45, cy);
                    g.DrawLine(crossPen, cx + 45, cy, cx + 250, cy);
                    g.DrawLine(crossPen, cx, cy - 250, cx, cy - 45);
                    g.DrawLine(crossPen, cx, cy + 45, cx, cy + 250);
                }

                // 核心红点极光锁定圈
                using (SolidBrush dotB = new SolidBrush(Color.FromArgb(255, 255, 255, 255))) {
                    g.FillEllipse(dotB, cx - 18, cy - 18, 36, 36);
                }
                using (Pen dotRing = new Pen(Color.FromArgb(255, 239, 68, 68), 5f)) {
                    g.DrawEllipse(dotRing, cx - 40, cy - 40, 80, 80);
                }
            }
            SaveSuperSampled(bmp, dst, 512);
        }
    }

    // 4. 致命打击 (rune_critDmg) - 巨型八角爆轰星芒与高能冲击波裂片
    public static void GenerateRuneCritDmg(string dst) {
        int S = 1024;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawRuneChassis(g, S, Color.FromArgb(245, 158, 11), Color.FromArgb(254, 240, 138), "GUN");
                int cx = S / 2, cy = S / 2;

                // 核心爆轰强光
                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 260, cy - 260, 520, 520);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(180, 245, 158, 11);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // 8 角爆发光矛 (4 长 4 短)
                int numPoints = 16;
                PointF[] starPts = new PointF[numPoints];
                for (int i = 0; i < numPoints; i++) {
                    double angle = i * Math.PI * 2 / numPoints - Math.PI / 2;
                    double r;
                    if (i % 4 == 0) r = 260;        // 主轴光刺
                    else if (i % 2 == 0) r = 180;   // 斜轴光刺
                    else r = 60;                    // 内陷凹点
                    starPts[i] = new PointF((float)(cx + Math.Cos(angle) * r), (float)(cy + Math.Sin(angle) * r));
                }

                using (LinearGradientBrush sBrush = new LinearGradientBrush(
                    new Point(cx - 200, cy - 200), new Point(cx + 200, cy + 200),
                    Color.FromArgb(255, 254, 240, 138), Color.FromArgb(255, 217, 119, 6))) {
                    g.FillPolygon(sBrush, starPts);
                }
                using (Pen sPen = new Pen(Color.FromArgb(255, 255, 255, 255), 6f)) {
                    g.DrawPolygon(sPen, starPts);
                }

                // 中心耀斑白炽核心
                using (GraphicsPath cp = new GraphicsPath()) {
                    cp.AddEllipse(cx - 70, cy - 70, 140, 140);
                    using (PathGradientBrush pgb = new PathGradientBrush(cp)) {
                        pgb.CenterColor = Color.FromArgb(255, 255, 255, 255);
                        pgb.SurroundColors = new Color[] { Color.FromArgb(0, 245, 158, 11) };
                        g.FillPath(pgb, cp);
                    }
                }

                // 4 颗向外飞溅的高速等离子破片
                using (SolidBrush shardB = new SolidBrush(Color.FromArgb(255, 254, 240, 138))) {
                    g.FillPolygon(shardB, new Point[] { new Point(cx - 190, cy - 190), new Point(cx - 170, cy - 180), new Point(cx - 180, cy - 170) });
                    g.FillPolygon(shardB, new Point[] { new Point(cx + 190, cy - 190), new Point(cx + 170, cy - 180), new Point(cx + 180, cy - 170) });
                    g.FillPolygon(shardB, new Point[] { new Point(cx - 190, cy + 190), new Point(cx - 170, cy + 180), new Point(cx - 180, cy + 170) });
                    g.FillPolygon(shardB, new Point[] { new Point(cx + 190, cy + 190), new Point(cx + 170, cy + 180), new Point(cx + 180, cy + 170) });
                }
            }
            SaveSuperSampled(bmp, dst, 512);
        }
    }

    // 5. 弹道延程 (rune_range) - 高速穿空超长程等离子弹道与卫星遥测波
    public static void GenerateRuneRange(string dst) {
        int S = 1024;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawRuneChassis(g, S, Color.FromArgb(14, 165, 233), Color.FromArgb(186, 230, 253), "GUN");
                int cx = S / 2, cy = S / 2;

                // 穿透斜向光束
                GraphicsState state = g.Save();
                g.TranslateTransform(cx, cy);
                g.RotateTransform(-45f);

                // 尾迹能量辉光
                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(-60, -260, 120, 520);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(140, 14, 165, 233);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // 渐进扩散的 3 重测距波纹
                using (Pen ringPen = new Pen(Color.FromArgb(160, 14, 165, 233), 5f)) {
                    g.DrawArc(ringPen, -180, 80, 360, 120, 0, 360);
                    g.DrawArc(ringPen, -130, -30, 260, 90, 0, 360);
                    g.DrawArc(ringPen, -80, -140, 160, 60, 0, 360);
                }

                // 超音速光矢箭体
                Point[] arrowPts = new Point[] {
                    new Point(0, -240),
                    new Point(45, -120),
                    new Point(18, -120),
                    new Point(18, 220),
                    new Point(-18, 220),
                    new Point(-18, -120),
                    new Point(-45, -120)
                };
                using (LinearGradientBrush aBrush = new LinearGradientBrush(
                    new Point(0, -240), new Point(0, 220),
                    Color.FromArgb(255, 255, 255, 255), Color.FromArgb(255, 2, 132, 199))) {
                    g.FillPolygon(aBrush, arrowPts);
                }
                using (Pen aPen = new Pen(Color.FromArgb(255, 255, 255, 255), 5f)) {
                    g.DrawPolygon(aPen, arrowPts);
                }

                g.Restore(state);
            }
            SaveSuperSampled(bmp, dst, 512);
        }
    }

    // 6. 贯穿协议 (rune_pierce) - 钨芯尾翼脱壳穿甲弹贯穿多层装甲板
    public static void GenerateRunePierce(string dst) {
        int S = 1024;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawRuneChassis(g, S, Color.FromArgb(234, 88, 12), Color.FromArgb(254, 215, 170), "GUN");
                int cx = S / 2, cy = S / 2;

                // 2 块被贯穿的重装甲板
                using (LinearGradientBrush plateB = new LinearGradientBrush(
                    new Point(0, cy - 180), new Point(0, cy + 180),
                    Color.FromArgb(255, 51, 65, 85), Color.FromArgb(255, 30, 41, 59))) {
                    g.FillRectangle(plateB, cx - 180, cy - 170, 48, 340);
                    g.FillRectangle(plateB, cx + 50, cy - 170, 48, 340);
                }
                using (Pen platePen = new Pen(Color.FromArgb(255, 100, 116, 139), 5f)) {
                    g.DrawRectangle(platePen, cx - 180, cy - 170, 48, 340);
                    g.DrawRectangle(platePen, cx + 50, cy - 170, 48, 340);
                }

                // 贯穿破口炽热火光
                using (SolidBrush holeB = new SolidBrush(Color.FromArgb(255, 251, 146, 60))) {
                    g.FillEllipse(holeB, cx - 186, cy - 25, 60, 50);
                    g.FillEllipse(holeB, cx + 44, cy - 25, 60, 50);
                }

                // 贯穿高速重型穿甲长矛 (横向飞行)
                Point[] spearPts = new Point[] {
                    new Point(cx + 250, cy),
                    new Point(cx + 120, cy - 40),
                    new Point(cx - 240, cy - 18),
                    new Point(cx - 240, cy + 18),
                    new Point(cx + 120, cy + 40)
                };
                using (LinearGradientBrush sBrush = new LinearGradientBrush(
                    new Point(cx - 240, 0), new Point(cx + 250, 0),
                    Color.FromArgb(255, 234, 88, 12), Color.FromArgb(255, 255, 255, 255))) {
                    g.FillPolygon(sBrush, spearPts);
                }
                using (Pen sPen = new Pen(Color.FromArgb(255, 255, 255, 255), 5f)) {
                    g.DrawPolygon(sPen, spearPts);
                }
            }
            SaveSuperSampled(bmp, dst, 512);
        }
    }

    // 7. 分裂膛线 (rune_multishot) - 三联发散等离子穿甲光矛
    public static void GenerateRuneMultishot(string dst) {
        int S = 1024;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawRuneChassis(g, S, Color.FromArgb(234, 179, 8), Color.FromArgb(254, 240, 138), "GUN");
                int cx = S / 2, cy = S / 2 + 50;

                // 3 道发散光矛 (-26度, 0度, +26度)
                float[] angles = new float[] { -28f, 0f, 28f };
                foreach (float angle in angles) {
                    GraphicsState state = g.Save();
                    g.TranslateTransform(cx, cy + 100);
                    g.RotateTransform(angle);

                    // 弹道光斑
                    using (GraphicsPath p = new GraphicsPath()) {
                        p.AddEllipse(-45, -340, 90, 360);
                        using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                            pgb.CenterColor = Color.FromArgb(160, 234, 179, 8);
                            pgb.SurroundColors = new Color[] { Color.Transparent };
                            g.FillPath(pgb, p);
                        }
                    }

                    // 穿甲弹头
                    Point[] bPts = new Point[] {
                        new Point(0, -320),
                        new Point(32, -200),
                        new Point(14, -200),
                        new Point(14, -60),
                        new Point(-14, -60),
                        new Point(-14, -200),
                        new Point(-32, -200)
                    };
                    using (LinearGradientBrush bBrush = new LinearGradientBrush(
                        new Point(0, -320), new Point(0, -60),
                        Color.FromArgb(255, 255, 255, 255), Color.FromArgb(255, 217, 119, 6))) {
                        g.FillPolygon(bBrush, bPts);
                    }
                    using (Pen bPen = new Pen(Color.FromArgb(255, 255, 255, 255), 4f)) {
                        g.DrawPolygon(bPen, bPts);
                    }

                    g.Restore(state);
                }

                // 底部发射机匣基座
                using (SolidBrush baseB = new SolidBrush(Color.FromArgb(255, 30, 41, 59))) {
                    g.FillEllipse(baseB, cx - 80, cy + 40, 160, 120);
                }
                using (Pen basePen = new Pen(Color.FromArgb(255, 234, 179, 8), 5f)) {
                    g.DrawEllipse(basePen, cx - 80, cy + 40, 160, 120);
                }
            }
            SaveSuperSampled(bmp, dst, 512);
        }
    }

    // 8. 纳米护甲 (rune_hp) - 翠绿高科技纳米修复蜂巢装甲盾
    public static void GenerateRuneHp(string dst) {
        int S = 1024;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawRuneChassis(g, S, Color.FromArgb(16, 185, 129), Color.FromArgb(167, 243, 208), "DEF");
                int cx = S / 2, cy = S / 2;

                // 绿色治愈光晕
                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 240, cy - 240, 480, 480);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(160, 16, 185, 129);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // 重型战术军盾轮廓
                Point[] shieldPts = new Point[] {
                    new Point(cx, cy - 240),
                    new Point(cx + 170, cy - 160),
                    new Point(cx + 140, cy + 90),
                    new Point(cx, cy + 240),
                    new Point(cx - 140, cy + 90),
                    new Point(cx - 170, cy - 160)
                };
                using (LinearGradientBrush sBrush = new LinearGradientBrush(
                    new Point(0, cy - 240), new Point(0, cy + 240),
                    Color.FromArgb(255, 5, 150, 105), Color.FromArgb(255, 6, 78, 59))) {
                    g.FillPolygon(sBrush, shieldPts);
                }
                using (Pen sPen = new Pen(Color.FromArgb(255, 167, 243, 208), 8f)) {
                    g.DrawPolygon(sPen, shieldPts);
                }

                // 盾牌中心高能十字生命徽记
                using (GraphicsPath crossP = new GraphicsPath()) {
                    int w = 40, len = 100;
                    crossP.AddRectangle(new Rectangle(cx - w / 2, cy - len, w, len * 2));
                    crossP.AddRectangle(new Rectangle(cx - len, cy - w / 2, len * 2, w));
                    using (SolidBrush cBrush = new SolidBrush(Color.FromArgb(255, 255, 255, 255))) {
                        g.FillPath(cBrush, crossP);
                    }
                }

                // 纳米蜂巢六边形晶格线
                using (Pen hexPen = new Pen(Color.FromArgb(160, 167, 243, 208), 3f)) {
                    g.DrawPolygon(hexPen, new Point[] {
                        new Point(cx, cy - 170), new Point(cx + 60, cy - 130), new Point(cx + 60, cy - 60),
                        new Point(cx, cy - 20), new Point(cx - 60, cy - 60), new Point(cx - 60, cy - 130)
                    });
                }
            }
            SaveSuperSampled(bmp, dst, 512);
        }
    }

    // 9. 能量屏障 (rune_shield) - 电光蓝球形偏折力场发生器与高压电弧
    public static void GenerateRuneShield(string dst) {
        int S = 1024;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawRuneChassis(g, S, Color.FromArgb(14, 165, 233), Color.FromArgb(186, 230, 253), "DEF");
                int cx = S / 2, cy = S / 2;

                // 多层同心偏转能量力场
                for (int r = 220; r >= 80; r -= 60) {
                    using (Pen ringPen = new Pen(Color.FromArgb(120 + (220 - r), 14, 165, 233), 8f)) {
                        if (r == 160) ringPen.DashStyle = DashStyle.Dash;
                        g.DrawEllipse(ringPen, cx - r, cy - r, r * 2, r * 2);
                    }
                }

                // 4 组力场发生电极柱
                using (SolidBrush emitB = new SolidBrush(Color.FromArgb(255, 30, 41, 59))) {
                    g.FillRectangle(emitB, cx - 26, cy - 260, 52, 60);
                    g.FillRectangle(emitB, cx - 26, cy + 200, 52, 60);
                    g.FillRectangle(emitB, cx - 260, cy - 26, 60, 52);
                    g.FillRectangle(emitB, cx + 200, cy - 26, 60, 52);
                }
                using (Pen emitPen = new Pen(Color.FromArgb(255, 14, 165, 233), 5f)) {
                    g.DrawRectangle(emitPen, cx - 26, cy - 260, 52, 60);
                    g.DrawRectangle(emitPen, cx - 26, cy + 200, 52, 60);
                    g.DrawRectangle(emitPen, cx - 260, cy - 26, 60, 52);
                    g.DrawRectangle(emitPen, cx + 200, cy - 26, 60, 52);
                }

                // 中心等离子聚合反应球
                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 90, cy - 90, 180, 180);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(255, 255, 255, 255);
                        pgb.SurroundColors = new Color[] { Color.FromArgb(200, 14, 165, 233) };
                        g.FillPath(pgb, p);
                    }
                }
                using (Pen coreRing = new Pen(Color.FromArgb(255, 255, 255, 255), 6f)) {
                    g.DrawEllipse(coreRing, cx - 90, cy - 90, 180, 180);
                }
            }
            SaveSuperSampled(bmp, dst, 512);
        }
    }

    // 10. 战术增幅 (rune_skillPower) - 紫色核反应堆能量增幅线圈
    public static void GenerateRuneSkillPower(string dst) {
        int S = 1024;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawRuneChassis(g, S, Color.FromArgb(168, 85, 247), Color.FromArgb(243, 232, 255), "SKILL");
                int cx = S / 2, cy = S / 2;

                // 量子聚能光晕
                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 240, cy - 240, 480, 480);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(160, 168, 85, 247);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // 3 叶核聚变加速线圈
                for (int i = 0; i < 3; i++) {
                    GraphicsState st = g.Save();
                    g.TranslateTransform(cx, cy);
                    g.RotateTransform(i * 120f);

                    Point[] bladePts = new Point[] {
                        new Point(0, -60),
                        new Point(70, -180),
                        new Point(40, -240),
                        new Point(-40, -240),
                        new Point(-70, -180)
                    };
                    using (LinearGradientBrush bBrush = new LinearGradientBrush(
                        new Point(0, -240), new Point(0, -60),
                        Color.FromArgb(255, 192, 132, 252), Color.FromArgb(255, 126, 34, 206))) {
                        g.FillPolygon(bBrush, bladePts);
                    }
                    using (Pen bPen = new Pen(Color.FromArgb(255, 243, 232, 255), 5f)) {
                        g.DrawPolygon(bPen, bladePts);
                    }

                    g.Restore(st);
                }

                // 中心白炽能量晶核
                using (GraphicsPath cp = new GraphicsPath()) {
                    cp.AddEllipse(cx - 65, cy - 65, 130, 130);
                    using (PathGradientBrush pgb = new PathGradientBrush(cp)) {
                        pgb.CenterColor = Color.FromArgb(255, 255, 255, 255);
                        pgb.SurroundColors = new Color[] { Color.FromArgb(255, 168, 85, 247) };
                        g.FillPath(pgb, cp);
                    }
                }
                using (Pen cPen = new Pen(Color.FromArgb(255, 255, 255, 255), 6f)) {
                    g.DrawEllipse(cPen, cx - 65, cy - 65, 130, 130);
                }
            }
            SaveSuperSampled(bmp, dst, 512);
        }
    }

    // 11. 冷却压缩 (rune_skillCd) - 时空扭曲齿轮与超频时钟
    public static void GenerateRuneSkillCd(string dst) {
        int S = 1024;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawRuneChassis(g, S, Color.FromArgb(99, 102, 241), Color.FromArgb(224, 231, 255), "SKILL");
                int cx = S / 2, cy = S / 2;

                // 顺时针高速加速流光弧
                using (Pen speedPen = new Pen(Color.FromArgb(255, 99, 102, 241), 12f)) {
                    speedPen.StartCap = LineCap.Round; speedPen.EndCap = LineCap.ArrowAnchor;
                    g.DrawArc(speedPen, cx - 210, cy - 210, 420, 420, -80, 260);
                }

                // 精密时钟外表盘
                using (Pen dialPen = new Pen(Color.FromArgb(200, 224, 231, 255), 6f)) {
                    g.DrawEllipse(dialPen, cx - 170, cy - 170, 340, 340);
                }
                using (SolidBrush dialBg = new SolidBrush(Color.FromArgb(220, 15, 23, 42))) {
                    g.FillEllipse(dialBg, cx - 165, cy - 165, 330, 330);
                }

                // 12 个时钟刻度
                using (Pen tickPen = new Pen(Color.FromArgb(255, 165, 180, 252), 5f)) {
                    for (int i = 0; i < 12; i++) {
                        double rad = i * Math.PI / 6.0;
                        int r1 = (i % 3 == 0) ? 125 : 145;
                        int x1 = (int)(cx + Math.Cos(rad) * r1);
                        int y1 = (int)(cy + Math.Sin(rad) * r1);
                        int x2 = (int)(cx + Math.Cos(rad) * 160);
                        int y2 = (int)(cy + Math.Sin(rad) * 160);
                        g.DrawLine(tickPen, x1, y1, x2, y2);
                    }
                }

                // 时针与分针高速超频指针
                using (Pen hPen = new Pen(Color.FromArgb(255, 255, 255, 255), 10f)) {
                    hPen.StartCap = LineCap.Round; hPen.EndCap = LineCap.Triangle;
                    g.DrawLine(hPen, cx, cy, cx, cy - 110);
                }
                using (Pen mPen = new Pen(Color.FromArgb(255, 99, 102, 241), 8f)) {
                    mPen.StartCap = LineCap.Round; mPen.EndCap = LineCap.Triangle;
                    g.DrawLine(mPen, cx, cy, cx + 90, cy + 30);
                }
                using (SolidBrush centerDot = new SolidBrush(Color.FromArgb(255, 255, 255, 255))) {
                    g.FillEllipse(centerDot, cx - 16, cy - 16, 32, 32);
                }
            }
            SaveSuperSampled(bmp, dst, 512);
        }
    }

    // 12. 覆盖拓展 (rune_skillRange) - 广域声呐涡旋雷达扫描波
    public static void GenerateRuneSkillRange(string dst) {
        int S = 1024;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawRuneChassis(g, S, Color.FromArgb(168, 85, 247), Color.FromArgb(243, 232, 255), "SKILL");
                int cx = S / 2, cy = S / 2;

                // 4 重同心扩散脉冲波
                for (int r = 230; r >= 60; r -= 55) {
                    using (Pen ringPen = new Pen(Color.FromArgb(140 + (230 - r) / 2, 168, 85, 247), 6f)) {
                        g.DrawEllipse(ringPen, cx - r, cy - r, r * 2, r * 2);
                    }
                }

                // 雷达扫描扇面光锥 (Sweep Cone)
                using (GraphicsPath sweepP = new GraphicsPath()) {
                    sweepP.AddPie(cx - 230, cy - 230, 460, 460, -45, 65);
                    using (LinearGradientBrush sweepB = new LinearGradientBrush(
                        new Point(cx, cy), new Point(cx + 200, cy - 100),
                        Color.FromArgb(160, 192, 132, 252), Color.FromArgb(0, 168, 85, 247))) {
                        g.FillPath(sweepB, sweepP);
                    }
                }

                // 核心发射天线柱
                using (SolidBrush antB = new SolidBrush(Color.FromArgb(255, 255, 255, 255))) {
                    g.FillEllipse(antB, cx - 25, cy - 25, 50, 50);
                }
            }
            SaveSuperSampled(bmp, dst, 512);
        }
    }

    // 13. 磁吸阵列 (rune_magnet) - 强力电磁涡旋引力环
    public static void GenerateRuneMagnet(string dst) {
        int S = 1024;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawRuneChassis(g, S, Color.FromArgb(6, 182, 212), Color.FromArgb(165, 243, 252), "UTIL");
                int cx = S / 2, cy = S / 2;

                // 旋转磁力线 (4 条弧线)
                using (Pen magPen = new Pen(Color.FromArgb(200, 6, 182, 212), 7f)) {
                    magPen.DashStyle = DashStyle.Dash;
                    g.DrawArc(magPen, cx - 200, cy - 200, 400, 400, 0, 120);
                    g.DrawArc(magPen, cx - 200, cy - 200, 400, 400, 180, 120);
                    g.DrawArc(magPen, cx - 140, cy - 140, 280, 280, 60, 120);
                    g.DrawArc(magPen, cx - 140, cy - 140, 280, 280, 240, 120);
                }

                // 经典红蓝/科技高能磁极蹄铁
                GraphicsPath uPath = new GraphicsPath();
                uPath.AddArc(cx - 150, cy - 160, 300, 320, 0, 180);
                uPath.AddLine(cx - 150, cy, cx - 150, cy - 140);
                uPath.AddLine(cx - 90, cy - 140, cx - 90, cy);
                uPath.AddArc(cx - 90, cy - 100, 180, 200, 180, -180);
                uPath.AddLine(cx + 90, cy, cx + 90, cy - 140);
                uPath.AddLine(cx + 150, cy - 140, cx + 150, cy);
                uPath.CloseFigure();

                using (LinearGradientBrush uBrush = new LinearGradientBrush(
                    new Point(0, cy - 140), new Point(0, cy + 160),
                    Color.FromArgb(255, 6, 182, 212), Color.FromArgb(255, 30, 58, 138))) {
                    g.FillPath(uBrush, uPath);
                }
                using (Pen uPen = new Pen(Color.FromArgb(255, 255, 255, 255), 6f)) {
                    g.DrawPath(uPen, uPath);
                }

                // 两侧磁极银白接触头
                using (SolidBrush poleB = new SolidBrush(Color.FromArgb(255, 255, 255, 255))) {
                    g.FillRectangle(poleB, cx - 152, cy - 160, 64, 35);
                    g.FillRectangle(poleB, cx + 88, cy - 160, 64, 35);
                }

                // 中心吸引的能量晶体
                Point[] gemPts = new Point[] {
                    new Point(cx, cy - 40), new Point(cx + 35, cy),
                    new Point(cx, cy + 40), new Point(cx - 35, cy)
                };
                using (SolidBrush gemB = new SolidBrush(Color.FromArgb(255, 255, 255, 255))) {
                    g.FillPolygon(gemB, gemPts);
                }
            }
            SaveSuperSampled(bmp, dst, 512);
        }
    }

    // 14. 数据窃取 (rune_exp) - 赛博 AI 神经芯片与上升经验数据流
    public static void GenerateRuneExp(string dst) {
        int S = 1024;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                DrawRuneChassis(g, S, Color.FromArgb(234, 179, 8), Color.FromArgb(254, 240, 138), "UTIL");
                int cx = S / 2, cy = S / 2;

                // 核心方形 AI 金色芯片
                Rectangle chipRect = new Rectangle(cx - 130, cy - 130, 260, 260);
                using (LinearGradientBrush chipB = new LinearGradientBrush(
                    new Point(cx - 130, cy - 130), new Point(cx + 130, cy + 130),
                    Color.FromArgb(255, 45, 30, 10), Color.FromArgb(255, 18, 24, 38))) {
                    using (GraphicsPath cp = CreateRoundedRect(chipRect, 28)) {
                        g.FillPath(chipB, cp);
                    }
                }
                using (Pen chipPen = new Pen(Color.FromArgb(255, 234, 179, 8), 7f)) {
                    using (GraphicsPath cp = CreateRoundedRect(chipRect, 28)) {
                        g.DrawPath(chipPen, cp);
                    }
                }

                // 金色引脚 (Pins)
                using (SolidBrush pinB = new SolidBrush(Color.FromArgb(255, 254, 240, 138))) {
                    for (int x = cx - 90; x <= cx + 90; x += 36) {
                        g.FillRectangle(pinB, x - 6, cy - 155, 12, 25);
                        g.FillRectangle(pinB, x - 6, cy + 130, 12, 25);
                    }
                    for (int y = cy - 90; y <= cy + 90; y += 36) {
                        g.FillRectangle(pinB, cx - 155, y - 6, 25, 12);
                        g.FillRectangle(pinB, cx + 130, y - 6, 25, 12);
                    }
                }

                // 芯片中心上升数据箭头折线
                Point[] arrowPts = new Point[] {
                    new Point(cx, cy - 85),
                    new Point(cx + 65, cy - 20),
                    new Point(cx + 25, cy - 20),
                    new Point(cx + 25, cy + 70),
                    new Point(cx - 25, cy + 70),
                    new Point(cx - 25, cy - 20),
                    new Point(cx - 65, cy - 20)
                };
                using (LinearGradientBrush aBrush = new LinearGradientBrush(
                    new Point(0, cy - 85), new Point(0, cy + 70),
                    Color.FromArgb(255, 255, 255, 255), Color.FromArgb(255, 234, 179, 8))) {
                    g.FillPolygon(aBrush, arrowPts);
                }
                using (Pen aPen = new Pen(Color.FromArgb(255, 255, 255, 255), 4f)) {
                    g.DrawPolygon(aPen, arrowPts);
                }
            }
            SaveSuperSampled(bmp, dst, 512);
        }
    }

    // =========================================================================
    // 全套 UI 图标 (全面替换 Emoji)
    // =========================================================================

    // 1. 金币/晶核/废料图标 (icon_coin.png) - 替换 🪙 / 💰
    public static void GenerateIconCoin(string dst) {
        int S = 512;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                int cx = S / 2, cy = S / 2;

                // 外部耀眼金色辉光
                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 230, cy - 230, 460, 460);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(170, 245, 158, 11);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // 3D 黄金厚重立体边缘
                using (SolidBrush shadowB = new SolidBrush(Color.FromArgb(255, 146, 64, 14))) {
                    g.FillEllipse(shadowB, cx - 180, cy - 165, 360, 360);
                }

                // 正面黄金金属盘面
                using (LinearGradientBrush coinB = new LinearGradientBrush(
                    new Point(cx - 180, cy - 180), new Point(cx + 180, cy + 180),
                    Color.FromArgb(255, 254, 240, 138), Color.FromArgb(255, 217, 119, 6))) {
                    g.FillEllipse(coinB, cx - 180, cy - 180, 360, 360);
                }
                using (Pen coinPen = new Pen(Color.FromArgb(255, 255, 255, 255), 8f)) {
                    g.DrawEllipse(coinPen, cx - 180, cy - 180, 360, 360);
                }

                // 内圈齿轮刻线
                using (Pen gearPen = new Pen(Color.FromArgb(200, 180, 83, 9), 7f)) {
                    gearPen.DashStyle = DashStyle.Dot;
                    g.DrawEllipse(gearPen, cx - 140, cy - 140, 280, 280);
                }

                // 核心重工骷髅/能量符记
                Point[] emblem = new Point[] {
                    new Point(cx, cy - 80), new Point(cx + 60, cy - 30),
                    new Point(cx + 40, cy + 65), new Point(cx, cy + 90),
                    new Point(cx - 40, cy + 65), new Point(cx - 60, cy - 30)
                };
                using (LinearGradientBrush emB = new LinearGradientBrush(
                    new Point(cx, cy - 80), new Point(cx, cy + 90),
                    Color.FromArgb(255, 255, 255, 255), Color.FromArgb(255, 245, 158, 11))) {
                    g.FillPolygon(emB, emblem);
                }
                using (Pen emPen = new Pen(Color.FromArgb(255, 146, 64, 14), 6f)) {
                    g.DrawPolygon(emPen, emblem);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 2. 体力/行动力闪电电池 (icon_stamina.png) - 替换 ⚡
    public static void GenerateIconStamina(string dst) {
        int S = 512;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                int cx = S / 2, cy = S / 2;

                // 强力高压蓝青辉光
                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 230, cy - 230, 460, 460);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(180, 0, 240, 255);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // 闪电多边形
                Point[] boltPts = new Point[] {
                    new Point(cx + 30, cy - 210),
                    new Point(cx - 110, cy + 10),
                    new Point(cx - 10, cy + 10),
                    new Point(cx - 50, cy + 220),
                    new Point(cx + 120, cy - 20),
                    new Point(cx + 20, cy - 20)
                };

                // 底部深色描边立体层
                using (SolidBrush shadowB = new SolidBrush(Color.FromArgb(255, 3, 105, 161))) {
                    Point[] shadowPts = new Point[boltPts.Length];
                    for (int i = 0; i < boltPts.Length; i++) shadowPts[i] = new Point(boltPts[i].X + 10, boltPts[i].Y + 12);
                    g.FillPolygon(shadowB, shadowPts);
                }

                // 闪电主体填充
                using (LinearGradientBrush bBrush = new LinearGradientBrush(
                    new Point(0, cy - 210), new Point(0, cy + 220),
                    Color.FromArgb(255, 255, 255, 255), Color.FromArgb(255, 0, 240, 255))) {
                    g.FillPolygon(bBrush, boltPts);
                }
                using (Pen bPen = new Pen(Color.FromArgb(255, 255, 255, 255), 7f)) {
                    g.DrawPolygon(bPen, boltPts);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 3. 钻石/以太水晶 (icon_gem.png) - 替换 💎
    public static void GenerateIconGem(string dst) {
        int S = 512;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                int cx = S / 2, cy = S / 2;

                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 230, cy - 230, 460, 460);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(170, 168, 85, 247);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                Point[] topPts = new Point[] {
                    new Point(cx - 110, cy - 140), new Point(cx + 110, cy - 140),
                    new Point(cx + 180, cy - 30), new Point(cx, cy + 200),
                    new Point(cx - 180, cy - 30)
                };

                using (LinearGradientBrush gBrush = new LinearGradientBrush(
                    new Point(0, cy - 140), new Point(0, cy + 200),
                    Color.FromArgb(255, 192, 132, 252), Color.FromArgb(255, 88, 28, 135))) {
                    g.FillPolygon(gBrush, topPts);
                }

                // 内部多面反射切面
                Point[] facet1 = new Point[] { new Point(cx - 110, cy - 140), new Point(cx - 50, cy - 30), new Point(cx, cy + 200), new Point(cx - 180, cy - 30) };
                Point[] facet2 = new Point[] { new Point(cx + 110, cy - 140), new Point(cx + 50, cy - 30), new Point(cx, cy + 200), new Point(cx + 180, cy - 30) };
                Point[] facet3 = new Point[] { new Point(cx - 50, cy - 30), new Point(cx + 50, cy - 30), new Point(cx, cy + 200) };
                Point[] facetTable = new Point[] { new Point(cx - 110, cy - 140), new Point(cx + 110, cy - 140), new Point(cx + 50, cy - 30), new Point(cx - 50, cy - 30) };

                using (SolidBrush b1 = new SolidBrush(Color.FromArgb(180, 216, 180, 254))) g.FillPolygon(b1, facet1);
                using (SolidBrush b2 = new SolidBrush(Color.FromArgb(140, 147, 51, 234))) g.FillPolygon(b2, facet2);
                using (SolidBrush b3 = new SolidBrush(Color.FromArgb(220, 255, 255, 255))) g.FillPolygon(b3, facet3);
                using (SolidBrush bT = new SolidBrush(Color.FromArgb(240, 243, 232, 255))) g.FillPolygon(bT, facetTable);

                using (Pen gPen = new Pen(Color.FromArgb(255, 255, 255, 255), 6f)) {
                    g.DrawPolygon(gPen, topPts);
                    g.DrawLine(gPen, cx - 110, cy - 140, cx - 50, cy - 30);
                    g.DrawLine(gPen, cx + 110, cy - 140, cx + 50, cy - 30);
                    g.DrawLine(gPen, cx - 50, cy - 30, cx + 50, cy - 30);
                    g.DrawLine(gPen, cx - 50, cy - 30, cx, cy + 200);
                    g.DrawLine(gPen, cx + 50, cy - 30, cx, cy + 200);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 4. 武器改装配件零件 (icon_part.png) - 替换 🔩
    public static void GenerateIconPart(string dst) {
        int S = 512;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                int cx = S / 2, cy = S / 2;

                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 230, cy - 230, 460, 460);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(160, 245, 158, 11);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // 工业级钛金六角螺母与精密齿轮
                Point[] nutPts = new Point[] {
                    new Point(cx - 80, cy - 160), new Point(cx + 80, cy - 160),
                    new Point(cx + 170, cy), new Point(cx + 80, cy + 160),
                    new Point(cx - 80, cy + 160), new Point(cx - 170, cy)
                };

                using (LinearGradientBrush nutB = new LinearGradientBrush(
                    new Point(cx - 170, cy - 160), new Point(cx + 170, cy + 160),
                    Color.FromArgb(255, 251, 191, 36), Color.FromArgb(255, 180, 83, 9))) {
                    g.FillPolygon(nutB, nutPts);
                }
                using (Pen nutPen = new Pen(Color.FromArgb(255, 255, 255, 255), 7f)) {
                    g.DrawPolygon(nutPen, nutPts);
                }

                // 中心螺纹孔
                using (SolidBrush holeB = new SolidBrush(Color.FromArgb(255, 15, 23, 42))) {
                    g.FillEllipse(holeB, cx - 70, cy - 70, 140, 140);
                }
                using (Pen threadPen = new Pen(Color.FromArgb(255, 251, 191, 36), 5f)) {
                    g.DrawEllipse(threadPen, cx - 70, cy - 70, 140, 140);
                    g.DrawEllipse(threadPen, cx - 45, cy - 45, 90, 90);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 5. 战术技能芯片 (icon_chip.png) - 替换 💾
    public static void GenerateIconChip(string dst) {
        int S = 512;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                int cx = S / 2, cy = S / 2;

                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 230, cy - 230, 460, 460);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(170, 168, 85, 247);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                Rectangle chipR = new Rectangle(cx - 130, cy - 130, 260, 260);
                using (LinearGradientBrush cB = new LinearGradientBrush(
                    new Point(cx - 130, cy - 130), new Point(cx + 130, cy + 130),
                    Color.FromArgb(255, 88, 28, 135), Color.FromArgb(255, 15, 23, 42))) {
                    using (GraphicsPath cp = CreateRoundedRect(chipR, 24)) {
                        g.FillPath(cB, cp);
                    }
                }
                using (Pen cPen = new Pen(Color.FromArgb(255, 192, 132, 252), 6f)) {
                    using (GraphicsPath cp = CreateRoundedRect(chipR, 24)) {
                        g.DrawPath(cPen, cp);
                    }
                }

                // 金色芯片电路引脚
                using (SolidBrush pinB = new SolidBrush(Color.FromArgb(255, 254, 240, 138))) {
                    for (int i = cx - 80; i <= cx + 80; i += 40) {
                        g.FillRectangle(pinB, i - 6, cy - 150, 12, 22);
                        g.FillRectangle(pinB, i - 6, cy + 128, 12, 22);
                        g.FillRectangle(pinB, cx - 150, i - 6, 22, 12);
                        g.FillRectangle(pinB, cx + 128, i - 6, 22, 12);
                    }
                }

                // 核心量子徽标
                using (SolidBrush centerB = new SolidBrush(Color.FromArgb(255, 255, 255, 255))) {
                    g.FillEllipse(centerB, cx - 40, cy - 40, 80, 80);
                }
                using (Pen busPen = new Pen(Color.FromArgb(255, 192, 132, 252), 4f)) {
                    g.DrawLine(busPen, cx - 80, cy, cx + 80, cy);
                    g.DrawLine(busPen, cx, cy - 80, cx, cy + 80);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 6. 基因/伙伴核心碎片 (icon_shard.png) - 替换 🧬
    public static void GenerateIconShard(string dst) {
        int S = 512;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                int cx = S / 2, cy = S / 2;

                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 230, cy - 230, 460, 460);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(170, 244, 63, 94);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // 双螺旋生化核心 DNA 胶囊
                GraphicsState st = g.Save();
                g.TranslateTransform(cx, cy);
                g.RotateTransform(-35f);

                using (Pen helixPen1 = new Pen(Color.FromArgb(255, 244, 63, 94), 14f)) {
                    helixPen1.StartCap = LineCap.Round; helixPen1.EndCap = LineCap.Round;
                    g.DrawBezier(helixPen1, new Point(-60, -180), new Point(60, -90), new Point(-60, 90), new Point(60, 180));
                }
                using (Pen helixPen2 = new Pen(Color.FromArgb(255, 56, 189, 248), 14f)) {
                    helixPen2.StartCap = LineCap.Round; helixPen2.EndCap = LineCap.Round;
                    g.DrawBezier(helixPen2, new Point(60, -180), new Point(-60, -90), new Point(60, 90), new Point(-60, 180));
                }

                // 梯级碱基连接横杆
                using (Pen rPen = new Pen(Color.FromArgb(255, 255, 255, 255), 6f)) {
                    g.DrawLine(rPen, -40, -135, 40, -135);
                    g.DrawLine(rPen, -10, -45, 10, -45);
                    g.DrawLine(rPen, -10, 45, 10, 45);
                    g.DrawLine(rPen, -40, 135, 40, 135);
                }

                g.Restore(st);
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 7. 指挥官特级军衔勋章 (icon_rank.png) - 替换 🏅 / 🎖️
    public static void GenerateIconRank(string dst) {
        int S = 512;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                int cx = S / 2, cy = S / 2;

                // 勋章带
                Point[] ribbonPts = new Point[] {
                    new Point(cx - 80, cy - 210), new Point(cx + 80, cy - 210),
                    new Point(cx + 60, cy - 60), new Point(cx, cy - 20),
                    new Point(cx - 60, cy - 60)
                };
                using (LinearGradientBrush rB = new LinearGradientBrush(
                    new Point(cx - 80, cy - 210), new Point(cx + 80, cy - 210),
                    Color.FromArgb(255, 220, 38, 38), Color.FromArgb(255, 30, 58, 138))) {
                    g.FillPolygon(rB, ribbonPts);
                }
                using (Pen rPen = new Pen(Color.FromArgb(255, 251, 191, 36), 5f)) {
                    g.DrawPolygon(rPen, ribbonPts);
                }

                // 金色大勋章圆盘
                int medalR = 135;
                using (LinearGradientBrush mB = new LinearGradientBrush(
                    new Point(cx - medalR, cy + 40 - medalR), new Point(cx + medalR, cy + 40 + medalR),
                    Color.FromArgb(255, 254, 240, 138), Color.FromArgb(255, 217, 119, 6))) {
                    g.FillEllipse(mB, cx - medalR, cy + 40 - medalR, medalR * 2, medalR * 2);
                }
                using (Pen mPen = new Pen(Color.FromArgb(255, 255, 255, 255), 7f)) {
                    g.DrawEllipse(mPen, cx - medalR, cy + 40 - medalR, medalR * 2, medalR * 2);
                }

                // 勋章中心五角星
                int sp = 5;
                PointF[] starPts = new PointF[sp * 2];
                for (int i = 0; i < sp * 2; i++) {
                    double angle = i * Math.PI / sp - Math.PI / 2;
                    double r = (i % 2 == 0) ? 80 : 32;
                    starPts[i] = new PointF((float)(cx + Math.Cos(angle) * r), (float)(cy + 40 + Math.Sin(angle) * r));
                }
                using (SolidBrush sB = new SolidBrush(Color.FromArgb(255, 255, 255, 255))) {
                    g.FillPolygon(sB, starPts);
                }
                using (Pen spPen = new Pen(Color.FromArgb(255, 180, 83, 9), 4f)) {
                    g.DrawPolygon(spPen, starPts);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 8. 要塞核心生命 (icon_hp.png) - 替换 ❤️
    public static void GenerateIconHp(string dst) {
        int S = 512;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                int cx = S / 2, cy = S / 2;

                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 230, cy - 230, 460, 460);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(170, 239, 68, 68);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // 科幻装甲心形
                GraphicsPath heartP = new GraphicsPath();
                heartP.AddBezier(cx, cy - 90, cx - 140, cy - 200, cx - 210, cy - 50, cx, cy + 180);
                heartP.AddBezier(cx, cy + 180, cx + 210, cy - 50, cx + 140, cy - 200, cx, cy - 90);
                heartP.CloseFigure();

                using (LinearGradientBrush hB = new LinearGradientBrush(
                    new Point(0, cy - 180), new Point(0, cy + 180),
                    Color.FromArgb(255, 248, 113, 113), Color.FromArgb(255, 185, 28, 28))) {
                    g.FillPath(hB, heartP);
                }
                using (Pen hPen = new Pen(Color.FromArgb(255, 255, 255, 255), 7f)) {
                    g.DrawPath(hPen, heartP);
                }

                // 心脏中心脉冲 ECG 电路
                Point[] ecgPts = new Point[] {
                    new Point(cx - 120, cy - 10), new Point(cx - 40, cy - 10),
                    new Point(cx - 20, cy - 70), new Point(cx + 10, cy + 50),
                    new Point(cx + 30, cy - 30), new Point(cx + 50, cy - 10),
                    new Point(cx + 120, cy - 10)
                };
                using (Pen ecgPen = new Pen(Color.FromArgb(255, 255, 255, 255), 8f)) {
                    ecgPen.StartCap = LineCap.Round; ecgPen.EndCap = LineCap.Round;
                    g.DrawLines(ecgPen, ecgPts);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 9. 能量护盾 (icon_shield.png) - 替换 🛡️
    public static void GenerateIconShield(string dst) {
        int S = 512;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                int cx = S / 2, cy = S / 2;

                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 230, cy - 230, 460, 460);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(170, 56, 189, 248);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                Point[] shieldPts = new Point[] {
                    new Point(cx, cy - 190), new Point(cx + 160, cy - 120),
                    new Point(cx + 130, cy + 90), new Point(cx, cy + 200),
                    new Point(cx - 130, cy + 90), new Point(cx - 160, cy - 120)
                };
                using (LinearGradientBrush sB = new LinearGradientBrush(
                    new Point(0, cy - 190), new Point(0, cy + 200),
                    Color.FromArgb(255, 56, 189, 248), Color.FromArgb(255, 2, 132, 199))) {
                    g.FillPolygon(sB, shieldPts);
                }
                using (Pen sPen = new Pen(Color.FromArgb(255, 255, 255, 255), 7f)) {
                    g.DrawPolygon(sPen, shieldPts);
                }

                // 护盾内环
                Point[] innerPts = new Point[] {
                    new Point(cx, cy - 140), new Point(cx + 110, cy - 90),
                    new Point(cx + 90, cy + 60), new Point(cx, cy + 140),
                    new Point(cx - 90, cy + 60), new Point(cx - 110, cy - 90)
                };
                using (SolidBrush inB = new SolidBrush(Color.FromArgb(140, 255, 255, 255))) {
                    g.FillPolygon(inB, innerPts);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 10. 等级/战斗勋标 (icon_level.png) - 替换 ⚔️
    public static void GenerateIconLevel(string dst) {
        int S = 512;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                int cx = S / 2, cy = S / 2;

                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 230, cy - 230, 460, 460);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(170, 0, 240, 255);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // 双剑交叉 (Sword 1: -45 deg, Sword 2: +45 deg)
                float[] angles = new float[] { -45f, 45f };
                foreach (float ang in angles) {
                    GraphicsState st = g.Save();
                    g.TranslateTransform(cx, cy);
                    g.RotateTransform(ang);

                    // 剑身
                    Point[] bladePts = new Point[] {
                        new Point(0, -210), new Point(22, -160),
                        new Point(18, 110), new Point(-18, 110),
                        new Point(-22, -160)
                    };
                    using (LinearGradientBrush bB = new LinearGradientBrush(
                        new Point(-22, 0), new Point(22, 0),
                        Color.FromArgb(255, 255, 255, 255), Color.FromArgb(255, 0, 240, 255))) {
                        g.FillPolygon(bB, bladePts);
                    }
                    using (Pen bPen = new Pen(Color.FromArgb(255, 255, 255, 255), 4f)) {
                        g.DrawPolygon(bPen, bladePts);
                    }

                    // 剑格
                    using (SolidBrush guardB = new SolidBrush(Color.FromArgb(255, 251, 191, 36))) {
                        g.FillRectangle(guardB, -45, 110, 90, 18);
                        g.FillRectangle(guardB, -12, 128, 24, 60);
                        g.FillEllipse(guardB, -20, 188, 40, 40);
                    }

                    g.Restore(st);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 11. 击杀/首领骷髅徽标 (icon_skull.png) - 替换 💀 / ☠️
    public static void GenerateIconSkull(string dst, bool isBoss = false) {
        int S = 512;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                int cx = S / 2, cy = S / 2 - 10;
                Color glow = isBoss ? Color.FromArgb(255, 42, 95) : Color.FromArgb(148, 163, 184);

                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 230, cy - 230, 460, 460);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(170, glow.R, glow.G, glow.B);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // 骷髅头部大圆角
                Rectangle headR = new Rectangle(cx - 150, cy - 160, 300, 240);
                using (LinearGradientBrush hB = new LinearGradientBrush(
                    new Point(0, cy - 160), new Point(0, cy + 80),
                    isBoss ? Color.FromArgb(255, 254, 205, 211) : Color.FromArgb(255, 241, 245, 249),
                    isBoss ? Color.FromArgb(255, 225, 29, 72) : Color.FromArgb(255, 71, 85, 105))) {
                    using (GraphicsPath hp = CreateRoundedRect(headR, 60)) {
                        g.FillPath(hB, hp);
                    }
                }
                using (Pen hPen = new Pen(Color.FromArgb(255, 255, 255, 255), 7f)) {
                    using (GraphicsPath hp = CreateRoundedRect(headR, 60)) {
                        g.DrawPath(hPen, hp);
                    }
                }

                // 骷髅下颚
                Rectangle jawR = new Rectangle(cx - 85, cy + 50, 170, 120);
                using (SolidBrush jawB = new SolidBrush(isBoss ? Color.FromArgb(255, 159, 18, 57) : Color.FromArgb(255, 51, 65, 85))) {
                    using (GraphicsPath jp = CreateRoundedRect(jawR, 20)) {
                        g.FillPath(jawB, jp);
                    }
                }
                using (Pen jPen = new Pen(Color.FromArgb(255, 255, 255, 255), 6f)) {
                    using (GraphicsPath jp = CreateRoundedRect(jawR, 20)) {
                        g.DrawPath(jPen, jp);
                    }
                }

                // 空洞眼窝
                using (SolidBrush eyeB = new SolidBrush(Color.FromArgb(255, 15, 23, 42))) {
                    g.FillEllipse(eyeB, cx - 105, cy - 50, 75, 95);
                    g.FillEllipse(eyeB, cx + 30, cy - 50, 75, 95);
                    // 鼻腔
                    g.FillPolygon(eyeB, new Point[] { new Point(cx, cy + 30), new Point(cx + 20, cy + 70), new Point(cx - 20, cy + 70) });
                }

                // 牙齿分隔线
                using (Pen toothPen = new Pen(Color.FromArgb(255, 255, 255, 255), 6f)) {
                    for (int tx = cx - 50; tx <= cx + 50; tx += 25) {
                        g.DrawLine(toothPen, tx, cy + 90, tx, cy + 155);
                    }
                }

                // 若是 Boss，顶部加恶魔王冠角
                if (isBoss) {
                    Point[] crownPts = new Point[] {
                        new Point(cx - 120, cy - 150), new Point(cx - 150, cy - 240),
                        new Point(cx - 60, cy - 180), new Point(cx, cy - 260),
                        new Point(cx + 60, cy - 180), new Point(cx + 150, cy - 240),
                        new Point(cx + 120, cy - 150)
                    };
                    using (SolidBrush cB = new SolidBrush(Color.FromArgb(255, 251, 191, 36))) {
                        g.FillPolygon(cB, crownPts);
                    }
                    using (Pen cPen = new Pen(Color.FromArgb(255, 255, 255, 255), 5f)) {
                        g.DrawPolygon(cPen, crownPts);
                    }
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 12. 战术重抽骰子 (icon_reroll.png) - 替换 🎲
    public static void GenerateIconReroll(string dst) {
        int S = 512;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                int cx = S / 2, cy = S / 2;

                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 230, cy - 230, 460, 460);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(170, 0, 240, 255);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // 等轴 3D 量子骰子 (顶面、左面、右面)
                Point[] topFace = new Point[] { new Point(cx, cy - 160), new Point(cx + 150, cy - 80), new Point(cx, cy), new Point(cx - 150, cy - 80) };
                Point[] leftFace = new Point[] { new Point(cx - 150, cy - 80), new Point(cx, cy), new Point(cx, cy + 170), new Point(cx - 150, cy + 90) };
                Point[] rightFace = new Point[] { new Point(cx + 150, cy - 80), new Point(cx, cy), new Point(cx, cy + 170), new Point(cx + 150, cy + 90) };

                using (SolidBrush bTop = new SolidBrush(Color.FromArgb(255, 56, 189, 248))) g.FillPolygon(bTop, topFace);
                using (SolidBrush bLeft = new SolidBrush(Color.FromArgb(255, 2, 132, 199))) g.FillPolygon(bLeft, leftFace);
                using (SolidBrush bRight = new SolidBrush(Color.FromArgb(255, 3, 105, 161))) g.FillPolygon(bRight, rightFace);

                using (Pen edgePen = new Pen(Color.FromArgb(255, 255, 255, 255), 7f)) {
                    g.DrawPolygon(edgePen, topFace);
                    g.DrawPolygon(edgePen, leftFace);
                    g.DrawPolygon(edgePen, rightFace);
                }

                // 顶差点数 (3 点)
                using (SolidBrush dotB = new SolidBrush(Color.FromArgb(255, 255, 255, 255))) {
                    g.FillEllipse(dotB, cx - 18, cy - 98, 36, 36);
                    g.FillEllipse(dotB, cx - 75, cy - 128, 36, 36);
                    g.FillEllipse(dotB, cx + 40, cy - 68, 36, 36);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 13. 系统齿轮 (icon_settings.png) - 替换 ⚙️
    public static void GenerateIconSettings(string dst) {
        int S = 512;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                int cx = S / 2, cy = S / 2;

                using (GraphicsPath p = new GraphicsPath()) {
                    p.AddEllipse(cx - 230, cy - 230, 460, 460);
                    using (PathGradientBrush pgb = new PathGradientBrush(p)) {
                        pgb.CenterColor = Color.FromArgb(170, 0, 240, 255);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, p);
                    }
                }

                // 8 齿精密齿轮
                int numTeeth = 8;
                GraphicsPath gearP = new GraphicsPath();
                for (int i = 0; i < numTeeth; i++) {
                    double a1 = (i * 360.0 / numTeeth - 12) * Math.PI / 180.0;
                    double a2 = (i * 360.0 / numTeeth - 6) * Math.PI / 180.0;
                    double a3 = (i * 360.0 / numTeeth + 6) * Math.PI / 180.0;
                    double a4 = (i * 360.0 / numTeeth + 12) * Math.PI / 180.0;

                    int rInner = 140, rOuter = 190;
                    if (i == 0) gearP.AddLine((float)(cx + Math.Cos(a1) * rInner), (float)(cy + Math.Sin(a1) * rInner), (float)(cx + Math.Cos(a2) * rOuter), (float)(cy + Math.Sin(a2) * rOuter));
                    else gearP.AddLine((float)(cx + Math.Cos(a1) * rInner), (float)(cy + Math.Sin(a1) * rInner), (float)(cx + Math.Cos(a2) * rOuter), (float)(cy + Math.Sin(a2) * rOuter));
                    gearP.AddLine((float)(cx + Math.Cos(a2) * rOuter), (float)(cy + Math.Sin(a2) * rOuter), (float)(cx + Math.Cos(a3) * rOuter), (float)(cy + Math.Sin(a3) * rOuter));
                    gearP.AddLine((float)(cx + Math.Cos(a3) * rOuter), (float)(cy + Math.Sin(a3) * rOuter), (float)(cx + Math.Cos(a4) * rInner), (float)(cy + Math.Sin(a4) * rInner));
                }
                gearP.CloseFigure();

                using (LinearGradientBrush gB = new LinearGradientBrush(
                    new Point(cx - 190, cy - 190), new Point(cx + 190, cy + 190),
                    Color.FromArgb(255, 148, 163, 184), Color.FromArgb(255, 30, 41, 59))) {
                    g.FillPath(gB, gearP);
                }
                using (Pen gPen = new Pen(Color.FromArgb(255, 255, 255, 255), 7f)) {
                    g.DrawPath(gPen, gearP);
                }

                // 中心空心轴承
                using (SolidBrush cB = new SolidBrush(Color.FromArgb(255, 15, 23, 42))) {
                    g.FillEllipse(cB, cx - 65, cy - 65, 130, 130);
                }
                using (Pen cPen = new Pen(Color.FromArgb(255, 0, 240, 255), 6f)) {
                    g.DrawEllipse(cPen, cx - 65, cy - 65, 130, 130);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }
}