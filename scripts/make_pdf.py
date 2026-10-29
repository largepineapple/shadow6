"""Build the five-page submission and render all pages for visual verification."""
from pathlib import Path
import html
import os
import re
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader
import pypdfium2 as pdfium

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'output'
OUTPUT.mkdir(exist_ok=True)
font = os.environ.get('CJK_FONT', 'C:/Windows/Fonts/simhei.ttf')
pdfmetrics.registerFont(TTFont('CN', font))
try:
    pdfmetrics.registerFont(TTFont('Body', 'C:/Windows/Fonts/simsun.ttc', subfontIndex=0))
except Exception:
    pdfmetrics.registerFont(TTFont('Body', font))

W, H = 595.28, 841.89
LEFT, WIDTH = 44, W - 88
INK, MUTED, BLUE = '#202640', '#68708a', '#304de8'
c = canvas.Canvas(str(OUTPUT / 'product-brief.pdf'), pagesize=(W, H))
c.setTitle('开拍小笺｜AI与内容创作产品说明')
c.setAuthor('吴亦立 · AI协作说明见第5页')
y = 0


def p(text, size=10.2, leading=17, color=INK, space=9, font='Body'):
    global y
    safe = html.escape(text).replace('\n', '<br/>')
    paragraph = Paragraph(safe, ParagraphStyle('p', fontName=font, fontSize=size,
                          leading=leading, textColor=HexColor(color), wordWrap='CJK'))
    _, height = paragraph.wrap(WIDTH, H)
    if y - height < 58:
        raise ValueError(f'Page overflow at {text[:45]}: y={y}, height={height}')
    paragraph.drawOn(c, LEFT, y - height)
    y -= height + space


def h(text):
    p(text, size=12, leading=19, color=BLUE, font='CN', space=6)


def start(number, category, title, subtitle):
    global y
    c.setFillColor(HexColor('#f6f7fb'))
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(HexColor(BLUE))
    c.roundRect(LEFT, H-59, 12, 12, 3, fill=1, stroke=0)
    c.setFont('CN', 10)
    c.drawString(LEFT+20, H-57, '开拍小笺 / TAKE NOTE')
    c.setFont('CN', 8)
    c.setFillColor(HexColor(MUTED))
    c.drawRightString(W-LEFT, H-57, category)
    c.setStrokeColor(HexColor('#dfe3ef'))
    c.line(LEFT, H-72, W-LEFT, H-72)
    y = H - 99
    p(title, size=25, leading=33, font='CN', space=10)
    p(subtitle, size=10, leading=16, color=MUTED, space=20)
    c.setFont('CN', 8)
    c.setFillColor(HexColor(MUTED))
    c.drawString(LEFT, 31, 'AI 与内容创作 · 产品原型作业 · 2026.10.29')
    c.drawRightString(W-LEFT, 31, f'{number} / 5')


def picture(name, max_height, label):
    global y
    image = ImageReader(str(OUTPUT / 'screenshots' / name))
    iw, ih = image.getSize()
    scale = min(WIDTH/iw, max_height/ih)
    width, height = iw*scale, ih*scale
    if y-height-28 < 58:
        raise ValueError('Image overflow')
    c.drawImage(image, LEFT+(WIDTH-width)/2, y-height, width, height)
    y -= height+8
    p(label, size=8, leading=12, color=MUTED, space=12)


def link(label, url):
    global y
    p(label, size=10, color=BLUE, font='CN', space=8)
    c.linkURL(url, (LEFT, y+7, W-LEFT, y+25), relative=0, thickness=0)


