"""
VNFlood thesis system diagrams generator.
Generates PNG images for all architectural and design diagrams in the thesis.
Run from: e:/Dev/vnflood/src/ml2/
"""
import warnings; warnings.filterwarnings("ignore")
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Ellipse, Polygon, FancyArrowPatch, Circle
import numpy as np
from pathlib import Path

OUT = Path("e:/Dev/vnflood/latex/figures")
DPI = 150

# Color palette
CB = "#1565C0"; CG = "#2E7D32"; CO = "#E65100"; CP = "#6A1B9A"
CGR = "#546E7A"; CY = "#F57F17"; CR = "#C62828"; CN = "#263238"
LB = "#BBDEFB"; LG = "#C8E6C9"; LO = "#FFE0B2"; LP = "#E1BEE7"
LGR = "#ECEFF1"; LY = "#FFF9C4"; LR = "#FFCDD2"; LPUR = "#EDE7F6"

plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 9,
                     'axes.spines.top': False, 'axes.spines.right': False,
                     'axes.spines.left': False, 'axes.spines.bottom': False})


# ─── Drawing helpers ──────────────────────────────────────────────────────────

def rbox(ax, cx, cy, w, h, text, fc="white", ec="black", fs=9, fw='normal', lw=1.2, zo=3):
    r = FancyBboxPatch((cx-w/2, cy-h/2), w, h, boxstyle="round,pad=0.06",
                       fc=fc, ec=ec, lw=lw, zorder=zo)
    ax.add_patch(r)
    ax.text(cx, cy, text, ha='center', va='center', fontsize=fs,
            fontweight=fw, zorder=zo+1, multialignment='center')

def hbox(ax, cx, cy, w, h, title, rows, fc_head=LGR, fc_body="white", fs=8, zo=3):
    """Draw a table-style box (ERD entity): header + rows."""
    row_h = h / (1 + len(rows))
    # header
    r = FancyBboxPatch((cx-w/2, cy+h/2-row_h), w, row_h,
                       boxstyle="round,pad=0.04", fc=fc_head, ec="black", lw=1.2, zorder=zo)
    ax.add_patch(r)
    ax.text(cx, cy+h/2-row_h/2, title, ha='center', va='center',
            fontsize=fs, fontweight='bold', zorder=zo+1)
    # body border
    r2 = FancyBboxPatch((cx-w/2, cy-h/2), w, h-row_h,
                        boxstyle="square,pad=0", fc=fc_body, ec="black", lw=1.2, zorder=zo)
    ax.add_patch(r2)
    for i, row in enumerate(rows):
        y = cy + h/2 - row_h*(i+1.5)
        ax.text(cx-w/2+0.1, y, row, ha='left', va='center', fontsize=fs-1, zorder=zo+1)
        if i < len(rows)-1:
            ax.plot([cx-w/2, cx+w/2], [cy+h/2-row_h*(i+2), cy+h/2-row_h*(i+2)],
                    'k-', lw=0.4, alpha=0.4, zorder=zo+1)

def arrow(ax, x1, y1, x2, y2, label="", lc="black", fs=7.5, dashed=False, lw=1.3, lpos='top'):
    ls = (0, (4, 4)) if dashed else '-'
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->', color=lc, lw=lw, linestyle=ls,
                                shrinkA=4, shrinkB=4), zorder=5)
    if label:
        mx, my = (x1+x2)/2, (y1+y2)/2
        vert = abs(y2-y1) > abs(x2-x1)
        if vert:
            ax.text(mx+0.2, my, label, ha='left', va='center', fontsize=fs, color=lc, zorder=6)
        else:
            dy = 0.13 if lpos == 'top' else -0.18
            ax.text(mx, my+dy, label, ha='center',
                    va='bottom' if lpos == 'top' else 'top', fontsize=fs, color=lc, zorder=6)

def curved_arrow(ax, x1, y1, x2, y2, rad=0.3, label="", lc="black", fs=7.5, lw=1.3, dashed=False):
    ls = (0, (4, 4)) if dashed else '-'
    style = f"arc3,rad={rad}"
    ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                arrowprops=dict(arrowstyle='->', color=lc, lw=lw, linestyle=ls,
                                connectionstyle=style, shrinkA=4, shrinkB=4), zorder=5)
    if label:
        ax.text((x1+x2)/2, (y1+y2)/2 + 0.2, label, ha='center', va='bottom', fontsize=fs, color=lc)

def diamond(ax, cx, cy, w, h, text, fc="white", ec="black", fs=8, zo=3):
    pts = np.array([[cx, cy+h/2], [cx+w/2, cy], [cx, cy-h/2], [cx-w/2, cy]])
    ax.add_patch(Polygon(pts, closed=True, fc=fc, ec=ec, lw=1.2, zorder=zo))
    ax.text(cx, cy, text, ha='center', va='center', fontsize=fs, zorder=zo+1, multialignment='center')

def start_node(ax, cx, cy, r=0.18):
    ax.add_patch(Circle((cx, cy), r, fc='black', ec='black', zorder=5))

def end_node(ax, cx, cy, r=0.18):
    ax.add_patch(Circle((cx, cy), r+0.07, fc='white', ec='black', lw=2.0, zorder=5))
    ax.add_patch(Circle((cx, cy), r, fc='black', ec='black', zorder=6))

def actor(ax, cx, cy, label, fs=8.5):
    ax.add_patch(Circle((cx, cy), 0.22, fc='white', ec='black', lw=1.2, zorder=3))
    ax.plot([cx, cx], [cy-0.22, cy-0.72], 'k-', lw=1.2, zorder=3)
    ax.plot([cx-0.28, cx, cx+0.28], [cy-0.42, cy-0.55, cy-0.42], 'k-', lw=1.2, zorder=3)
    ax.plot([cx, cx-0.22], [cy-0.72, cy-1.10], 'k-', lw=1.2, zorder=3)
    ax.plot([cx, cx+0.22], [cy-0.72, cy-1.10], 'k-', lw=1.2, zorder=3)
    ax.text(cx, cy-1.30, label, ha='center', va='top', fontsize=fs,
            multialignment='center', zorder=3)

def usecase_ellipse(ax, cx, cy, w, h, text, fs=8):
    e = Ellipse((cx, cy), w, h, fc="white", ec="black", lw=1.2, zorder=3)
    ax.add_patch(e)
    ax.text(cx, cy, text, ha='center', va='center', fontsize=fs,
            multialignment='center', zorder=4)

def lifeline(ax, xs, y_top, y_bot):
    """Draw sequence diagram lifelines."""
    for x in xs:
        ax.plot([x, x], [y_top, y_bot], 'k:', lw=0.8, zorder=1)

def seq_msg(ax, x1, y, x2, label="", dashed=False, fs=7.5):
    """Draw a sequence diagram message arrow."""
    ls = (0, (4, 3)) if dashed else '-'
    ax.annotate("", xy=(x2, y), xytext=(x1, y),
                arrowprops=dict(arrowstyle='->', color='black', lw=1.2, linestyle=ls,
                                shrinkA=0, shrinkB=0), zorder=4)
    if label:
        mx = (x1+x2)/2
        ax.text(mx, y+0.12, label, ha='center', va='bottom', fontsize=fs, zorder=5)

