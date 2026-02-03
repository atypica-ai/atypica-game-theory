# Format Content API

Stream 输出格式化 HTML 的 API，用于将长文本内容（如社交媒体趋势研究、观众反馈分析等）转换为结构化、美观的 HTML 展示。

## API Endpoint

```
POST /api/format-content
```

## Request Body

```typescript
{
  content: string;        // 要格式化的文本内容
  locale: Locale;         // 语言（从 next-intl 获取）
  instruction?: string;   // 可选：额外的格式化指令
}
```

## Response

Text stream 格式的 HTML 内容。

## 使用方式

### 方式 1: 使用 React Hook（推荐）

```tsx
'use client';
import { useFormatContent } from '@/app/api/format-content/useFormatContent';
import { useLocale } from 'next-intl';

function MyComponent({ longText }: { longText: string }) {
  const locale = useLocale();
  const { formattedHtml, isLoading, formatContent } = useFormatContent({
    onComplete: (html) => console.log('格式化完成！'),
  });

  const handleFormat = async () => {
    await formatContent({
      content: longText,
      locale,
    });
  };

  return (
    <div>
      <button onClick={handleFormat} disabled={isLoading}>
        {isLoading ? '格式化中...' : '格式化内容'}
      </button>

      {formattedHtml && (
        <div
          className="formatted-content"
          dangerouslySetInnerHTML={{ __html: formattedHtml }}
        />
      )}
    </div>
  );
}
```

### 方式 2: 直接调用 API

```typescript
import { formatContentComplete } from '@/app/api/format-content/useFormatContent';
import { getLocale } from 'next-intl/server';

async function formatMyContent(text: string) {
  const locale = await getLocale();
  const html = await formatContentComplete({
    content: text,
    locale,
  });

  console.log(html);
  return html;
}
```

### 方式 3: 手动处理 Stream

```typescript
import { useLocale } from 'next-intl';

const locale = useLocale();
const response = await fetch('/api/format-content', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: longText,
    locale,
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let html = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  html += decoder.decode(value, { stream: true });
  console.log('当前 HTML:', html);
}
```

## 格式化说明

使用统一的格式化系统，自动根据内容选择合适的布局。支持多种布局组合：

- 策略卡片、洞察卡片、对比卡片
- 统计卡片、表格、时间线
- 引用块、列表、高亮框、标签组

适用于：
- `scoutSocialTrends` - 社交媒体趋势研究
- `audienceCall` - 观众反馈分析
- 任意长文本内容

**示例**:
```typescript
import { useLocale } from 'next-intl';

const locale = useLocale();
await formatContent({
  content: scoutSocialTrendsResult.summary,
  locale,
});
```

## 额外指令

可以通过 `instruction` 字段提供额外的格式化要求：

```typescript
import { useLocale } from 'next-intl';

const locale = useLocale();
await formatContent({
  content: longText,
  locale,
  instruction: '请特别强调小红书平台的数据，用策略卡片展示核心发现',
});
```

## 样式说明

生成的 HTML 使用 Tailwind CSS 类名，遵循极简主义设计：

- **配色**: 黑白为主，绿色 (#1bff1b) 仅用于装饰（小圆点、边框）
- **字体层次**: 通过 font-bold、font-semibold 和字体大小表达层次
  - 标题最大 text-base，正文 text-sm，元数据 text-xs
- **布局**: 紧凑、小圆角 (rounded)、小间距 (p-3, mb-2, space-y-3)
- **响应式**: 自动适配移动端 (md:grid-cols-2, md:grid-cols-4)
- **主题变量**: 使用 Tailwind 主题变量，自动适配亮色/暗色模式

## 安全注意事项

使用 `dangerouslySetInnerHTML` 渲染 HTML 时，请确保：

1. 内容来自可信源（API 生成）
2. 如果需要展示用户输入的内容，先进行 sanitize
3. 考虑使用 Content Security Policy (CSP)

## 性能优化

- API 使用 streaming 返回，可以实时展示生成进度
- 前端可以使用 `onChunk` 回调实现打字机效果
- 生成的 HTML 可以缓存，避免重复格式化

## 集成到 Product R&D Agent

在 Product R&D Agent 中使用：

```typescript
import { useLocale } from 'next-intl';

// 在工具返回后，前端自动调用格式化 API
const locale = useLocale();
const { formattedHtml, formatContent } = useFormatContent();

useEffect(() => {
  if (scoutSocialTrendsResult) {
    formatContent({
      content: scoutSocialTrendsResult.summary,
      locale,
    });
  }
}, [scoutSocialTrendsResult, locale, formatContent]);

// 渲染格式化后的 HTML
return (
  <div>
    <div dangerouslySetInnerHTML={{ __html: formattedHtml }} />
  </div>
);
```

## 示例输出

格式化后的 HTML 大致结构：

```html
<div class="max-w-4xl mx-auto space-y-3">
  <!-- 标题 -->
  <div class="text-base font-bold mb-3">社交媒体趋势研究</div>

  <!-- 统计卡片 -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-2 my-3">
    <div class="bg-muted rounded p-3 text-center">
      <div class="text-base font-bold">5</div>
      <div class="text-xs">平台覆盖</div>
    </div>
  </div>

  <!-- 策略卡片 -->
  <div class="bg-muted rounded p-3 my-3 border-l-4 border-[#1bff1b]">
    <div class="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">策略</div>
    <div class="text-base font-bold mb-1">核心建议</div>
    <div class="text-sm">具体策略内容...</div>
  </div>

  <!-- 洞察卡片 -->
  <div class="bg-muted border border-border rounded p-3 my-2">
    <div class="flex items-start gap-2">
      <div class="shrink-0 w-1.5 h-1.5 rounded-full bg-[#1bff1b] mt-1.5"></div>
      <div class="flex-1">
        <div class="text-sm font-semibold mb-1">关键发现</div>
        <div class="text-sm">洞察内容...</div>
      </div>
    </div>
  </div>
</div>
```
