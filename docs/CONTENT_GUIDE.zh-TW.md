# Zebrafish 博客內容編輯筆記

這份筆記說明如何修改網站文字、圖片和文章。所有操作都在專案根目錄（有 `package.json` 的資料夾）進行。

## 一、先在本機預覽

```bash
cd "C:\Users\ROG\Documents\ChatGPT\zebrafish-fuwariblog"
pnpm install
pnpm run dev
```

瀏覽 `http://localhost:4321/`。修改檔案後，瀏覽器通常會自動更新。完成後建議執行：

```bash
pnpm check
pnpm test
pnpm build
```

## 二、修改網站名稱、描述與導覽

主要設定檔是 [`src/config.ts`](../src/config.ts)。常用欄位：

```ts
siteConfig.title       // 網站名稱
siteConfig.subtitle    // 首頁副標題
siteConfig.description // SEO 與分享卡片描述
siteConfig.url         // 正式網址，務必使用 https:// 開頭
siteConfig.lang        // 網站語言，例如 zh_TW
```

導覽列在同一個檔案的 `navBarConfig.links` 中修改。站內連結使用 `/archive/` 這類路徑；外部連結加上 `external: true`。

作者資料、頭像和社交連結在 `profileConfig` 中修改：

```ts
profileConfig.name
profileConfig.bio
profileConfig.avatar
profileConfig.links
```

修改完成後，首頁側欄、關於頁、頁尾和 SEO 作者資訊會同步使用新資料。

## 三、修改首頁文字

首頁的主視覺和統計入口位於 [`src/components/HomeIntro.astro`](../src/components/HomeIntro.astro)。可以直接修改眉標、主標題、介紹文字、按鈕和「最近更新」標題。文章數、分類數和標籤數是自動計算的，不需要手動修改。

關於頁內容位於 [`src/content/spec/about.md`](../src/content/spec/about.md)。它是 Markdown 檔案，可以直接編輯標題、段落、清單和連結。

## 四、修改頭像、封面與其他圖片

### 作者頭像

把圖片放到 `src/assets/images/`，再在 `src/config.ts` 修改：

```ts
avatar: "assets/images/my-avatar.jpg"
```

建議使用正方形 JPG 或 PNG，尺寸約 400×400 像素以上。

### 文章封面

推薦使用「文章資料夾」管理文章和圖片：

```text
src/content/posts/my-first-post/
├── index.md
└── cover.jpg
```

在 `index.md` 的 frontmatter 寫 `image: "./cover.jpg"`。也可以使用 `https://` 外部圖片，或 `/images/cover.jpg`（對應 `public/images/cover.jpg`）。本地文章圖片建議放在同一篇文章的資料夾，並使用 `./檔名`，這樣 Astro 會自動最佳化圖片。

正文中的圖片：

```md
![圖片替代文字](./diagram.png)
```

替代文字要描述圖片內容，方便無障礙閱讀和搜尋引擎理解。照片可先壓縮成 JPG/WebP。

網站分享圖和 favicon：

- 預設社交分享圖：`public/og-default.png`，建議維持 1200×630 像素。
- favicon：`public/favicon/zebrafish.svg`。

如果替換分享圖，檔名不變即可；網站會自動把它用於 Open Graph 和 Twitter 卡片。

### 首頁 Banner

首頁目前使用 Fuwari 風格的寬幅圖片 Banner。設定位於 `src/config.ts`：

```ts
banner: {
  enable: true,
  src: "assets/images/demo-banner.png",
  position: "center", // 可選 top、center、bottom
}
```

把新的 Banner 放進 `src/assets/images/` 後，修改 `src` 即可。若想暫時隱藏 Banner，將 `enable` 改為 `false`。

## 五、新增一篇文章

最簡單的方式：

```bash
pnpm new-post my-first-post
```

這會建立 `src/content/posts/my-first-post.md`。若要同時放置封面，建議改成文章資料夾：

```text
src/content/posts/my-first-post/index.md
```

文章開頭的 frontmatter 必須放在兩組 `---` 之間：

```yaml
---
title: 我的第一篇文章
published: 2026-09-12
updated: 2026-09-13
description: 用一兩句話說明文章內容，會顯示在首頁、搜尋和分享預覽。
image: "./cover.jpg"
tags: [Astro, Blogging]
category: 技術筆記
draft: false
lang: zh_TW
---
```

| 欄位 | 用途 |
| --- | --- |
| `title` | 文章標題，必填 |
| `published` | 發布日期，格式 `YYYY-MM-DD`，必填 |
| `updated` | 更新日期，可選 |
| `description` | 摘要，建議 1–2 句 |
| `image` | 封面圖片，可留空 |
| `tags` | 標籤陣列，例如 `[Astro, CSS]` |
| `category` | 分類名稱 |
| `draft` | `true` 時不會在正式網站顯示 |
| `lang` | 只有文章語言不同於網站時才填寫 |

正文使用標準 Markdown：

````md
# 文章標題

這是段落。可使用 **粗體**、*斜體*、連結和清單。

## 小節

```ts
console.log("Hello Zebrafish");
```
````

文章標題建議從 `##` 開始，讓頁面主標題保留給 frontmatter 的 `title`。頁面會自動產生目錄、閱讀時間、字數、收藏、分享和相關文章。

## 六、修改或隱藏文章

- 修改文章：直接編輯對應的 `.md` 或資料夾內的 `index.md`。
- 暫時隱藏：將 `draft: false` 改為 `draft: true`。正式建置不會輸出草稿。
- 刪除文章：刪除整個文章檔案或文章資料夾，若有封面也會一併刪除。
- 更改網址：檔名或資料夾名稱就是 slug，例如 `my-first-post` 會產生 `/posts/my-first-post/`。改名後舊網址不會自動轉址。

## 七、發布到 GitHub

確認本機預覽和建置沒有問題後：

```bash
git add .
git commit -m "Update blog content"
git push origin main
```

GitHub Actions 會執行檢查和建置；若已連接 Vercel 或其他部署服務，推送 `main` 後通常會自動發布。

## 八、常見問題

### 圖片找不到

確認路徑和大小寫完全一致。文章資料夾圖片使用 `./cover.jpg`；`public` 圖片使用 `/images/cover.jpg`，實際檔案應位於 `public/images/cover.jpg`。

### 日期格式錯誤

請使用 `2026-09-12`，不要寫成 `2026/09/12`。

### 文章沒有出現在正式網站

檢查 `draft` 是否為 `true`，以及 frontmatter 是否有縮排或標點錯誤。先執行 `pnpm check` 查看診斷訊息。

### 搜尋沒有立即找到新文章

正式網站的 Pagefind 索引會在 `pnpm build` 時重新產生。部署完成後再測試搜尋。