def seq_selfbox(ax, x, y_top, y_bot, text, fs=7.5, w=1.6):
    ax.add_patch(FancyBboxPatch((x, y_top), w, y_bot-y_top,
                                boxstyle="square,pad=0", fc="white", ec="black", lw=1, zorder=3))
    ax.text(x+w/2, (y_top+y_bot)/2, text, ha='center', va='center', fontsize=fs,
            multialignment='center', zorder=4)


# ─── 1. System Architecture ───────────────────────────────────────────────────

def gen_architecture():
    fig, ax = plt.subplots(figsize=(13, 7))
    ax.set_xlim(-0.5, 13); ax.set_ylim(-4.5, 4)
    ax.set_aspect('equal'); ax.axis('off')
    fig.patch.set_facecolor('white')

    W, H = 3.0, 1.1

    # Nodes
    rbox(ax, 1.5, 0,   W, H, "Ung dung di dong\nReact Native / Expo", fc=LB, ec=CB, fw='bold', fs=8.5)
    rbox(ax, 6.5, 0,   W, H, "Backend API\nNode.js / Express\nCloud Run", fc=LG, ec=CG, fw='bold', fs=8.5)
    rbox(ax, 11, 1.5,  W, H, "Cloud SQL\nPostgreSQL 16", fc=LO, ec=CO, fw='bold', fs=8.5)
    rbox(ax, 11,-1.5,  W, H, "Redis\nMemorystore", fc=LY, ec=CY, fw='bold', fs=8.5)
    rbox(ax, 6.5,-3.2, W, H, "ML Service\nFastAPI / Python\nCloud Run (private)", fc=LP, ec=CP, fw='bold', fs=8.5)
    rbox(ax, 11,-3.2,  W, H, "NASA IMERG\nIBTrACS", fc=LGR, ec=CGR, fs=8.5)
    rbox(ax, 1.5,-3.2, W, H, "Google\nGemini Flash", fc=LGR, ec=CGR, fs=8.5)
    rbox(ax, 6.5, 3.0, W, H, "Cloud Scheduler\n(moi 3 gio)", fc=LGR, ec=CGR, fs=8.5)

    # Arrows
    arrow(ax, 3.0, 0, 5.0, 0, "HTTPS REST", lc=CB, fs=8, lpos='top')
    arrow(ax, 8.0, 0.3, 9.5, 1.1, "R/W", lc=CO, fs=7.5)
    arrow(ax, 8.0,-0.3, 9.5,-1.1, "cache", lc=CY, fs=7.5)
    arrow(ax, 6.5,-0.55, 6.5,-2.65, "OIDC token", lc=CP, fs=7.5)
    arrow(ax, 8.0,-3.2, 9.5,-3.2, "HDF5", lc=CGR, fs=7.5)
    arrow(ax, 8.0,-3.5, 9.5,-1.8, "upsert", lc=CO, fs=7.5, dashed=True)
    arrow(ax, 5.0,-3.2, 3.0,-3.2, "Gemini API", lc=CGR, fs=7.5)
    arrow(ax, 6.5, 2.45, 6.5, 0.55, "POST /ingest", lc=CGR, fs=7.5)

    ax.set_title("Kien truc tong quan he thong VNFlood", fontsize=11, fontweight='bold', pad=8)
    plt.tight_layout()
    plt.savefig(OUT / "architecture.png", dpi=DPI, bbox_inches='tight')
    plt.close(); print("  architecture.png")


# ─── 2. Layer Architecture ────────────────────────────────────────────────────

def gen_layer_architecture():
    fig, ax = plt.subplots(figsize=(14, 7))
    ax.set_xlim(-0.5, 15); ax.set_ylim(-8.5, 1.2)
    ax.axis('off'); fig.patch.set_facecolor('white')

    W, H = 6.0, 1.0
    GAP = 1.35

    layers_be = [
        ("HTTP Router Layer", "auth · flood · rescue · alerts · admin · chat · internal", LB, CB),
        ("Middleware Layer", "requireAuth · requireRole · rateLimit · multer", "#E1F5FE", "#0277BD"),
        ("Handler Layer", "Route handlers – business logic & validation", LG, CG),
        ("Data Access Layer", "Drizzle ORM – type-safe queries", LY, CY),
        ("Data Layer", "Cloud SQL (PostgreSQL 16) · Redis (Memorystore)", LO, CO),
    ]
    layers_ml = [
        ("FastAPI Router", "POST /ingest/{date}", LB, CB),
        ("Pipeline Orchestrator", "ingest_pipeline(date)", "#E1F5FE", "#0277BD"),
        ("Feature Engineering", "compute_features() → 22 features", LG, CG),
        ("Inference Engine", "LightGBM v3 · flood_prob → risk_level", LP, CP),
        ("Data I/O Layer", "Cloud SQL (upsert) · NASA IMERG · GCS artifacts", LO, CO),
    ]

    # Headers
    rbox(ax, 3.5, 0.6, 6.4, 0.7, "Backend Service (Node.js / Express)", fc=LGR, ec=CGR, fw='bold', fs=9.5)
    rbox(ax, 11.0, 0.6, 6.4, 0.7, "ML Service (Python / FastAPI)", fc=LGR, ec=CGR, fw='bold', fs=9.5)

    for i, (title, sub, fc, ec) in enumerate(layers_be):
        y = -0.3 - i*GAP
        rbox(ax, 3.5, y, W, 1.0, f"{title}\n{sub}", fc=fc, ec=ec, fs=8.0)

    for i, (title, sub, fc, ec) in enumerate(layers_ml):
        y = -0.3 - i*GAP
        rbox(ax, 11.0, y, W, 1.0, f"{title}\n{sub}", fc=fc, ec=ec, fs=8.0)

    # Vertical arrows within each service
    for i in range(4):
        y_from = -0.3 - i*GAP - 0.5
        y_to   = -0.3 - (i+1)*GAP + 0.5
        arrow(ax, 3.5, y_from, 3.5, y_to)
        arrow(ax, 11.0, y_from, 11.0, y_to)

    # OIDC link between Handler Layer (BE) and FastAPI Router (ML)
    y_handler = -0.3 - 2*GAP
    y_fastapiR = -0.3 - 0*GAP
    curved_arrow(ax, 6.5, y_handler, 8.0, y_fastapiR, rad=-0.3,
                 label="OIDC token", lc=CP, fs=7.5, dashed=True)

    ax.set_title("Kien truc phan lop cua Backend Service va ML Service", fontsize=11, fontweight='bold', pad=6)
    plt.tight_layout()
    plt.savefig(OUT / "layer_architecture.png", dpi=DPI, bbox_inches='tight')
    plt.close(); print("  layer_architecture.png")


# ─── 3. Use Case Diagram ──────────────────────────────────────────────────────

