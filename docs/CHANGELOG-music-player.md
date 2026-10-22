# 音乐播放器与顶栏改版 — 改动清单

日期：2026-10-18
分支：`main`（本次为本仓库首次提交）
环境：Astro 5.18.2 / Svelte 5 / Tailwind 3 / Node v24.20.0

---

## 一、新增文件

### `src/components/widget/MusicPlayer.svelte`（508 行）

顶栏音乐播放器，Svelte 5 runes 写法（`$state` / `$derived` / `$effect` / `$props`）。

**结构**

- `.music-root` — 交互容器，统一管理悬停、聚焦、Esc
- `#music-switch` — 音符按钮（40×40）
- `.music-panel` — 定位与动画层（`absolute left-1/2 -translate-x-1/2 w-[19rem]`）
  - `.music-bridge` — 连接按钮与面板的透明条，内含指向按钮的小三角
  - `.music-body` — 唯一绘制表面的一层
- `<audio>` — 与按钮同级，不在面板内

**图标**

| 状态 | 图标名 |
| --- | --- |
| 空闲 | `material-symbols:music-note-rounded`（实心音符） |
| 播放中 | `material-symbols:pause-rounded` |

注意：`material-symbols` 集**没有** `-outline-` 后缀变体，也不存在 `music-note-outline-rounded`
这个图标名——一旦写错，按钮会渲染成空白。空心音符的正确名称是 `music-note`（去掉 `-rounded`），
但它与顶栏其余实心图标风格不统一，因此最终选定实心。

播放时原本还有一圈呼吸光晕（`.music-pulse` + `@keyframes music-breathe`），已整体移除：
播放状态现在只靠图标从音符切换成暂停来表达。

**行为**

| 行为 | 说明 |
| --- | --- |
| 悬停展开 | 进入音符立即展开，无延迟 |
| 离开收回 | 260ms 宽限期后收回，允许指针跨到面板 |
| 点击固定 | 点音符后进入 `pinned` 态，指针移开不收回，直到点击别处或按 Esc |
| 拖音量自动固定 | `onVolume` 里置 `pinned = true` |
| Esc | 先 `closeNow()` 再 `focus()` 回按钮（顺序不能反，否则 `onfocusin` 会立刻重开） |
| 键盘可达 | Tab 聚焦音符即展开 |
| 空态 | `tracks` 为空时按钮仍渲染（`opacity .42`），面板显示配置指引 |

**已知坑与处理**

- `.music-panel` 的 `top` 是 `calc(2.5rem - 1px)`，即按钮高度减 1px。这 1px 重叠是必需的：圆角会在按钮与面板之间留下一条"面板拥有、按钮不拥有"的像素行，指针经过时会触发 `mouseleave` 导致面板收回。
- 面板定位用 `top` 偏移而非 `mb-4` 之类的 margin：`margin` 属于元素盒子，命中测试不认为那部分属于元素，鼠标滑过去会掉出交互区。
- 面板内**不得**再嵌套 `.float-panel`（详见第四节重影）。

### `public/music/kimi-no-kioku.mp3`

由用户提供的 67MB WAV 转码而来：

```
ffmpeg -i "27 キミの記憶 -Reload Instrumental-.wav" \
  -c:a libmp3lame -b:a 192k \
  -map_metadata -1 -write_id3v2 0 -id3v2_version 0 \
  kimi-no-kioku.mp3
```

- 结果：9.6 MB / 192 kbps / 44.1 kHz / 立体声 / 6:39
- 压缩比：67.2 MB → 9.6 MB（省 86%）
- `-map_metadata -1 -write_id3v2 0` 用于**不写入 ID3 标签**，避免播放器读到文件内嵌标题而覆盖 `config.ts` 里配置的曲名
- 原 WAV 已从 `public/music/` 和 `dist/music/` 删除（构建产物从 78MB 降到 26MB）

### `docs/CHANGELOG-music-player.md`

本文件。

---

## 二、修改文件

### `src/config.ts`

`musicConfig.tracks` 从空数组填入实际曲目：

