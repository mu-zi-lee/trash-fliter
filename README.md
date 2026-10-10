# trash-fliter

多站点油猴内容过滤器。黑白界面，支持浅色、深色与跟随系统。

## 站点范围

| 站点 | 独立适配文件 | 当前处理范围 |
| --- | --- | --- |
| X / Twitter | `src/sites/x.js` | 已加载的推文正文 |
| linux.do | `src/sites/linux-do.js` | 首页/分类/搜索主题标题、话题页帖子与回复正文，不包含引用块 |
| 小红书 | `src/sites/xiaohongshu.js` | 推荐/搜索笔记标题、打开笔记的正文 |
| 哔哩哔哩 | `src/sites/bilibili.js` | 推荐/搜索视频标题、动态文字 |
| 抖音 | `src/sites/douyin.js` | 有明确结构标记的视频卡片标题/简介；不折叠全屏播放器 |
| YouTube | `src/sites/youtube.js` | 推荐/搜索/侧栏视频标题与简介、已加载评论 |

新增站点适配属于实验性支持：选择器会随站点版本变化，尚未完成真实登录账号的线上回归。视频标题/简介判断不代表视频正文评分；不会抓取字幕、音视频或绕过登录。标题/简介的最短长度为设置值与 8 字中的较小值，正文仍使用设置值。

各站点共享设置和密钥；账号规则按站点能提取的账号标识匹配，例如 B 站 UID、小红书 profile ID、抖音 user ID、YouTube handle。不同站点账号标识可能重名，设置账号规则时需留意。

## 安装

1. 安装 Tampermonkey。
2. 将 [`dist/trash-fliter.user.js`](dist/trash-fliter.user.js) 的完整内容放入油猴新建脚本中，保存。
3. 打开支持的站点，点击右下角的内容过滤按钮。
4. 默认关闭。设置本地规则，或在「服务」中注册服务、填写自己的 API Key，然后启用并保存。

Nace 的注册按钮使用项目配置的注册链接。密钥分别保存于油猴脚本存储，不会写入页面或设置导出文件。不要同时启用旧版过滤脚本。

## 功能

- **站点适配折叠**：普通列表收起为紧凑提示；小红书瀑布流保留卡片位置与尺寸，替换为过滤占位，避免打乱定位。linux.do 主题表格使用跨列提示。均支持展开与再次折叠，另有遮盖、淡化和仅标记。
- **内联状态**：展开与有价值保护提示置于正文列、互动操作上方，不遮挡作者、时间或右上角菜单。
- **七类质量筛选**：营销、灌水、标题党、情绪钓鱼、互动诱导、机械套话、主观无趣。最后一项默认关闭。
- **范围与证据约束**：请求携带站点、内容范围和截断标记。标题/简介不判定整篇灌水、套话或无趣；标题类过滤门槛至少 0.95，正文主观类别至少 0.92。每类同时要求模型的明确依据评分至少 0.85；这是保守启发式规则，不是经过校准的准确率。依据问题与分类在同一请求中，可能增加服务端处理量，实际费用取决于服务商。
- **有价值保护**：模型发现具体信息、个人经验或娱乐价值时保留帖子。本地规则属于显式偏好，不受模型保护覆盖。
- **本地规则**：关键词、账号过滤与白名单，白名单优先。不配置 API 也可使用。
- **四个服务预设**：Nace / Drex、Codiv / OpenJev、TypeSafe / Jev、OpenRouter / Jev，使用 SystemOne 接口；各服务需要独立密钥与额度。
- **持续检测**：仅处理视口附近的帖子，串行队列，约 650ms 请求间隔。默认每滚动一分钟最多 30 次自动检测请求，达到后自动等待并恢复，没有整页累计上限。失败也计入；测试连接另外计费。
- **缓存与错误处理**：缓存七天、最多 500 条；服务错误后暂停模型请求，保留本地规则。检查配置后点击重试。
- **动态页面适配**：监听新增与修改的帖子，校验复用节点；改设置或切换页面会取消旧请求。手动展开在当前页面会话中保留。
- **设置导入导出**：不导出密钥，导入时默认停用，保存后生效。