def gen_usecase():
    fig, ax = plt.subplots(figsize=(16, 14))
    ax.set_xlim(-2.5, 17); ax.set_ylim(-14.5, 1.5)
    ax.axis('off'); fig.patch.set_facecolor('white')

    # System boundary
    ax.add_patch(FancyBboxPatch((1.0, -13.5), 12.5, 14.5,
                                boxstyle="round,pad=0.2", fc="white", ec="black", lw=1.5, zorder=1))
    ax.text(7.25, 1.0, "He thong VNFlood", ha='center', va='center',
            fontsize=11, fontweight='bold')

    # Actors
    actor(ax, -0.8, -1.0,  "Nguoi dung\nthong thuong")
    actor(ax, -0.8, -5.5,  "Cuu ho vien")
    actor(ax, -0.8, -10.5, "Quan tri vien")
    actor(ax, 16.0, -6.0,  "Cloud\nScheduler")

    # Use cases (ellipses): width=4.2, height=0.8
    EW, EH = 4.6, 0.82
    uc_all = [
        ("UC01: Xem ban do rui ro lu", 7.25, -1.5),
        ("UC02: Nhan canh bao chinh thuc", 7.25, -3.0),
        ("UC03: Su dung chatbot AI", 7.25, -4.5),
    ]
    uc_user = [
        ("UC04: Gui yeu cau cuu ho SOS", 4.2, -6.0),
    ]
    uc_resp = [
        ("UC05: Quan ly yeu cau cuu ho", 10.3, -6.0),
        ("UC06: Quan ly diem so tan", 10.3, -7.5),
        ("UC07: Dang canh bao chinh thuc", 10.3, -9.0),
    ]
    uc_admin = [
        ("UC08: Quan ly nguoi dung", 5.5, -10.8),
        ("UC09: Xem thong ke tong quan", 5.5, -12.2),
    ]
    uc_sys = [
        ("UC10: Thu thap du lieu\nva du bao", 10.5, -11.5),
    ]

    for text, cx, cy in uc_all + uc_user + uc_resp + uc_admin + uc_sys:
        usecase_ellipse(ax, cx, cy, EW, EH, text, fs=8)

    # Actor bottom y positions (feet)
    ay_user  = -1.0 - 1.32
    ay_resp  = -5.5 - 1.32
    ay_admin = -10.5 - 1.32
    ay_sched = -6.0 - 1.32

    def link(ax_cx, ay, uc_cx, uc_cy):
        x1, y1 = ax_cx, ay
        # left or right edge of ellipse
        if ax_cx < uc_cx:
            x2 = uc_cx - EW/2
        else:
            x2 = uc_cx + EW/2
        y2 = uc_cy
        ax.plot([x1, x2], [y1, y2], 'k-', lw=0.9, zorder=2)

    # User (normal user position for actor bottom = base of legs)
    # Actors are at (-0.8, cy), feet at (-0.8, cy - 1.32)
    # Simplified: draw lines from actor x to uc left edge
    actor_x = -0.8
    sched_x = 16.0

    for _, cx, cy in uc_all:
        ax.plot([actor_x, cx-EW/2], [ay_user, cy], 'k-', lw=0.8, zorder=2)
        ax.plot([actor_x, cx-EW/2], [ay_resp, cy], 'k-', lw=0.8, zorder=2)
        ax.plot([actor_x, cx-EW/2], [ay_admin, cy], 'k-', lw=0.8, zorder=2)

    for _, cx, cy in uc_user:
        ax.plot([actor_x, cx-EW/2], [ay_user, cy], 'k-', lw=0.8, zorder=2)

    for _, cx, cy in uc_resp:
        ax.plot([actor_x, cx-EW/2], [ay_resp, cy], 'k-', lw=0.8, zorder=2)
        ax.plot([actor_x, cx-EW/2], [ay_admin, cy], 'k-', lw=0.8, zorder=2)

    for _, cx, cy in uc_admin:
        ax.plot([actor_x, cx-EW/2], [ay_admin, cy], 'k-', lw=0.8, zorder=2)

    for _, cx, cy in uc_sys:
        ax.plot([sched_x, cx+EW/2], [ay_sched, cy], 'k-', lw=0.8, zorder=2)

    ax.set_title("Bieu do ca su dung he thong VNFlood", fontsize=12, fontweight='bold', pad=6)
    plt.tight_layout()
    plt.savefig(OUT / "usecase_diagram.png", dpi=DPI, bbox_inches='tight')
    plt.close(); print("  usecase_diagram.png")


# ─── 4. ML Pipeline ───────────────────────────────────────────────────────────

def gen_ml_pipeline():
    fig, ax = plt.subplots(figsize=(12, 12))
    ax.set_xlim(-1, 13); ax.set_ylim(-11.5, 1.0)
    ax.axis('off'); fig.patch.set_facecolor('white')

    W, H, GAP = 11.0, 0.95, 1.15

    steps = [
        ("1. Doc 208 luu vuc va thuoc tinh tinh tu bang basins", LB, CB),
        ("2. Doc lich su luong mua 45 ngay tu bang basin_weather", LB, CB),
        ("3. Xac dinh ngay con thieu du lieu (precip_mm = NULL)", LGR, CGR),
        ("4. Tai tep IMERG HDF5 tu NASA Earthdata cho cac ngay con thieu", LO, CO),
        ("5. Ghi (upsert) luong mua moi vao bang basin_weather", LO, CO),
        ("6. Gop du lieu DB va du lieu moi thanh DataFrame 45 ngay day du", LGR, CGR),
        ("7. Tai du lieu bao IBTrACS (cache 12 gio) tu NOAA", LGR, CGR),
        ("8. Tinh toan 22 dac trung cho tung luu vuc (features.py)", LG, CG),
        ("9. Chay suy dien LightGBM v3: flood_prob in [0,1] -> risk_level", LP, CP),
        ("10. Ghi (upsert) 208 hang du bao vao bang predictions", LO, CO),
    ]

    for i, (text, fc, ec) in enumerate(steps):
        y = -0.3 - i*GAP
        rbox(ax, 6.0, y, W, H, text, fc=fc, ec=ec, fs=9)
        if i < len(steps)-1:
            arrow(ax, 6.0, y-H/2, 6.0, y-GAP+H/2)

    ax.set_title("Pipeline thu thap du lieu va du bao lu lut (10 buoc)", fontsize=12, fontweight='bold', pad=8)
    plt.tight_layout()
    plt.savefig(OUT / "ml_pipeline.png", dpi=DPI, bbox_inches='tight')
    plt.close(); print("  ml_pipeline.png")


# ─── 5. Notification Flow (SSE + FCM) ────────────────────────────────────────

