Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class HighEndIconRenderer {
    // 渲染高阶赛博朋克量子战术骰子 (1024x1024)
    public static void RenderQuantumDice(string dst) {
        int S = 1024;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.HighQuality;
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.CompositingQuality = CompositingQuality.HighQuality;
                g.Clear(Color.FromArgb(0, 0, 0, 0));

                int cx = S / 2, cy = S / 2;

                // 1. 背后深邃青蓝/深紫量子能量辉光星云
                using (GraphicsPath glowPath = new GraphicsPath()) {
                    glowPath.AddEllipse(cx - 360, cy - 360, 720, 720);
                    using (PathGradientBrush pgb = new PathGradientBrush(glowPath)) {
                        pgb.CenterColor = Color.FromArgb(140, 6, 182, 212);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, glowPath);
                    }
                }
                using (GraphicsPath glowPath2 = new GraphicsPath()) {
                    glowPath2.AddEllipse(cx - 200, cy - 200, 400, 400);
                    using (PathGradientBrush pgb2 = new PathGradientBrush(glowPath2)) {
                        pgb2.CenterColor = Color.FromArgb(180, 147, 51, 234);
                        pgb2.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb2, glowPath2);
                    }
                }

                // 2. 3D 等轴骰子六面体三可见面顶点定义 (立体倾斜透视)
                int r = 240;
                float angle30 = (float)(Math.PI / 6);
                float cos30 = (float)Math.Cos(angle30);
                float sin30 = (float)Math.Sin(angle30);

                PointF topCenter = new PointF(cx, cy - 20);
                PointF topN = new PointF(cx, cy - 20 - r);
                PointF topE = new PointF(cx + r * cos30, cy - 20 - r * sin30);
                PointF topW = new PointF(cx - r * cos30, cy - 20 - r * sin30);

                PointF botCenter = new PointF(cx, cy - 20 + r);
                PointF botE = new PointF(cx + r * cos30, cy - 20 + r * (1 - sin30));
                PointF botW = new PointF(cx - r * cos30, cy - 20 + r * (1 - sin30));

                PointF[] topFace = new PointF[] { topCenter, topE, topN, topW };
                PointF[] leftFace = new PointF[] { topCenter, topW, botW, botCenter };
                PointF[] rightFace = new PointF[] { topCenter, topE, botE, botCenter };

                // 3. 填充暗黑钛金碳纤维基底与半透烟熏水晶质感
                using (LinearGradientBrush bTop = new LinearGradientBrush(topN, topCenter, Color.FromArgb(255, 30, 41, 59), Color.FromArgb(255, 15, 23, 42))) {
                    g.FillPolygon(bTop, topFace);
                }
                using (LinearGradientBrush bLeft = new LinearGradientBrush(topW, botCenter, Color.FromArgb(255, 15, 23, 42), Color.FromArgb(255, 2, 6, 23))) {
                    g.FillPolygon(bLeft, leftFace);
                }
                using (LinearGradientBrush bRight = new LinearGradientBrush(topE, botCenter, Color.FromArgb(255, 20, 30, 48), Color.FromArgb(255, 10, 15, 30))) {
                    g.FillPolygon(bRight, rightFace);
                }

                // 4. 表面微观科技纹理与高光倒角镶边 (Titanium Bevel)
                using (Pen bevelPen = new Pen(Color.FromArgb(200, 56, 189, 248), 12f)) {
                    bevelPen.LineJoin = LineJoin.Round;
                    g.DrawPolygon(bevelPen, topFace);
                    g.DrawPolygon(bevelPen, leftFace);
                    g.DrawPolygon(bevelPen, rightFace);
                }
                using (Pen innerPen = new Pen(Color.FromArgb(255, 255, 255, 255), 4f)) {
                    innerPen.LineJoin = LineJoin.Round;
                    g.DrawPolygon(innerPen, topFace);
                    g.DrawPolygon(innerPen, leftFace);
                    g.DrawPolygon(innerPen, rightFace);
                }

                // 5. 顶面量子能量点数 (3 点，沿对角线排列)
                Action<PointF, float> drawQuantumPip = (center, radius) => {
                    // 外发光
                    using (GraphicsPath gp = new GraphicsPath()) {
                        gp.AddEllipse(center.X - radius * 2.2f, center.Y - radius * 1.5f, radius * 4.4f, radius * 3f);
                        using (PathGradientBrush pgb = new PathGradientBrush(gp)) {
                            pgb.CenterColor = Color.FromArgb(200, 34, 211, 238);
                            pgb.SurroundColors = new Color[] { Color.Transparent };
                            g.FillPath(pgb, gp);
                        }
                    }
                    // 内核心发光点
                    using (LinearGradientBrush pBrush = new LinearGradientBrush(
                        new PointF(center.X, center.Y - radius), new PointF(center.X, center.Y + radius),
                        Color.FromArgb(255, 255, 255, 255), Color.FromArgb(255, 6, 182, 212))) {
                        g.FillEllipse(pBrush, center.X - radius, center.Y - radius * 0.7f, radius * 2, radius * 1.4f);
                    }
                    using (Pen pPen = new Pen(Color.FromArgb(255, 255, 255, 255), 2.5f)) {
                        g.DrawEllipse(pPen, center.X - radius, center.Y - radius * 0.7f, radius * 2, radius * 1.4f);
                    }
                };

                // 顶面点数
                drawQuantumPip(new PointF(cx, cy - 140), 22f);
                drawQuantumPip(new PointF(cx - 95, cy - 85), 20f);
                drawQuantumPip(new PointF(cx + 95, cy - 195), 20f);

                // 左侧面点数 (5 点，菱形排列)
                Action<PointF, float> drawLeftPip = (center, radius) => {
                    using (GraphicsPath gp = new GraphicsPath()) {
                        gp.AddEllipse(center.X - radius * 1.8f, center.Y - radius * 2.2f, radius * 3.6f, radius * 4.4f);
                        using (PathGradientBrush pgb = new PathGradientBrush(gp)) {
                            pgb.CenterColor = Color.FromArgb(180, 56, 189, 248);
                            pgb.SurroundColors = new Color[] { Color.Transparent };
                            g.FillPath(pgb, gp);
                        }
                    }
                    using (LinearGradientBrush pBrush = new LinearGradientBrush(
                        new PointF(center.X - radius, center.Y), new PointF(center.X + radius, center.Y),
                        Color.FromArgb(255, 255, 255, 255), Color.FromArgb(255, 14, 165, 233))) {
                        g.FillEllipse(pBrush, center.X - radius * 0.7f, center.Y - radius, radius * 1.4f, radius * 2);
                    }
                    using (Pen pPen = new Pen(Color.FromArgb(255, 255, 255, 255), 2.5f)) {
                        g.DrawEllipse(pPen, center.X - radius * 0.7f, center.Y - radius, radius * 1.4f, radius * 2);
                    }
                };

                float lcx = (topCenter.X + topW.X + botW.X + botCenter.X) / 4f;
                float lcy = (topCenter.Y + topW.Y + botW.Y + botCenter.Y) / 4f;
                drawLeftPip(new PointF(lcx, lcy), 20f);
                drawLeftPip(new PointF(lcx - 65, lcy - 45), 18f);
                drawLeftPip(new PointF(lcx + 65, lcy + 45), 18f);
                drawLeftPip(new PointF(lcx - 65, lcy + 45), 18f);
                drawLeftPip(new PointF(lcx + 65, lcy - 45), 18f);

                // 右侧面点数 (4 点)
                float rcx = (topCenter.X + topE.X + botE.X + botCenter.X) / 4f;
                float rcy = (topCenter.Y + topE.Y + botE.Y + botCenter.Y) / 4f;
                drawLeftPip(new PointF(rcx - 60, rcy - 40), 18f);
                drawLeftPip(new PointF(rcx + 60, rcy + 40), 18f);
                drawLeftPip(new PointF(rcx - 60, rcy + 40), 18f);
                drawLeftPip(new PointF(rcx + 60, rcy - 40), 18f);

                // 6. 外围环绕的动感量子回旋光弧 (Reroll Motion Trails)
                using (Pen arcPen1 = new Pen(Color.FromArgb(160, 34, 211, 238), 6f)) {
                    arcPen1.DashPattern = new float[] { 8f, 6f, 2f, 6f };
                    g.DrawArc(arcPen1, cx - 380, cy - 380, 760, 760, -40, 160);
                }
                using (Pen arcPen2 = new Pen(Color.FromArgb(160, 244, 63, 94), 6f)) {
                    arcPen2.DashPattern = new float[] { 8f, 6f, 2f, 6f };
                    g.DrawArc(arcPen2, cx - 360, cy - 360, 720, 720, 140, 160);
                }
            }

            // Downscale to 512x512
            using (Bitmap outBmp = new Bitmap(512, 512, PixelFormat.Format32bppArgb)) {
                using (Graphics gOut = Graphics.FromImage(outBmp)) {
                    gOut.SmoothingMode = SmoothingMode.HighQuality;
                    gOut.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    gOut.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    gOut.CompositingQuality = CompositingQuality.HighQuality;
                    gOut.Clear(Color.Transparent);
                    gOut.DrawImage(bmp, new Rectangle(0, 0, 512, 512));
                }
                outBmp.Save(dst, ImageFormat.Png);
                Console.WriteLine("Rendered Quantum Dice: " + dst);
            }
        }
    }

    // 渲染航天级钛合金精密齿轮 (1024x1024)
    public static void RenderPrecisionTitaniumGear(string dst) {
        int S = 1024;
        using (Bitmap bmp = new Bitmap(S, S, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.HighQuality;
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.CompositingQuality = CompositingQuality.HighQuality;
                g.Clear(Color.FromArgb(0, 0, 0, 0));

                int cx = S / 2, cy = S / 2;

                // 1. 核心青蓝核聚变辉光
                using (GraphicsPath glowPath = new GraphicsPath()) {
                    glowPath.AddEllipse(cx - 380, cy - 380, 760, 760);
                    using (PathGradientBrush pgb = new PathGradientBrush(glowPath)) {
                        pgb.CenterColor = Color.FromArgb(120, 14, 165, 233);
                        pgb.SurroundColors = new Color[] { Color.Transparent };
                        g.FillPath(pgb, glowPath);
                    }
                }

                // 2. 8齿航天重工外齿轮几何轮廓
                int teeth = 8;
                float rOuter = 420f;
                float rInner = 330f;
                GraphicsPath gearPath = new GraphicsPath();

                for (int i = 0; i < teeth; i++) {
                    double baseAngle = i * (360.0 / teeth);
                    double a0 = (baseAngle - 13.0) * Math.PI / 180.0;
                    double a1 = (baseAngle - 7.0) * Math.PI / 180.0;
                    double a2 = (baseAngle + 7.0) * Math.PI / 180.0;
                    double a3 = (baseAngle + 13.0) * Math.PI / 180.0;

                    PointF p0 = new PointF((float)(cx + Math.Cos(a0) * rInner), (float)(cy + Math.Sin(a0) * rInner));
                    PointF p1 = new PointF((float)(cx + Math.Cos(a1) * rOuter), (float)(cy + Math.Sin(a1) * rOuter));
                    PointF p2 = new PointF((float)(cx + Math.Cos(a2) * rOuter), (float)(cy + Math.Sin(a2) * rOuter));
                    PointF p3 = new PointF((float)(cx + Math.Cos(a3) * rInner), (float)(cy + Math.Sin(a3) * rInner));

                    if (i == 0) gearPath.AddLine(p0, p1);
                    else gearPath.AddLine(p0, p1);
                    gearPath.AddLine(p1, p2);
                    gearPath.AddLine(p2, p3);

                    // 齿间圆弧凹槽
                    double nextBaseAngle = (i + 1) * (360.0 / teeth);
                    double a4 = (nextBaseAngle - 13.0) * Math.PI / 180.0;
                    PointF p4 = new PointF((float)(cx + Math.Cos(a4) * rInner), (float)(cy + Math.Sin(a4) * rInner));
                    gearPath.AddLine(p3, p4);
                }
                gearPath.CloseFigure();

                // 3. 齿轮拉丝陨铁金属反光质感填充
                using (LinearGradientBrush gBrush = new LinearGradientBrush(
                    new Point(cx - 300, cy - 400), new Point(cx + 300, cy + 400),
                    Color.FromArgb(255, 148, 163, 184), Color.FromArgb(255, 30, 41, 59))) {
                    g.FillPath(gBrush, gearPath);
                }

                // 边缘高光钛金倒角
                using (Pen bevelPen = new Pen(Color.FromArgb(255, 226, 232, 240), 10f)) {
                    bevelPen.LineJoin = LineJoin.Round;
                    g.DrawPath(bevelPen, gearPath);
                }
                using (Pen darkPen = new Pen(Color.FromArgb(180, 15, 23, 42), 4f)) {
                    g.DrawPath(darkPen, gearPath);
                }

                // 4. 次级金色合金加固轮环 (Secondary Brass Ring)
                int rRingOuter = 310;
                int rRingInner = 240;
                using (GraphicsPath ringP = new GraphicsPath()) {
                    ringP.AddEllipse(cx - rRingOuter, cy - rRingOuter, rRingOuter * 2, rRingOuter * 2);
                    ringP.AddEllipse(cx - rRingInner, cy - rRingInner, rRingInner * 2, rRingInner * 2);
                    using (LinearGradientBrush ringB = new LinearGradientBrush(
                        new Point(cx - rRingOuter, cy - rRingOuter), new Point(cx + rRingOuter, cy + rRingOuter),
                        Color.FromArgb(255, 245, 158, 11), Color.FromArgb(255, 180, 83, 9))) {
                        g.FillPath(ringB, ringP);
                    }
                    using (Pen ringPen = new Pen(Color.FromArgb(255, 254, 240, 138), 6f)) {
                        g.DrawEllipse(ringPen, cx - rRingOuter, cy - rRingOuter, rRingOuter * 2, rRingOuter * 2);
                        g.DrawEllipse(ringPen, cx - rRingInner, cy - rRingInner, rRingInner * 2, rRingInner * 2);
                    }
                }

                // 5. 8 颗六角强化钛金螺栓
                for (int i = 0; i < 8; i++) {
                    double bAngle = (i * 45.0 + 22.5) * Math.PI / 180.0;
                    float bx = (float)(cx + Math.Cos(bAngle) * 275f);
                    float by = (float)(cy + Math.Sin(bAngle) * 275f);

                    PointF[] hexPts = new PointF[6];
                    for (int h = 0; h < 6; h++) {
                        double ha = h * 60.0 * Math.PI / 180.0;
                        hexPts[h] = new PointF((float)(bx + Math.Cos(ha) * 20f), (float)(by + Math.Sin(ha) * 20f));
                    }
                    using (SolidBrush hexB = new SolidBrush(Color.FromArgb(255, 203, 213, 225))) g.FillPolygon(hexB, hexPts);
                    using (Pen hexPen = new Pen(Color.FromArgb(255, 30, 41, 59), 3f)) g.DrawPolygon(hexPen, hexPts);
                    using (SolidBrush innerHexB = new SolidBrush(Color.FromArgb(255, 15, 23, 42))) {
                        g.FillEllipse(innerHexB, bx - 6, by - 6, 12, 12);
                    }
                }

                // 6. 中央核能等离子反应堆轴承 (Reactor Core Axis)
                int rCore = 210;
                using (GraphicsPath coreP = new GraphicsPath()) {
                    coreP.AddEllipse(cx - rCore, cy - rCore, rCore * 2, rCore * 2);
                    using (PathGradientBrush cPgb = new PathGradientBrush(coreP)) {
                        cPgb.CenterColor = Color.FromArgb(255, 6, 182, 212);
                        cPgb.SurroundColors = new Color[] { Color.FromArgb(255, 15, 23, 42) };
                        g.FillPath(cPgb, coreP);
                    }
                    using (Pen corePen = new Pen(Color.FromArgb(255, 34, 211, 238), 8f)) {
                        g.DrawEllipse(corePen, cx - rCore, cy - rCore, rCore * 2, rCore * 2);
                    }
                }

                // 中心三叶能量涡轮叶片
                for (int t = 0; t < 3; t++) {
                    GraphicsState gs = g.Save();
                    g.TranslateTransform(cx, cy);
                    g.RotateTransform(t * 120f);

                    GraphicsPath bladeP = new GraphicsPath();
                    bladeP.AddCurve(new PointF[] {
                        new PointF(0, 0),
                        new PointF(35, -70),
                        new PointF(15, -160),
                        new PointF(-15, -160),
                        new PointF(-35, -70),
                        new PointF(0, 0)
                    });
                    using (LinearGradientBrush bBrush = new LinearGradientBrush(
                        new PointF(0, 0), new PointF(0, -160),
                        Color.FromArgb(255, 255, 255, 255), Color.FromArgb(255, 2, 132, 199))) {
                        g.FillPath(bBrush, bladeP);
                    }
                    using (Pen bPen = new Pen(Color.FromArgb(255, 186, 230, 253), 4f)) {
                        g.DrawPath(bPen, bladeP);
                    }
                    g.Restore(gs);
                }

                // 中心光芒核心
                using (SolidBrush whiteB = new SolidBrush(Color.FromArgb(255, 255, 255, 255))) {
                    g.FillEllipse(whiteB, cx - 35, cy - 35, 70, 70);
                }
                using (Pen whitePen = new Pen(Color.FromArgb(255, 56, 189, 248), 6f)) {
                    g.DrawEllipse(whitePen, cx - 35, cy - 35, 70, 70);
                }
            }

            // Downscale to 512x512
            using (Bitmap outBmp = new Bitmap(512, 512, PixelFormat.Format32bppArgb)) {
                using (Graphics gOut = Graphics.FromImage(outBmp)) {
                    gOut.SmoothingMode = SmoothingMode.HighQuality;
                    gOut.InterpolationMode = InterpolationMode.HighQualityBicubic;
                    gOut.PixelOffsetMode = PixelOffsetMode.HighQuality;
                    gOut.CompositingQuality = CompositingQuality.HighQuality;
                    gOut.Clear(Color.Transparent);
                    gOut.DrawImage(bmp, new Rectangle(0, 0, 512, 512));
                }
                outBmp.Save(dst, ImageFormat.Png);
                Console.WriteLine("Rendered Titanium Gear: " + dst);
            }
        }
    }
}
'@