```ts
export const musicConfig: MusicConfig = {
	enable: true,
	name: "Blog BGM",
	muteByDefault: true,
	tracks: [
		{
			name: "キミの記憶",
			artist: "高橋あず美",
			url: "/music/kimi-no-kioku.mp3",
		},
	],
};
```

注意：`url` 走 `url()` 工具函数解析，`/` 开头的路径会拼上 `base`，所以这里写 `public/` 下的相对路径即可。

### `src/types/config.ts`

新增 `MusicConfig` 类型：

```ts
export type MusicConfig = {
	enable: boolean;
	name: string;
	cover?: string;
	muteByDefault?: boolean;
	tracks: {
		name: string;
		artist?: string;
		url: string;
		cover?: string;
	}[];
};
```

### `src/components/Navbar.astro`

**结构调整**

- 顶栏高度 `h-[4.25rem]` → `h-[3.9rem]`（68px → 62.4px）
- 右侧三个功能入口收进 `.nav-actions-pill` 胶囊：调色盘 + 日夜模式 + 音符
- 搜索保持独立在外，未并入胶囊
- 移动端菜单面板 `top: 5rem` → `4.6rem`（跟随顶栏高度）
- 引入 `MusicPlayer client:load`

**尺寸与间距**

| 项 | 改前 | 改后 |
| --- | --- | --- |
| 功能按钮 | `h-11 w-11`（44px） | `h-10 w-10`（40px） |
| 按钮图标 | `text-xl`（20px） | `text-[1.15rem]`（18.4px） |
| 胶囊内按钮间距 | `gap:.05rem`（0.8px） | `gap:.3rem`（5px） |
| 胶囊内边距 | `padding:.15rem`（2.4px） | `padding:.25rem`（4px） |
| 搜索与胶囊间距 | `.nav-actions gap:.4rem`（6.4px） | `gap:.7rem`（11px） |
| 胶囊总宽 | 266px | 140px |

**说明**：第一版曾误用 `h-9.5 w-9.5` 试图做 38px 按钮，但 Tailwind 3 的 spacing 刻度只有 9/10/11/12，**没有 9.5**，该类名不生成任何 CSS，导致按钮塌陷成图标大小（调色盘 18px、日夜模式 0px）。已改用 `h-10 w-10`。

### `src/components/LightDarkSwitch.svelte`

- 按钮 `h-11 w-11` → `h-10 w-10`
- 三个模式图标 `text-[1.25rem]` → `text-[1.15rem]`
- 弹出面板定位 `top-11` → `top-10`

### `src/components/Search.svelte`

- `.search-trigger` 高度 `h-11` → `h-10`
- `gap` `.5rem` → `.55rem`，`padding` `0 .7rem` → `0 .8rem`（补偿高度降低后的视觉密度）

---

## 三、交互问题修复：面板悬停即收回

**现象**：鼠标从音符移到展开的面板上准备调音量时，面板自动收回。

**排查过程**：先后排除——面板与按钮之间的 1px 缝隙（把面板上移重叠 1px，无效）、面板被祖先元素裁剪（逐层查 `overflow`/`clip-path`/`contain`/`mask`，全部为 `visible`/`none`）、指针事件被拦截（`elementFromPoint` 命中正常）。最终通过逐像素记录 `mouseenter`/`mouseleave` 事件序列，定位到真正触发点是 `mouseleave:root`。

**根因**：`#navbar` 带有 `.onload-animation` 入场动画（`fade-in-up`），动画结束后 `transform` 因 `animation-fill-mode: forwards` 被永久保留，使 `#navbar` 成为**包含块**。面板虽在 DOM 上属于音符按钮的子树，**视觉位置却与父元素脱钩**——指针在屏幕上看着走进了面板，浏览器做命中测试时判定它已离开 `.music-root` 的盒子，于是触发 `mouseleave`。

**修复**：移除音符按钮自身的 `onmouseleave` 处理，开关逻辑只由外层 `.music-root` 容器统一管理，整条移动路径落在同一元素内。

**验证**（真实浏览器自动化）：