def gen_notification_flow():
    fig, ax = plt.subplots(figsize=(14, 9))
    ax.set_xlim(-0.5, 15); ax.set_ylim(-6.5, 1.5)
    ax.axis('off'); fig.patch.set_facecolor('white')

    BW, BH = 2.8, 0.95

    # ── Trigger
    rbox(ax, 7.0, 1.0, 5.5, 0.9, "Admin dang canh bao moi\nPOST /api/official-alerts", fc=LR, ec=CR, fw='bold', fs=9)

    # ── Backend (center)
    rbox(ax, 7.0,-0.4, BW+0.4, BH, "Backend\n(broadcastAlert)", fc=LG, ec=CG, fw='bold', fs=9)

    arrow(ax, 7.0, 0.55, 7.0, 0.08, lc=CR)

    # ── SSE path (left branch) ────────────────────────────────────────────────
    ax.text(3.5, -1.3, "Tang 1: SSE\n(ung dung dang chay)", ha='center', va='center',
            fontsize=8.5, color=CB, fontweight='bold',
            bbox=dict(fc=LB, ec=CB, boxstyle='round,pad=0.3'))

    rbox(ax, 2.0, -2.5, BW, BH, "SSE stream\n(XHR onprogress)", fc=LB, ec=CB, fs=8.5)
    rbox(ax, 2.0, -3.9, BW, BH, "useAlertStore\n.addAlert(alert)", fc=LB, ec=CB, fs=8.5)
    rbox(ax, 2.0, -5.3, BW, BH, "scheduleLocal\nNotification()", fc=LB, ec=CB, fs=8.5)

    arrow(ax, 5.8, -0.4, 3.4, -2.12, "SSE event", lc=CB, fs=7.5)
    arrow(ax, 2.0, -2.98, 2.0, -3.42, lc=CB)
    arrow(ax, 2.0, -4.38, 2.0, -4.82, lc=CB)

    # ── FCM path (right branch) ───────────────────────────────────────────────
    ax.text(10.8, -1.3, "Tang 2: FCM\n(ung dung bi tat hoan toan)", ha='center', va='center',
            fontsize=8.5, color=CP, fontweight='bold',
            bbox=dict(fc=LP, ec=CP, boxstyle='round,pad=0.3'))

    rbox(ax, 12.0, -2.5, BW, BH, "sendFcmPush()\nFirebase Admin SDK", fc=LP, ec=CP, fs=8.5)
    rbox(ax, 12.0, -3.9, BW, BH, "Firebase Cloud\nMessaging (FCM)", fc=LP, ec=CP, fs=8.5)
    rbox(ax, 12.0, -5.3, BW, BH, "He dieu hanh\ngiao thong bao", fc=LP, ec=CP, fs=8.5)

    arrow(ax, 8.2, -0.4, 10.6, -2.12, "FCM push", lc=CP, fs=7.5)
    arrow(ax, 12.0, -2.98, 12.0, -3.42, lc=CP)
    arrow(ax, 12.0, -4.38, 12.0, -4.82, lc=CP)

    # ── Merge: both reach OS notification banner
    rbox(ax, 7.0, -5.3, 3.2, 0.9, "OS hien thi banner\nthong bao he thong", fc=LGR, ec=CGR, fw='bold', fs=9)
    arrow(ax, 2.0, -5.78, 5.4, -5.3, lc=CGR, fs=7.5)
    arrow(ax, 12.0, -5.78, 8.6, -5.3, lc=CGR, fs=7.5)

    # labels
    ax.text(4.4, -5.55, "thong bao cuc bo", ha='center', va='center', fontsize=7, color=CGR)
    ax.text(9.6, -5.55, "FCM push notification", ha='center', va='center', fontsize=7, color=CGR)

    ax.set_title("Luong thong bao day hai tang khi co canh bao moi (SSE va FCM)", fontsize=11, fontweight='bold', pad=6)
    plt.tight_layout()
    plt.savefig(OUT / "notification_flow.png", dpi=DPI, bbox_inches='tight')
    plt.close(); print("  notification_flow.png")


# ─── 6. Activity Diagram: SOS ─────────────────────────────────────────────────

def gen_activity_sos():
    fig, ax = plt.subplots(figsize=(12, 20))
    ax.set_xlim(-1.5, 14.5); ax.set_ylim(-20.5, 1.5)
    ax.axis('off'); fig.patch.set_facecolor('white')

    # Swimlane
    ax.add_patch(plt.Rectangle((-1.0, -20.0), 15.0, 21.5, fc="white", ec="#BDBDBD", lw=1.5, zorder=0))
    ax.plot([6.5, 6.5], [-20.0, 1.5], '-', color='#BDBDBD', lw=1.2, zorder=0)
    ax.text(2.75, 1.0, "Nguoi dung", ha='center', va='center', fontsize=11, fontweight='bold')
    ax.text(10.25, 1.0, "He thong", ha='center', va='center', fontsize=11, fontweight='bold')

    BW, BH, DW, DH = 4.0, 0.85, 4.2, 1.0

    # Start
    start_node(ax, 6.5, 0.0)

    # (1) User taps SOS
    rbox(ax, 2.75, -1.5, BW, BH, "Nhan nut SOS", fc="white", ec="black", fs=9)
    arrow(ax, 6.5, -0.18, 2.75, -1.07)

    # (2) System checks location
    diamond(ax, 10.25, -1.5, DW, DH, "Co quyen\nvi tri GPS?", fc=LGR, fs=8)
    arrow(ax, 2.75, -1.5, 8.15, -1.5, lc="black", fs=8)

    # No → guide
    rbox(ax, 10.25, -3.2, BW, BH, "Hien thi huong dan\nvao Cai dat he thong", fc=LR, ec=CR, fs=8.5)
    arrow(ax, 10.25, -2.0, 10.25, -2.77, label="Khong", lc=CR, fs=8, lpos='top')
    # Loop back arrow
    ax.annotate("", xy=(2.75, -1.93), xytext=(10.25, -3.63),
                arrowprops=dict(arrowstyle='->', color=CR, lw=1.2,
                                connectionstyle="arc3,rad=0.4", shrinkA=4, shrinkB=4), zorder=5)

    # Yes → open sheet
    rbox(ax, 2.75, -3.5, BW, BH, "RescueBottomSheet mo ra\nnhap so nguoi & ghi chu", fc=LB, ec=CB, fs=8)
    arrow(ax, 8.15, -1.5, 3.65, -3.12, label="Co", lc=CG, fs=8)

    # (3) Add photo?
    diamond(ax, 2.75, -5.3, DW, DH, "Them anh?", fc=LGR, fs=8.5)
    arrow(ax, 2.75, -3.93, 2.75, -4.80)

    # Yes → image picker
    rbox(ax, 2.75, -7.1, BW, BH, "expo-image-picker\nchon anh tu thu vien", fc=LB, ec=CB, fs=8.5)
    arrow(ax, 2.75, -5.80, 2.75, -6.67, label="Co", lc=CG, fs=8)

    # (4) User submits
    rbox(ax, 2.75, -8.9, BW, BH, "Nhan \"Gui yeu cau\"", fc="white", ec="black", fs=9)
    arrow(ax, 2.75, -7.53, 2.75, -8.47)
    # No path from "Add photo?" merges here
    ax.annotate("", xy=(2.75, -8.47), xytext=(5.0, -5.30),
                arrowprops=dict(arrowstyle='->', color="black", lw=1.2,
                                connectionstyle="arc3,rad=-0.3", shrinkA=4, shrinkB=4), zorder=5)
    ax.text(5.2, -6.5, "Khong", ha='left', va='center', fontsize=8, color="black")

    # (5) System: JWT verify
    rbox(ax, 10.25, -8.9, BW, BH, "requireAuth\nxac minh JWT", fc=LG, ec=CG, fs=8.5)
    arrow(ax, 4.75, -8.9, 8.25, -8.9)

    # (6) multer save
    rbox(ax, 10.25, -10.6, BW, BH, "multer luu anh\nvao /uploads/<uuid>", fc=LG, ec=CG, fs=8.5)
    arrow(ax, 10.25, -9.33, 10.25, -10.17)

    # (7) INSERT
    rbox(ax, 10.25, -12.3, BW, BH, "INSERT rescue_requests\n(lat, lon, notes, photos, status='open')", fc=LO, ec=CO, fs=8)
    arrow(ax, 10.25, -11.03, 10.25, -11.87)

    # (8) 201 response
    rbox(ax, 10.25, -14.0, BW, BH, "Tra ve 201\nvoi request id", fc=LG, ec=CG, fs=8.5)
    arrow(ax, 10.25, -12.73, 10.25, -13.57)

    # (9) User sees confirmation
    rbox(ax, 2.75, -14.0, BW, BH, "Hien thi xac nhan\nvoi ID yeu cau", fc=LB, ec=CB, fs=8.5)
    arrow(ax, 8.25, -14.0, 4.75, -14.0)

    # End
    end_node(ax, 6.5, -15.8)
    arrow(ax, 2.75, -14.43, 6.5, -15.63)

    ax.set_title("Bieu do hoat dong: Gui yeu cau cuu ho SOS", fontsize=12, fontweight='bold', pad=6)
    plt.tight_layout()
    plt.savefig(OUT / "activity_sos.png", dpi=DPI, bbox_inches='tight')
    plt.close(); print("  activity_sos.png")