start(1, '用户与场景', '把已有素材，变成下一步能拍的内容。', '目标用户足够具体，先检验一条创作链路，而不是增加更多生成按钮。')
h('一句话产品')
p('帮助独立经营咖啡店、自己负责店铺短视频的店主，在营业结束后，把三张已有照片和确认过的商品事实，整理成可编辑、可局部改写的 15 秒拍摄脚本，解决“有素材，却不知道怎么开口、怎么拍”的问题。', size=11, leading=19)
h('一个具体的使用时刻')
p('店主白天拍了成品、制作过程和店内角落，打烊后想介绍一杯燕麦拿铁。素材都有了，却不知道怎样组织成一条视频；直接生成的广告腔不适合自己，为改一句话又反复重写整篇。示例商品与 28 元均为虚构演示信息。')
picture('01-entry.png', 265, '真实 Demo：首页从一个具体创作任务进入，提供示例和自己的照片两种入口。')
h('为什么值得尝试')
p('已有素材和商品事实，使任务边界清晰；潜在障碍是组织表达与执行，而不一定是缺少模型能力。此判断是待验证假设，没有用户访谈或经营数据支持。原型的价值需以实际采用和拍摄行为检验。', size=10, leading=17)
c.showPage()

start(2, '核心流程', '让事实、画面和表达对得上。', '核心交付是拍摄脚本。AI 不替用户拍板，也不把分镜预览称为成片。')
for title, body in [
    ('进入与准备', '无需登录。用咖啡店示例体验，或选择三张自己的照片；标记成品、制作、环境用途。填写商品与可选价格、特点。'),
    ('先确认，再生成', '核对事实后勾选确认。未知地址、折扣和健康功效不补写；没有提供价格就不出现价格。加载可取消，生成由本地规则模拟。'),
    ('结果可以局部改变', '三段口播分别绑定素材，并给出画面建议。直接编辑、只改写一段或撤回，保留已经满意的两段。'),
]:
    h(title); p(body)
picture('05-script.png', 255, '真实 Demo：脚本与照片逐段绑定，右侧检查画面与字幕对应关系。')
h('完成后继续做什么')
p('播放三段无音轨的分镜预览，保存本机草稿、复制口播或导出 .txt，交给拍摄与剪辑环节。可以返回修改或再做一条。15 秒为节奏参考，长口播仍需精简；不自动发布。')
c.showPage()

start(3, '产品判断与证伪', '少做一点，让核心判断可验证。', '保留：每段绑定素材的可编辑拍摄脚本。其他能力围绕它服务。')
for title, body in [
    ('为何选独立店主', '同一人承担经营与内容表达，输入和目标明确，能观察脚本是否真的让下一步更容易。尚未证明创作频率与付费意愿，不泛化到所有创作者。'),
    ('为何采用这个流程', '先确认事实，避免模型猜测价格和卖点；再把每段文字绑定到可用素材。只改不满意的部分，降低反复全量生成的不确定性。确认环节会增加成本，也需要验证。'),
    ('主动舍弃', '不做一键剪辑、配音和平台发布，避免音轨、版权和适配稀释验证重点；不做账号、团队、批量营销及复杂 Agent 编排。本轮只检验从素材到可执行表达。'),
    ('最可能失败的地方', '用户可能只想直接得到成片，不愿继续拍剪；固定三段可能同质化；广告腔和偏长口播可能导致结果不被采用。'),
    ('如何验证或推翻判断', '邀请 5 位确实自己经营内容的店主，带真实素材交替使用现有方式和原型；记录到可用稿的时间、修改、未提供事实和实际拍摄行为，再看一周内是否自发复用。若多数人只需要成片，就重新验证输出形态。5 人只能探索，不能代表市场成立。'),
]:
    h(title); p(body, size=10, leading=16, space=10)
h('异常与结果不理想')
p('可重复触发一次生成失败，保留素材和事实后重试；取消不会被迟到结果覆盖。不理想时单段改写、手动编辑或撤回。草稿恢复只承诺文字；自己的照片刷新后需重选。', size=10, leading=16)
c.showPage()