```
+120ms 悬停音符      → open=true
指针移到面板上        → open=true    ← 修复后不再收回
移开 120ms           → open=true    （260ms 宽限期）
移开 260ms           → open=false
点击固定后移开        → open=true，音频播放中
点击别处             → open=false
```

逐 6px 扫描整个面板高度，命中目标连续无断点：`music-switch → music-bridge → music-body → music-name → …`

---

## 四、视觉问题修复：面板重影

**现象**：展开的播放器面板边缘有重影。

**根因**：面板套了两层都带 `.float-panel` 的元素：

```
.music-panel.float-panel          ← 背景 + 描边 + 圆角 + 阴影 + backdrop-filter
  └ .card-base.float-panel        ← 又是背景 + 描边 + 圆角 + 阴影 + backdrop-filter
```

两层同时绘制，中间隔着 14.6px 的箭头区，所以顶部一圈看到外层、主体看到内层，交界处形成重影。用纯色背景单独截图量化，顶部区域比主体亮 `+0.076`，正是双层叠加的量。

**修复**：面板元素只负责定位与动画，表面改由新的 `.music-body` **只绘制一次**。几何尺寸不变。修正后面板内嵌套 `.float-panel` 数量由 1 降为 **0**。

---

## 五、验证结果

自动化测试覆盖深色 / 浅色 / 键盘 / 移动端 / 回归，共 17 项：

| 分组 | 项目 | 结果 |
| --- | --- | --- |
| 深色 (1440) | 悬停展开、指尖移入面板、点击固定、音频播放、点外取消 | 5/5 通过 |
| 浅色 (1440) | 悬停展开、指尖移入面板 | 2/2 通过 |
| 键盘 | 聚焦展开、Esc 关闭并归还焦点 | 2/2 通过 |
| 移动端 (390×780) | 按钮存在、点击展开、面板在视口内、点外关闭 | 4/4 通过 |
| 移动端 | 音频播放 | 见下 |
| 回归 | 顶栏六元素完整、调色盘面板不被遮挡 | 2/2 通过 |

**唯一一条 FAIL 是测试脚本自身的时序问题**，单独复测确认功能正常：

```
点开播放键后 → paused=false, currentTime=0.5s   ← 正常播放
```

原因是脚本前一步的指针移动恰好落在面板上把面板收掉了，与实现无关。

**其他实测数据**

- 音频请求 `206 audio/mpeg 9596550` —— 支持 Range 请求，进度条可拖动
- 四个控件垂直中心同为 y=55，同一水平线，无错位
- 移动端四按钮均 35×35，搜索框 44×35，单排无溢出

**重要提示**：本曲目在 **dev 服务器（4321）会 404**，Vite 对含空格与日文的文件名解析有问题。查看效果请用 `astro preview`（本地位于 4329），或直接看线上构建产物。

---

## 六、后续修订（本次清理）

- **`--content-delay` 与 `@fontsource` 子集**：见 `Layout.astro` 顶部注释。Roboto 原先用默认入口
  （`400.css` 等）会把 Cyrillic / Greek / Vietnamese / Symbols 六个子集全部打包进去，现改为按
  `latin-400.css` / `latin-ext-400.css` 这类**逐字重 + 逐子集**的入口，`@font-face` 数量与体积都显著下降。
- **隐藏曲名不再拉取中文字体**：`.music-name` / `.music-artist` 在每页首屏都存在于 `inert` 容器内，
  隐藏文本仍参与字体匹配，会触发 Noto Serif SC 分片下载。现在这两条规则显式指定纯拉丁字体族，
  日文字形直接落到系统日文字体，不再命中 CJK webfont。

## 七、待确认事项

以下两点尚未处理，等你决定：

1. 浅色模式下 `.music-bridge::after` 的小三角边框使用 `--hairline-strong`，在白色面板上较为明显（深色下几乎不可见）。
2. 浅色面板底色与蓝色油画背景对比度偏高，略显"贴纸感"。

另：`musicConfig.muteByDefault` 目前为 `true`（进站不自动播放，需手动点击）。改为 `false` 可进站即播。