# ─── 7. Activity Diagram: Notification (SSE + FCM) ───────────────────────────

def gen_activity_notification():
    fig, ax = plt.subplots(figsize=(12, 22))
    ax.set_xlim(-1.5, 14.5); ax.set_ylim(-23.0, 1.5)
    ax.axis('off'); fig.patch.set_facecolor('white')

    ax.add_patch(plt.Rectangle((-1.0, -22.5), 15.0, 24.0, fc="white", ec="#BDBDBD", lw=1.5, zorder=0))
    ax.plot([6.5, 6.5], [-22.5, 1.5], '-', color='#BDBDBD', lw=1.2, zorder=0)
    ax.text(2.75, 1.0, "Ung dung (Mobile)", ha='center', va='center', fontsize=11, fontweight='bold')
    ax.text(10.25, 1.0, "Backend / FCM", ha='center', va='center', fontsize=11, fontweight='bold')

    BW, BH, DW, DH = 4.0, 0.85, 4.2, 1.0

    start_node(ax, 6.5, 0.0)

    # (1) App opened
    rbox(ax, 2.75, -1.5, BW, BH, "Mo ung dung / App foreground", fc="white", ec="black", fs=9)
    arrow(ax, 6.5, -0.18, 2.75, -1.07)

    # (2) Connect SSE
    rbox(ax, 2.75, -3.0, BW, BH, "subscribeToAlerts()\nXHR → /api/official-alerts/stream", fc=LB, ec=CB, fs=8)
    arrow(ax, 2.75, -1.93, 2.75, -2.57)

    # (3) Backend keeps connection
    rbox(ax, 10.25, -3.0, BW, BH, "Giu ket noi SSE mo\nGoi keepalive moi 25 giay", fc=LG, ec=CG, fs=8)
    arrow(ax, 4.75, -3.0, 8.25, -3.0)

    # (4) Admin posts alert
    rbox(ax, 10.25, -4.7, BW, BH, "Admin dang canh bao moi\nPOST /api/official-alerts", fc=LR, ec=CR, fs=8)
    arrow(ax, 10.25, -3.43, 10.25, -4.27)

    # (5) Backend broadcast SSE + FCM
    rbox(ax, 10.25, -6.4, BW, BH, "broadcastAlert() → SSE clients\nsendFcmPush() → Firebase", fc=LG, ec=CG, fs=8)
    arrow(ax, 10.25, -5.13, 10.25, -5.97)

    # (6) App receives SSE event
    rbox(ax, 2.75, -6.4, BW, BH, "XHR onprogress:\nparse chunk → type=\"new\"", fc=LB, ec=CB, fs=8)
    arrow(ax, 8.25, -6.4, 4.75, -6.4, label="SSE event", lc=CB, fs=7.5)

    # (7) Update store
    rbox(ax, 2.75, -8.0, BW, BH, "useAlertStore.addAlert(alert)\nTang badge dem", fc=LB, ec=CB, fs=8.5)
    arrow(ax, 2.75, -6.83, 2.75, -7.57)

    # (8) Check preference
    diamond(ax, 2.75, -9.8, DW, DH, "Thong bao\nduoc bat?", fc=LGR, fs=8.5)
    arrow(ax, 2.75, -8.43, 2.75, -9.30)

    # No → skip
    rbox(ax, 7.5, -9.8, 3.4, BH, "Bo qua\n(chi cap nhat badge)", fc=LGR, ec=CGR, fs=8)
    arrow(ax, 4.85, -9.8, 5.80, -9.8, label="Khong", lc=CGR, fs=8)

    # Yes → check OS permission
    diamond(ax, 2.75, -11.6, DW, DH, "OS cho phep\nthong bao?", fc=LGR, fs=8.5)
    arrow(ax, 2.75, -10.30, 2.75, -11.10, label="Co", lc=CG, fs=8)

    # No → no banner
    rbox(ax, 7.5, -11.6, 3.4, BH, "Khong hien thi\n(thieu OS permission)", fc=LGR, ec=CGR, fs=8)
    arrow(ax, 4.85, -11.6, 5.80, -11.6, label="Khong", lc=CGR, fs=8)

    # Yes → schedule notification
    rbox(ax, 2.75, -13.4, BW, BH, "scheduleNotificationAsync\n(trigger: null)", fc=LB, ec=CB, fs=8.5)
    arrow(ax, 2.75, -12.10, 2.75, -12.97, label="Co", lc=CG, fs=8)

    # OS shows banner
    rbox(ax, 2.75, -15.0, BW, BH, "OS hien thi banner\nthong bao he thong", fc=LGR, ec=CGR, fs=8.5)
    arrow(ax, 2.75, -13.83, 2.75, -14.57)

    # ── FCM path (separate flow below) ───────────────────────────────────────
    ax.text(6.5, -16.5, "- - - - - -  Khi ung dung bi tat hoan toan (FCM Tang 2)  - - - - - -",
            ha='center', va='center', fontsize=8.5, color=CP,
            bbox=dict(fc=LP, ec=CP, boxstyle='round,pad=0.3', alpha=0.7))

    rbox(ax, 10.25, -17.8, BW, BH, "Firebase Cloud Messaging\ngiao thong bao FCM", fc=LP, ec=CP, fs=8.5)
    rbox(ax, 10.25, -19.4, BW, BH, "He dieu hanh Android/iOS\nnhan notification payload", fc=LP, ec=CP, fs=8.5)
    rbox(ax, 2.75, -19.4, BW, BH, "OS hien thi banner\n(ung dung khong can chay)", fc=LP, ec=CP, fs=8.5)
    arrow(ax, 10.25, -18.23, 10.25, -18.97, lc=CP)
    arrow(ax, 8.25, -19.4, 4.75, -19.4, lc=CP)

    # Dashed arrow from "sendFcmPush" to Firebase box
    ax.annotate("", xy=(10.25, -17.37), xytext=(10.25, -6.83),
                arrowprops=dict(arrowstyle='->', color=CP, lw=1.2, linestyle=(0,(4,4)),
                                shrinkA=4, shrinkB=4), zorder=5)
    ax.text(10.6, -12.0, "FCM path\n(app killed)", ha='left', va='center', fontsize=7.5, color=CP)

    # End nodes
    end_node(ax, 2.75, -21.0)
    end_node(ax, 10.25, -21.0)
    arrow(ax, 2.75, -15.43, 2.75, -20.82, lc=CGR)
    arrow(ax, 7.5, -9.8, 2.75, -20.82, dashed=True, lc=CGR)
    arrow(ax, 7.5, -11.6, 2.75, -20.82, dashed=True, lc=CGR)
    arrow(ax, 2.75, -19.83, 2.75, -20.82, lc=CP)

    ax.set_title("Bieu do hoat dong: Nhan thong bao day qua SSE va FCM", fontsize=12, fontweight='bold', pad=6)
    plt.tight_layout()
    plt.savefig(OUT / "activity_notification.png", dpi=DPI, bbox_inches='tight')
    plt.close(); print("  activity_notification.png")


