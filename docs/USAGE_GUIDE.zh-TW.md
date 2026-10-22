# Zebrafish 博客使用說明

這是 Zebrafish 博客的完整使用指南，分為「讀者使用」和「站長編輯」兩部分。專案根目錄是包含 `package.json` 的資料夾。

## 1. 開始使用

先安裝 Node.js 20 或更新版本，以及 pnpm 9 或更新版本。進入專案根目錄後執行：

```bash
pnpm install
pnpm dev
```

然後開啟 <http://localhost:4321/>。開發伺服器會監看檔案變更，修改內容後重新整理頁面即可看到結果。停止伺服器可在終端機按 `Ctrl + C`。

如果終端機顯示找不到 `dev`，通常是因為目前不在專案根目錄。Windows 可使用：

```powershell
cd "C:\Users\ROG\Documents\ChatGPT\zebrafish-fuwariblog"
pnpm run dev
```

## 2. 讀者功能

### 導覽

頂部導覽列可前往首頁、文章彙整、稍後閱讀、關於頁和 GitHub。手機版請點選右上角選單按鈕。

### 搜尋文章

點選「搜尋」按鈕，或使用 `Ctrl + K`（macOS 使用 `⌘ + K`）。搜尋會比對文章標題、摘要、分類和標籤。點擊結果即可開啟文章；「瀏覽全部文章」可進入完整彙整頁。

### 篩選和排序

文章彙整頁提供：

- 關鍵字搜尋
- 分類篩選
- 多個標籤篩選
- 最新、最早或標題排序
- 只顯示稍後閱讀
- 顯示未分類文章

篩選條件會同步到網址，因此可以複製網址保存或分享。點選「清除篩選」即可回到全部文章。

### 稍後閱讀

在文章卡片或文章頁點選「稍後閱讀」。收藏只儲存在目前瀏覽器，不需要登入；清除瀏覽器網站資料後收藏也會消失。

### 閱讀工具

文章頁提供縮小／放大字級、重設字級、專注閱讀、複製文章連結和閱讀進度顯示。專注閱讀會暫時隱藏側欄，讓文章內容更集中。

### 深色模式和主題色

右上角可切換亮色、暗色或跟隨系統模式，也可以調整主題色彩。設定會保存在目前瀏覽器中。

## 3. 修改網站內容

### 修改網站名稱和導覽

編輯 [`src/config.ts`](../src/config.ts)：

```ts
siteConfig.title       // 網站名稱
siteConfig.subtitle    // 副標題
siteConfig.description // SEO 描述
siteConfig.url         // 正式網址
```

導覽列在 `navBarConfig.links` 修改；作者名稱、簡介、頭像和社交連結在 `profileConfig` 修改。

### 修改首頁 Banner

Banner 設定也在 `src/config.ts`：

```ts
banner: {
  enable: true,
  src: "assets/images/demo-banner.png",
  position: "center",
}
```

把圖片放到 `src/assets/images/`，再將 `src` 改成檔案路徑。`position` 可使用 `top`、`center` 或 `bottom`。若不想顯示 Banner，將 `enable` 改為 `false`。

### 修改作者頭像

將圖片放到 `src/assets/images/`，再修改：

```ts
profileConfig.avatar = "assets/images/my-avatar.jpg"
```

建議使用正方形、至少 400×400 像素的 JPG 或 PNG。

### 修改關於頁

編輯 [`src/content/spec/about.md`](../src/content/spec/about.md)。這是標準 Markdown 檔案，可使用標題、段落、清單、連結和圖片。

## 4. 新增文章

### 建立文章檔案

執行：

```bash
pnpm new-post my-first-post
```

這會建立 `src/content/posts/my-first-post.md`。若文章需要本地封面和多張圖片，建議使用文章資料夾：

```text
src/content/posts/my-first-post/
├── index.md
├── cover.jpg
└── diagram.png
```

### Frontmatter

`index.md` 開頭必須包含：

```yaml
---
title: 我的第一篇文章
published: 2026-09-12
updated: 2026-09-13
description: 一兩句話介紹文章內容。
image: "./cover.jpg"
tags: [Astro, Blogging]
category: 技術筆記
draft: false
lang: zh_TW
---
```

`title` 和 `published` 是必填欄位。`draft: true` 的文章不會出現在正式建置結果中。

### 撰寫正文

正文使用 Markdown：

````md
## 小節標題

這是段落，可使用 **粗體**、*斜體*、連結和清單。

![圖片替代文字](./diagram.png)

```ts
console.log("Hello Zebrafish");
```
````

頁面會自動產生目錄、閱讀時間、字數、文章封面和延伸閱讀。文章正文建議從 `##` 開始，將 `title` 留給頁面主標題。

## 5. 圖片路徑規則

| 寫法 | 圖片位置 |
| --- | --- |
| `./cover.jpg` | 與文章 `index.md` 同一資料夾 |
| `/images/cover.jpg` | `public/images/cover.jpg` |
| `https://example.com/a.jpg` | 外部圖片網址 |

本地文章圖片最好與文章放在同一個資料夾，Astro 會自動處理最佳化。每張圖片都應提供有意義的替代文字；照片可先壓縮成 JPG 或 WebP。

## 6. 建置與發布

提交前先執行：

```bash
pnpm check
pnpm test
pnpm build
```

`pnpm build` 會產生正式網站到 `dist/`，同時重建搜尋索引。確認沒有錯誤後提交並推送：

```bash
git add .
git commit -m "Update blog content"
git push origin main
```

GitHub Actions 會自動執行檢查和建置。若已連接 Vercel，推送 `main` 後通常會自動部署。

## 7. 常見問題

### 修改後頁面沒有更新

確認開發伺服器仍在執行，並重新整理瀏覽器。若修改的是圖片，可能需要完全重新整理。

### 文章沒有出現

檢查 frontmatter 的 `draft` 是否為 `false`，日期是否使用 `YYYY-MM-DD`，以及檔案是否放在 `src/content/posts/`。

### 圖片找不到

檢查路徑和大小寫。文章資料夾圖片使用 `./檔名`；`public` 圖片使用 `/資料夾/檔名`。

### 搜尋找不到剛新增的文章

開發環境會使用備用搜尋索引；正式環境請重新執行 `pnpm build`，讓 Pagefind 重新建立索引。

### 不小心想隱藏文章

將該文章的 `draft` 改為 `true` 即可，不需要刪除檔案。
