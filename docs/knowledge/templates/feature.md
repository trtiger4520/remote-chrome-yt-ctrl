---
type: Template
title: Feature document template
description: 建立新 Feature concept 時使用的必要 frontmatter 與內容結構
tags:
  - template
  - feature
  - documentation
status: active
code_paths:
  - docs/knowledge/features
---

# Feature document template

複製本文件內容後：

1. 將 `type` 改成 `Feature`
2. 使用 kebab-case filename
3. 填寫具體 title、description、tags、status 與 code_paths
4. 刪除本段模板說明
5. 將新文件加入 `features/index.md`

建議結構：

```markdown
# 功能名稱

## 使用者目的

## 目前行為

## 元件與資料流

## 狀態與規則

## 失敗與復原

## 安全與限制

## 非目標

## 主要程式位置

## 驗證

## 變更觸發

## 相關文件
```

功能文件只描述目前成立的設計

需要保留的歷史取捨建立 `type: Decision` 文件，再由 Feature 使用相對連結引用