# ─── 8. Sequence Diagram: Login (fixed: sessions table) ──────────────────────

def gen_seq_login():
    fig, ax = plt.subplots(figsize=(13, 10))
    ax.set_xlim(-1.5, 14); ax.set_ylim(-10, 1.2)
    ax.axis('off'); fig.patch.set_facecolor('white')

    xs = [1.5, 7.0, 12.5]
    participants = ["Mobile App", "Backend", "PostgreSQL"]
    colors = [LB, LG, LO]
    ecs = [CB, CG, CO]

    # Participant boxes
    for x, p, fc, ec in zip(xs, participants, colors, ecs):
        rbox(ax, x, 0.8, 2.6, 0.75, p, fc=fc, ec=ec, fw='bold', fs=9.5)

    # Lifelines
    lifeline(ax, xs, 0.42, -9.5)

    msgs = [
        (xs[0], xs[1], -1.3, "POST /api/auth/login {email, password}", False),
        (xs[1], xs[2], -2.3, "SELECT * FROM users WHERE email = ?", False),
        (xs[2], xs[1], -3.3, "user row {id, email, password_hash, role}", True),
    ]
    for x1, x2, y, label, ret in msgs:
        seq_msg(ax, x1, y, x2, label=label, dashed=ret, fs=7.5)

    # Self-call box: bcrypt
    seq_selfbox(ax, xs[1], -4.0, -4.9, "bcrypt.compare\n(password, hash)", fs=7.5)
    ax.text(xs[1]-0.1, -4.45, "4", ha='right', fontsize=7, color='gray')

    # Self-call box: generate tokens
    seq_selfbox(ax, xs[1], -5.2, -6.1, "generateAccessToken\n+ generateRefreshToken", fs=7.5)
    ax.text(xs[1]-0.1, -5.65, "5", ha='right', fontsize=7, color='gray')

    # INSERT sessions (fixed from UPDATE users)
    seq_msg(ax, xs[1], -6.5, xs[2], label="INSERT INTO sessions (user_id, token_hash, expires_at)", fs=7.5)

    # 200 response
    seq_msg(ax, xs[1], -7.5, xs[0], label="200 {accessToken, refreshToken, user}", dashed=True, fs=7.5)

    # Alt: wrong password (gray)
    ax.plot([xs[1], xs[0]], [-8.6, -8.6], '--', color='gray', lw=1.0, zorder=3)
    ax.annotate("", xy=(xs[0], -8.6), xytext=(xs[1], -8.6),
                arrowprops=dict(arrowstyle='->', color='gray', lw=1.0), zorder=4)
    ax.text((xs[0]+xs[1])/2, -8.45, "401 {error: \"Invalid credentials\"}", ha='center', va='bottom',
            fontsize=7.5, color='gray')
    ax.text(xs[1]+0.1, -8.6, "[sai mat khau]", ha='left', va='center', fontsize=7, color='gray',
            bbox=dict(fc=LGR, ec='gray', boxstyle='round,pad=0.2', alpha=0.8))

    # Step labels
    for n, y in enumerate([-1.3, -2.3, -3.3, -4.45, -5.65, -6.5, -7.5], 1):
        ax.text(0.2, y, str(n), ha='center', va='center', fontsize=7.5, color='gray')

    ax.set_title("Bieu do tuan tu: Luong dang nhap (su dung bang sessions)", fontsize=11, fontweight='bold', pad=6)
    plt.tight_layout()
    plt.savefig(OUT / "seq_login.png", dpi=DPI, bbox_inches='tight')
    plt.close(); print("  seq_login.png")


# ─── 9. Sequence Diagram: SOS (fixed: no redis.del for requests) ─────────────

def gen_seq_sos():
    fig, ax = plt.subplots(figsize=(15, 11))
    ax.set_xlim(-1.5, 17); ax.set_ylim(-11, 1.2)
    ax.axis('off'); fig.patch.set_facecolor('white')

    xs = [1.5, 6.0, 10.5, 15.0]
    participants = ["Mobile App", "Backend", "File Storage\n(/uploads/)", "PostgreSQL"]
    colors = [LB, LG, LGR, LO]
    ecs = [CB, CG, CGR, CO]

    for x, p, fc, ec in zip(xs, participants, colors, ecs):
        rbox(ax, x, 0.8, 2.8, 0.75, p, fc=fc, ec=ec, fw='bold', fs=9)

    lifeline(ax, xs, 0.42, -10.5)

    # (1) POST request
    seq_msg(ax, xs[0], xs[1], -1.3,
            "POST /api/rescue/requests (multipart/form-data: lat, lon, notes, photos[])", fs=7.5)

    # (2) JWT verify self-box
    seq_selfbox(ax, xs[1], -2.1, -3.0, "requireAuth\nJWT verify", fs=7.5, w=1.6)
    ax.text(xs[1]-0.1, -2.55, "2", ha='right', fontsize=7, color='gray')

    # (3) multer saves photos
    seq_msg(ax, xs[1], xs[2], -3.5,
            "multer.diskStorage → /uploads/<uuid>.<ext>", fs=7.5)
    seq_msg(ax, xs[2], xs[1], -4.4,
            "[\"/uploads/abc.jpg\", ...]", dashed=True, fs=7.5)

    # (4) INSERT rescue_request
    seq_msg(ax, xs[1], xs[3], -5.3,
            "INSERT rescue_requests (user_id, lat, lon, notes, photos, status='open')", fs=7.5)
    seq_msg(ax, xs[3], xs[1], -6.3,
            "{id, status: 'open', created_at}", dashed=True, fs=7.5)

    # (5) 201 response
    seq_msg(ax, xs[1], xs[0], -7.3,
            "201 {id, status: 'open', lat, lon, notes}", dashed=True, fs=7.5)

    # (6) Display confirmation (self-box on mobile)
    seq_selfbox(ax, xs[0]-1.5, -8.1, -9.0, "Hien thi xac nhan\nvoi ID yeu cau", fs=7.5, w=1.8)

    # Step labels
    for n, y in enumerate([-1.3, -2.55, -3.5, -4.4, -5.3, -6.3, -7.3, -8.55], 1):
        ax.text(0.2, y, str(n), ha='center', va='center', fontsize=7.5, color='gray')

    ax.text(7.0, -9.7, "Luu y: Khong co redis.del sau khi tao rescue_request.", ha='center',
            va='center', fontsize=8, color=CGR,
            bbox=dict(fc=LGR, ec=CGR, boxstyle='round,pad=0.3', alpha=0.8))
    ax.text(7.0, -10.2, "Redis chi bi xoa khi THEM/SUA/XOA diem so tan (rescue_points).",
            ha='center', va='center', fontsize=8, color=CGR)

    ax.set_title("Bieu do tuan tu: Luong gui yeu cau cuu ho SOS", fontsize=11, fontweight='bold', pad=6)
    plt.tight_layout()
    plt.savefig(OUT / "seq_sos.png", dpi=DPI, bbox_inches='tight')
    plt.close(); print("  seq_sos.png")


# ─── 10. Sequence Diagram: Ingest Pipeline ───────────────────────────────────