## 开发

```sh
npm install
npm run build
npm test
npm run dev -- --port 4173
```

开发预览使用模拟帖子和模拟评分，不连接真实服务。实际用户脚本使用油猴的网络与存储权限。浏览器检查：

```sh
npx playwright install chromium
npm run test:browser
```

## 结构

```text
src/
  main.js                 装配入口
  userscript.meta.txt     油猴元数据
  config/
    catalog.js            分类提示、模式与服务目录
    settings.js           配置归一化、导入导出
  storage/
    store.js              油猴存储适配
    cache.js              有界结果缓存
  providers/
    systemone.js          请求、取消与严格响应校验
  filter/
    decision.js           本地规则与评分决策，无 DOM 依赖
  sites/
    index.js              站点注册与域名路由
    shared.js             共用文本提取与动态监听
    x.js                  X 独立适配
    linux-do.js           linux.do 独立适配
    xiaohongshu.js         小红书独立适配
    bilibili.js           哔哩哔哩独立适配
    douyin.js             抖音独立适配
    youtube.js            YouTube 独立适配
  core/
    queue.js              串行、可取消任务队列
    engine.js             扫描、可视区域调度与状态
  ui/
    icons.js              Lucide 图标
    dom.js                无 HTML sink 的 DOM 构建
    panel-template.html   可读的设置面板模板
    panel-template.js     构建时生成的 DOM 描述，不包含运行时解析器
    panel.js / panel.css  Shadow DOM 设置面板
    post-view.js          可恢复帖子呈现
    post.css              页面折叠、遮盖与淡化规则
scripts/build.mjs         将各模块打包成单个 .user.js
demo/                     本地演示，绝不进入发布包
test/                     规则、请求、队列与浏览器检查
dist/                     可安装产物
```

维护时修改 `src/` 再构建，不要直接编辑构建产物。每个站点实现 `matches / selector / allowedPage / extract / mountNotice`，在 `sites/index.js` 注册，并增加元数据 `@match`。核心队列、缓存、决策无需改动。增加服务改 `catalog.js` 和元数据中的 `@connect`。

## 使用边界

模型检测会把帖子文字发送给当前选择的第三方服务，可能产生费用。只读取已加载的帖子文字，最多分析前 6,000 个字符；不抓取图片、视频、链接目标或未加载的长文。评分是主观分类结果，不能证明事实真假或 AI 作者身份。

达到每分钟请求上限后自动等待，额度恢复时只继续检测仍接近视口的帖子；滚动加载的新内容会持续被扫描。保存或重试不会清空这一分钟的计数。旧版整页请求上限自动迁移为默认每分钟 30 次。持续检测可能增加费用，可降低速率或停用模型检测。缓存包含曾检测的文字，清空按钮可移除。

X 的 DOM 和服务的接口可能变化；真实账号下的线上表现和服务连通性需要在安装后确认。折叠会改变帖子高度；若时间线定位受影响，可切换到遮盖模式。旧脚本的配置只有在同一脚本存储可访问时才会迁移，独立新安装需重新填写密钥。

## 来源

结合用户提供的 X Quality Filter 脚本，参考 [adamnroman/slop-filter](https://github.com/adamnroman/slop-filter) 的独立站点适配、按需评分、YouTube Trusted Types 兼容和可恢复折叠思路。此版本判断内容质量，不包含参考项目的订阅计费与 AI 写作训练模型。

项目使用 MIT 许可证，完整文本见 [`LICENSE`](LICENSE)。发布脚本先标注项目 MIT，再列出第三方许可：Lucide 图标为 ISC，其余打包依赖的许可注释也保留。这些依赖声明不改变本项目的 MIT 协议。参考项目和依赖许可说明见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。