start(4, '最满意的产品 / 功能', '立行：让长任务可观察，也可局部修复。', '从自己的开发与回归测试体验出发，关注过程反馈与失败后的控制感。')
for title, body in [
    ('我最喜欢什么', '我最满意的产品是自己从 0 到 1 开发的“立行”Multi-Agent 智能旅行规划系统。最喜欢的是复杂任务可观察、发生问题后能局部恢复的机制。'),
    ('我在什么时候使用', '在项目开发与回归测试中，我检查系统如何拆解旅行需求、调用工具、组织行程和处理失败。旅行规划同时维护时间、预算等约束；只给最终行程，会让我难以判断等待在哪里、一次错误影响了什么。'),
    ('哪个设计解决了问题', 'SSE 流式展示模型输出和工具进度，分阶段 Trace 帮助定位；工具失败可以重试，必要时局部 Replan；Checkpoint 保存关键状态以支持中断恢复。Benchmark 和 Badcase 回归是我验证执行链路的方式。'),
    ('为什么有效', '它把不透明的长等待拆成可理解、可排查的过程；局部失败有机会只修受影响的部分，保留已有结果。有效性依赖状态与约束边界正确，并不是所有失败都能自动恢复。'),
    ('如果只能改一处', '把技术进度转成用户能采取行动的里程碑：哪些条件已确认、哪里待核实、重规划影响哪一天，再让用户选择“只改这一天，保留其他安排”。这样从看见过程走向控制结果。'),
    ('对本题的启发', '开拍小笺也采用“保留满意部分、局部修改”的机制。技术复杂度不同，但产品目标一致：用户能判断结果哪里不对，并以小成本修正。'),
]:
    h(title); p(body, size=10.2, leading=17, space=12)
c.showPage()

start(5, 'AI 使用与交付', 'AI 帮助实现，判断与边界必须说清。', '工具：Codex。没有真实生成 API，没有外部图片生成服务，也没有商家调研。')
h('AI 做了什么，人的输入是什么')
p('Codex 参与需求拆解、咖啡店场景提案、流程与取舍初稿、界面代码、原创 SVG、测试、录屏和 PDF。人提供作业、仓库、简历，并确认第一个 Multi-Agent 项目最满意。立行经历来自本人资料；本题场景和取舍由 AI 提案，候选人已明确认可咖啡店主场景，并选择重点做好事实确认与局部改写，不做一键成片，不宣称是本人独立调研的结论。', size=10, leading=17)
h('没有直接接受的初稿')
p('把易误解的“一键视频”改成拍摄小笺，明确无音轨与非成片；修复异步图片读取覆盖，增加素材位版本检查；补上用途重复校验；草稿只存文字，并提示照片不会恢复；缺失价格不编造。第 5 题以真实项目机制为基础，没有编造目的地和用户反馈。', size=10, leading=17)
h('验证与限制')
p('浏览器已覆盖 13 项：空输入、价格格式、本地图片读取、失败重试、局部改写与撤回、刷新恢复、文本导出、缺失价格、小屏、减少动态效果、取消生成、浏览器隔离与无未捕获错误。具体证据见仓库 verification.json；截图已检查。它们验证的是原型交互，不是市场价值或真实模型质量。', size=10, leading=17)
h('提交入口')
link('在线 Demo（无需登录） → largepineapple.github.io/shadow6/demo/', 'https://largepineapple.github.io/shadow6/demo/')
link('源码与完整材料 → github.com/largepineapple/shadow6', 'https://github.com/largepineapple/shadow6')
link('备用实际操作视频（中文讲解字幕，无配音） → 打开视频', 'https://largepineapple.github.io/shadow6/output/demo-walkthrough.webm')
p('视频约 2—3 分钟。离线可直接打开 demo/index.html；截图加操作流程说明位于 docs/walkthrough.md。单独 AI 使用记录在 docs/ai-usage.md。个人简历原件和联系方式不公开入库。', size=9.5, leading=16)
h('素材与能力说明')
p('SVG 为原创示例，不是实拍；用户图片不离开浏览器。文本脚本采用本地规则，未实现真实模型、剪辑和发布。依赖按各自许可证使用，验证与排版工具不计作额外 AI 模型。', size=9.5, leading=16)
c.showPage()
c.save()

reader = PdfReader(str(OUTPUT / 'product-brief.pdf'))
assert len(reader.pages) == 5
for i, page in enumerate(reader.pages):
    assert len(page.extract_text()) > 150, f'Empty page {i+1}'
review = OUTPUT / 'pdf-review'
review.mkdir(exist_ok=True)
document = pdfium.PdfDocument(str(OUTPUT / 'product-brief.pdf'))
for i in range(len(document)):
    document[i].render(scale=1.5).to_pil().save(review / f'page-{i+1}.png')
print('PDF generated: 5 pages; text checked; rendered all pages for review.')