def gen_seq_ingest():
    fig, ax = plt.subplots(figsize=(18, 16))
    ax.set_xlim(-1.5, 19); ax.set_ylim(-16, 1.5)
    ax.axis('off'); fig.patch.set_facecolor('white')

    xs = [1.0, 4.5, 8.5, 13.0, 17.0]
    participants = ["Cloud\nScheduler", "Backend", "ML Service", "NASA\nIMERG", "Cloud SQL"]
    colors = [LGR, LG, LP, LGR, LO]
    ecs = [CGR, CG, CP, CGR, CO]

    for x, p, fc, ec in zip(xs, participants, colors, ecs):
        rbox(ax, x, 1.0, 2.8, 0.85, p, fc=fc, ec=ec, fw='bold', fs=9.5)

    lifeline(ax, xs, 0.57, -15.5)

    # (1) Scheduler triggers
    seq_msg(ax, xs[0], xs[1], -1.3,
            "POST /api/internal/ingest (x-ingest-secret)", fs=7.5)

    # (2) Validate secret
    seq_selfbox(ax, xs[1], -2.1, -3.0, "Validate\nsecret key", fs=7.5, w=1.6)
    ax.text(xs[1]-0.1, -2.55, "2", ha='right', fontsize=7, color='gray')

    # (3) Fetch OIDC token
    seq_selfbox(ax, xs[1], -3.3, -4.2, "Fetch OIDC token\n(metadata server)", fs=7.5, w=1.8)
    ax.text(xs[1]-0.1, -3.75, "3", ha='right', fontsize=7, color='gray')

    # (4) Call ML service
    seq_msg(ax, xs[1], xs[2], -4.6,
            "POST /ingest/{date} (Bearer OIDC, timeout=59min)", fs=7.5)

    # (5) ML reads basins
    seq_msg(ax, xs[2], xs[4], -5.6, "SELECT * FROM basins (208 rows)", fs=7.5)
    seq_msg(ax, xs[4], xs[2], -6.4, "208 basin rows", dashed=True, fs=7.5)

    # (6) ML reads weather
    seq_msg(ax, xs[2], xs[4], -7.2, "SELECT basin_weather (45 days)", fs=7.5)
    seq_msg(ax, xs[4], xs[2], -8.0, "existing weather rows", dashed=True, fs=7.5)

    # (7) Download IMERG
    seq_msg(ax, xs[2], xs[3], -8.8, "earthaccess: download HDF5 (missing days only)", fs=7.5)
    seq_msg(ax, xs[3], xs[2], -9.6, "HDF5 file(s)", dashed=True, fs=7.5)

    # (8) Upsert weather
    seq_msg(ax, xs[2], xs[4], -10.4,
            "UPSERT basin_weather (ON CONFLICT DO UPDATE)", fs=7.5)

    # (9) Feature engineering + inference self-box
    seq_selfbox(ax, xs[2], -11.2, -12.1,
                "compute_features → LightGBM\nflood_prob → risk_level", fs=7.5, w=2.2)
    ax.text(xs[2]-0.1, -11.65, "9", ha='right', fontsize=7, color='gray')

    # (10) Upsert predictions
    seq_msg(ax, xs[2], xs[4], -12.5,
            "UPSERT predictions 208 rows (ON CONFLICT DO UPDATE)", fs=7.5)

    # (11) ML returns
    seq_msg(ax, xs[2], xs[1], -13.3,
            "200 {date, basins:208, risk_summary}", dashed=True, fs=7.5)

    # (12) Invalidate cache
    seq_selfbox(ax, xs[1], -13.8, -14.7,
                "DEL flood:predictions:*\n(Redis)", fs=7.5, w=1.8)
    ax.text(xs[1]-0.1, -14.25, "12", ha='right', fontsize=7, color='gray')

    # (13) Backend responds
    seq_msg(ax, xs[1], xs[0], -14.9, "200 OK", dashed=True, fs=7.5)

    # Step labels
    for n, y in enumerate([-1.3, -2.55, -3.75, -4.6, -6.0, -7.6, -9.2, -10.4,
                           -11.65, -12.5, -13.3, -14.25, -14.9], 1):
        ax.text(-0.2, y, str(n), ha='center', va='center', fontsize=7, color='gray')

    ax.set_title("Bieu do tuan tu: Luong pipeline thu thap du lieu va du bao (kích hoat moi 3 gio)",
                 fontsize=11, fontweight='bold', pad=6)
    plt.tight_layout()
    plt.savefig(OUT / "seq_ingest.png", dpi=DPI, bbox_inches='tight')
    plt.close(); print("  seq_ingest.png")


# ─── 11. Database Schema Diagram (ER-style) ───────────────────────────────────

