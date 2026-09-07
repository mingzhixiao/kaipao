Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public class BulletGenerator {
    // 1. 常规等离子高能穿甲弹 (bullet_normal.png: 64x160)
    public static void GenerateNormalBullet(string dst) {
        int w = 64;
        int h = 160;
        using (Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;

                int cx = w / 2;
                int topY = 12;
                int botY = h - 20;

                // 1. Plasma exhaust trail / glow
                using (GraphicsPath trailPath = new GraphicsPath()) {
                    trailPath.AddLine(cx - 10, topY + 40, cx + 10, topY + 40);
                    trailPath.AddLine(cx + 10, topY + 40, cx + 4, botY + 12);
                    trailPath.AddLine(cx + 4, botY + 12, cx - 4, botY + 12);
                    trailPath.CloseFigure();
                    using (LinearGradientBrush tBrush = new LinearGradientBrush(
                        new Point(0, topY + 40), new Point(0, botY + 12),
                        Color.FromArgb(180, 0, 240, 255), Color.Transparent)) {
                        g.FillPath(tBrush, trailPath);
                    }
                }

                // 2. Kinetic AP Fin Blades (Left & Right air foils)
                PointF[] leftFin = new PointF[] {
                    new PointF(cx - 5, topY + 45),
                    new PointF(cx - 18, topY + 75),
                    new PointF(cx - 16, topY + 95),
                    new PointF(cx - 6, topY + 80)
                };
                PointF[] rightFin = new PointF[] {
                    new PointF(cx + 5, topY + 45),
                    new PointF(cx + 18, topY + 75),
                    new PointF(cx + 16, topY + 95),
                    new PointF(cx + 6, topY + 80)
                };
                using (LinearGradientBrush finBrush = new LinearGradientBrush(
                    new Point(cx - 18, 0), new Point(cx + 18, 0),
                    Color.FromArgb(255, 0, 200, 255), Color.FromArgb(255, 0, 100, 180))) {
                    g.FillPolygon(finBrush, leftFin);
                    g.FillPolygon(finBrush, rightFin);
                }

                // 3. Heavy Tungsten AP Bullet Core (Sharp Piercing Arrowhead like icon_pierce)
                PointF[] bulletBody = new PointF[] {
                    new PointF(cx, topY),               // Sharp needle tip
                    new PointF(cx + 11, topY + 38),     // Widest shoulder
                    new PointF(cx + 8, botY),           // Base right
                    new PointF(cx - 8, botY),           // Base left
                    new PointF(cx - 11, topY + 38)      // Left shoulder
                };

                using (LinearGradientBrush bBrush = new LinearGradientBrush(
                    new Point(cx - 11, 0), new Point(cx + 11, 0),
                    Color.FromArgb(255, 230, 250, 255), Color.FromArgb(255, 30, 80, 130))) {
                    g.FillPolygon(bBrush, bulletBody);
                }
                using (Pen bPen = new Pen(Color.FromArgb(255, 140, 235, 255), 1.5f)) {
                    g.DrawPolygon(bPen, bulletBody);
                }

                // 4. Center High-Pressure Energy Core
                PointF[] innerCore = new PointF[] {
                    new PointF(cx, topY + 6),
                    new PointF(cx + 4, topY + 35),
                    new PointF(cx + 3, botY - 8),
                    new PointF(cx - 3, botY - 8),
                    new PointF(cx - 4, topY + 35)
                };
                using (LinearGradientBrush coreBrush = new LinearGradientBrush(
                    new Point(0, topY), new Point(0, botY),
                    Color.White, Color.FromArgb(220, 0, 220, 255))) {
                    g.FillPolygon(coreBrush, innerCore);
                }

                // 5. Piercing Plasma tip glint
                using (SolidBrush tipGlint = new SolidBrush(Color.White)) {
                    g.FillEllipse(tipGlint, cx - 2, topY - 2, 5, 5);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }

    // 2. 致命暴击超导穿甲长矛 (bullet_crit.png: 72x180, 匹配 icon_pierce 的赤金破甲质感)
    public static void GenerateCritBullet(string dst) {
        int w = 72;
        int h = 180;
        using (Bitmap bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;

                int cx = w / 2;
                int topY = 10;
                int botY = h - 22;

                // 1. Fiery Gold/Red Plasma shockwave aura
                using (GraphicsPath auraPath = new GraphicsPath()) {
                    auraPath.AddLine(cx, topY - 6, cx + 18, topY + 45);
                    auraPath.AddLine(cx + 18, topY + 45, cx + 8, botY + 16);
                    auraPath.AddLine(cx + 8, botY + 16, cx - 8, botY + 16);
                    auraPath.AddLine(cx - 8, botY + 16, cx - 18, topY + 45);
                    auraPath.CloseFigure();
                    using (LinearGradientBrush aBrush = new LinearGradientBrush(
                        new Point(0, topY - 6), new Point(0, botY + 16),
                        Color.FromArgb(160, 255, 120, 0), Color.Transparent)) {
                        g.FillPath(aBrush, auraPath);
                    }
                }

                // 2. Aggressive Hyper-Sonic Piercing Flukes (Jagged Barbs like icon_pierce spear)
                PointF[] leftBarb = new PointF[] {
                    new PointF(cx - 7, topY + 40),
                    new PointF(cx - 24, topY + 75),
                    new PointF(cx - 21, topY + 105),
                    new PointF(cx - 8, topY + 85)
                };
                PointF[] rightBarb = new PointF[] {
                    new PointF(cx + 7, topY + 40),
                    new PointF(cx + 24, topY + 75),
                    new PointF(cx + 21, topY + 105),
                    new PointF(cx + 8, topY + 85)
                };
                using (LinearGradientBrush barbBrush = new LinearGradientBrush(
                    new Point(cx - 24, 0), new Point(cx + 24, 0),
                    Color.FromArgb(255, 255, 220, 100), Color.FromArgb(255, 220, 50, 0))) {
                    g.FillPolygon(barbBrush, leftBarb);
                    g.FillPolygon(barbBrush, rightBarb);
                }
                using (Pen barbPen = new Pen(Color.FromArgb(255, 255, 240, 180), 1.5f)) {
                    g.DrawPolygon(barbPen, leftBarb);
                    g.DrawPolygon(barbPen, rightBarb);
                }

                // 3. Super-Heated Alloy Piercing Core
                PointF[] spearCore = new PointF[] {
                    new PointF(cx, topY),               // White needle tip
                    new PointF(cx + 14, topY + 42),     // Flange right
                    new PointF(cx + 9, botY),           // Base right
                    new PointF(cx - 9, botY),           // Base left
                    new PointF(cx - 14, topY + 42)      // Flange left
                };

                using (LinearGradientBrush sBrush = new LinearGradientBrush(
                    new Point(cx - 14, 0), new Point(cx + 14, 0),
                    Color.FromArgb(255, 255, 245, 220), Color.FromArgb(255, 200, 70, 10))) {
                    g.FillPolygon(sBrush, spearCore);
                }
                using (Pen sPen = new Pen(Color.White, 2f)) {
                    g.DrawPolygon(sPen, spearCore);
                }

                // 4. White-Hot Nuclear Laser Spine
                PointF[] spine = new PointF[] {
                    new PointF(cx, topY + 4),
                    new PointF(cx + 5, topY + 40),
                    new PointF(cx + 4, botY - 6),
                    new PointF(cx - 4, botY - 6),
                    new PointF(cx - 5, topY + 40)
                };
                using (LinearGradientBrush spineBrush = new LinearGradientBrush(
                    new Point(0, topY), new Point(0, botY),
                    Color.White, Color.FromArgb(255, 255, 140, 0))) {
                    g.FillPolygon(spineBrush, spine);
                }

                // 5. High-voltage Overload sparks
                using (SolidBrush spark = new SolidBrush(Color.White)) {
                    g.FillEllipse(spark, cx - 4, topY - 3, 8, 8);
                    g.FillEllipse(spark, cx - 18, topY + 70, 5, 5);
                    g.FillEllipse(spark, cx + 14, topY + 70, 5, 5);
                }
            }
            bmp.Save(dst, ImageFormat.Png);
        }
    }
}
"@

$projDir = "D:\test\kaipao\assets\projectiles"
[BulletGenerator]::GenerateNormalBullet("$projDir\bullet_normal.png")
[BulletGenerator]::GenerateCritBullet("$projDir\bullet_crit.png")
Write-Host "New high-definition AP bullets generated successfully!"