def gen_db_schema():
    fig, ax = plt.subplots(figsize=(22, 14))
    ax.set_xlim(0, 22); ax.set_ylim(-15, 1)
    ax.axis('off'); fig.patch.set_facecolor('white')

    TW = 4.6   # table width
    ROW_H = 0.36

    def tbl(cx, cy, name, cols, fc_h, ec):
        n = len(cols)
        total_h = ROW_H * (1 + n)
        hdr_y = cy + total_h/2 - ROW_H/2
        # header
        ax.add_patch(FancyBboxPatch((cx-TW/2, cy+total_h/2-ROW_H), TW, ROW_H,
                                    boxstyle="round,pad=0.03", fc=fc_h, ec=ec, lw=1.4, zorder=3))
        ax.text(cx, hdr_y, name, ha='center', va='center', fontsize=8.5,
                fontweight='bold', zorder=4)
        # body
        ax.add_patch(FancyBboxPatch((cx-TW/2, cy-total_h/2), TW, total_h-ROW_H,
                                    boxstyle="square,pad=0", fc="white", ec=ec, lw=1.2, zorder=3))
        for i, col in enumerate(cols):
            y_row = cy + total_h/2 - ROW_H*(i+1.5)
            ax.text(cx-TW/2+0.12, y_row, col, ha='left', va='center', fontsize=7.5, zorder=4)
            if i < n-1:
                ax.plot([cx-TW/2, cx+TW/2], [cy+total_h/2-ROW_H*(i+2),
                         cy+total_h/2-ROW_H*(i+2)],
                        '-', color=ec, lw=0.3, alpha=0.5, zorder=3)
        # return bottom-center and top-center for connections
        return cx, cy+total_h/2, cx, cy-total_h/2  # (top_x, top_y, bot_x, bot_y)

    def fk_arrow(ax, x1, y1, x2, y2, rad=0.0):
        style = f"arc3,rad={rad}"
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle='->', color='#795548', lw=1.1,
                                    linestyle=(0,(4,3)),
                                    connectionstyle=style, shrinkA=3, shrinkB=3), zorder=5)

    # ── Table definitions ─────────────────────────────────────────────────────
    # Group 1 - Auth (top-left)
    users_cx, users_cy = 3.5, -1.5
    users_cols = [
        "id  SERIAL  PK",
        "email  VARCHAR(255)  UNIQUE",
        "password_hash  VARCHAR(255)",
        "name  VARCHAR(100)",
        "role  VARCHAR(20)  DEFAULT 'user'",
        "province, phone, address",
        "created_at, updated_at",
    ]
    tbl(users_cx, users_cy, "users", users_cols, LB, CB)
    users_bot_y = users_cy - ROW_H*(1+len(users_cols))/2

    sess_cx, sess_cy = 3.5, -6.5
    sess_cols = [
        "id  SERIAL  PK",
        "user_id  INT  FK→users",
        "token_hash  VARCHAR(64)  UNIQUE",
        "expires_at  TIMESTAMP",
        "created_at  TIMESTAMP",
    ]
    tbl(sess_cx, sess_cy, "sessions", sess_cols, LB, CB)
    sess_top_y = sess_cy + ROW_H*(1+len(sess_cols))/2

    # Group 2 - Hydro (center)
    basins_cx, basins_cy = 10.5, -1.2
    basins_cols = [
        "hybas_id  BIGINT  PK",
        "lat, lon  REAL",
        "province  VARCHAR",
        "region_id  INT  (0=N,1=C,2=S)",
        "elev_m, slope_deg, twi  REAL",
        "dist_river_m, basin_area_km2",
        "up_area_km2, river_order",
    ]
    tbl(basins_cx, basins_cy, "basins", basins_cols, LO, CO)
    basins_bot_y = basins_cy - ROW_H*(1+len(basins_cols))/2

    bw_cx, bw_cy = 8.0, -7.5
    bw_cols = [
        "id  SERIAL  PK",
        "hybas_id  FK→basins",
        "date  DATE",
        "precip_mm  REAL",
        "UNIQUE(hybas_id, date)",
    ]
    tbl(bw_cx, bw_cy, "basin_weather", bw_cols, LO, CO)

    pred_cx, pred_cy = 13.0, -7.5
    pred_cols = [
        "id  SERIAL  PK",
        "hybas_id  FK→basins",
        "forecast_date  DATE",
        "run_date  DATE",
        "flood_prob  REAL",
        "risk_level  VARCHAR(10)",
        "UNIQUE(hybas_id, forecast_date, run_date)",
    ]
    tbl(pred_cx, pred_cy, "predictions", pred_cols, LO, CO)

    alerts_cx, alerts_cy = 18.5, -2.5
    alerts_cols = [
        "id  SERIAL  PK",
        "hybas_id  FK→basins",
        "forecast_date  DATE",
        "risk_level  VARCHAR(10)",
        "sent_at  TIMESTAMP",
    ]
    tbl(alerts_cx, alerts_cy, "alerts\n(tu dong)", alerts_cols, LO, CO)

    # Group 3 - Rescue (right)
    rp_cx, rp_cy = 18.5, -8.0
    rp_cols = [
        "id  SERIAL  PK",
        "name  VARCHAR(200)",
        "lat, lon  REAL",
        "capacity  INT",
        "province, address  VARCHAR",
        "is_active  BOOLEAN",
    ]
    tbl(rp_cx, rp_cy, "rescue_points", rp_cols, LG, CG)

    rr_cx, rr_cy = 18.5, -13.5
    rr_cols = [
        "id  SERIAL  PK",
        "user_id  FK→users",
        "lat, lon, people_count",
        "status  VARCHAR (open/assigned/resolved)",
        "notes, photos  TEXT[]",
        "assigned_users  JSONB",
        "created_at, updated_at",
    ]
    tbl(rr_cx, rr_cy, "rescue_requests", rr_cols, LG, CG)

    # Group 4 - Notifications (bottom)
    oa_cx, oa_cy = 3.5, -12.5
    oa_cols = [
        "id  SERIAL  PK",
        "title  VARCHAR(200)",
        "message  VARCHAR(1000)",
        "is_urgent  BOOLEAN",
        "province  VARCHAR",
        "posted_by  FK→users",
        "created_at, is_active",
    ]
    tbl(oa_cx, oa_cy, "official_alerts", oa_cols, LR, CR)

    ar_cx, ar_cy = 9.5, -13.0
    ar_cols = [
        "user_id  FK→users",
        "alert_id  FK→official_alerts",
        "read_at  TIMESTAMP",
        "UNIQUE(user_id, alert_id)",
    ]
    tbl(ar_cx, ar_cy, "alert_reads", ar_cols, LR, CR)

    pt_cx, pt_cy = 14.5, -13.0
    pt_cols = [
        "id  SERIAL  PK",
        "token  VARCHAR(500)  UNIQUE",
        "created_at  TIMESTAMP",
        "(no user_id FK - anonymous)",
    ]
    tbl(pt_cx, pt_cy, "push_tokens", pt_cols, LR, CR)

    # ── FK arrows ─────────────────────────────────────────────────────────────
    # sessions → users
    fk_arrow(ax, sess_cx, sess_top_y, users_cx, users_bot_y)

    # basin_weather → basins (top of bw to bottom of basins)
    bw_top_y = bw_cy + ROW_H*(1+len(bw_cols))/2
    fk_arrow(ax, bw_cx, bw_top_y, 10.0, basins_bot_y, rad=0.1)

    # predictions → basins
    pred_top_y = pred_cy + ROW_H*(1+len(pred_cols))/2
    fk_arrow(ax, pred_cx, pred_top_y, 11.0, basins_bot_y, rad=-0.1)

    # alerts → basins
    alerts_top_y = alerts_cy + ROW_H*(1+len(alerts_cols))/2
    fk_arrow(ax, alerts_cx, alerts_top_y, 12.5, basins_bot_y, rad=-0.2)

    # rescue_requests → users
    rr_top_y = rr_cy + ROW_H*(1+len(rr_cols))/2
    fk_arrow(ax, rr_cx-TW/2, rr_cy, users_cx+TW/2, users_cy, rad=-0.3)

    # official_alerts → users
    oa_top_y = oa_cy + ROW_H*(1+len(oa_cols))/2
    fk_arrow(ax, oa_cx, oa_top_y, users_cx, users_bot_y, rad=0.2)

    # alert_reads → users
    ar_top_y = ar_cy + ROW_H*(1+len(ar_cols))/2
    fk_arrow(ax, ar_cx-TW/2+0.3, ar_cy, users_cx+TW/2, users_cy-2.0, rad=0.3)

    # alert_reads → official_alerts
    oa_bot_y = oa_cy - ROW_H*(1+len(oa_cols))/2
    fk_arrow(ax, ar_cx-TW/2+0.3, ar_top_y, oa_cx+TW/2, oa_cy, rad=-0.2)

    # Legend
    ax.text(1.5, -14.5,
            "--- = khoa ngoai (FK)     PK = khoa chinh     UNIQUE = rang buoc duy nhat",
            ha='left', va='center', fontsize=8, color='#795548',
            bbox=dict(fc=LGR, ec='#795548', boxstyle='round,pad=0.3'))

    # Group labels
    for label, x, y, c in [
        ("Xac thuc & Nguoi dung", 3.5, 0.7, CB),
        ("Du lieu Thuy van & Du bao", 10.5, 0.7, CO),
        ("Cuu ho", 18.5, 0.7, CG),
        ("Canh bao chinh thuc", 9.0, -10.8, CR),
    ]:
        ax.text(x, y, label, ha='center', va='center', fontsize=8.5, color=c,
                fontweight='bold', bbox=dict(fc='white', ec=c, boxstyle='round,pad=0.25', alpha=0.8))

    ax.set_title("So do co so du lieu VNFlood – 11 bang PostgreSQL", fontsize=13, fontweight='bold', pad=8)
    plt.tight_layout()
    plt.savefig(OUT / "db_schema.png", dpi=DPI, bbox_inches='tight')
    plt.close(); print("  db_schema.png")


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Generating VNFlood system diagrams...")
    gen_architecture()
    gen_layer_architecture()
    gen_usecase()
    gen_ml_pipeline()
    gen_notification_flow()
    gen_activity_sos()
    gen_activity_notification()
    gen_seq_login()
    gen_seq_sos()
    gen_seq_ingest()
    gen_db_schema()
    print(f"\nAll diagrams saved to: {OUT}")
