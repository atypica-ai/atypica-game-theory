# 图片存储路径说明

## 图片存储位置

请将生成的图片存储在以下路径：

```
public/_public/creator-images/
```

## 需要的图片文件

根据 `FeatureSection` 的三个功能，需要以下图片：

1. **research.png** - AI Research 功能的图片
   - 路径：`public/_public/creator-images/research.png`
   - 访问URL：`/_public/creator-images/research.png`

2. **persona.png** - AI Persona 功能的图片
   - 路径：`public/_public/creator-images/persona.png`
   - 访问URL：`/_public/creator-images/persona.png`

3. **podcast.png** - AI Podcast 功能的图片
   - 路径：`public/_public/creator-images/podcast.png`
   - 访问URL：`/_public/creator-images/podcast.png`

## 图片规格建议

- **尺寸**：建议 800x800px 或更大（正方形）
- **格式**：PNG（支持透明）或 JPG
- **风格**：与 AIGC_PROMPTS.md 中的提示词一致

## 使用方式

1. 创建目录（如果不存在）：
   ```bash
   mkdir -p public/_public/creator-images
   ```

2. 将生成的图片放入该目录，命名为对应的文件名

3. 图片会自动在页面上显示

## 注意事项

- 如果图片不存在，页面会显示占位符文本
- 图片路径使用 Next.js 的 public 目录标准
- 确保图片文件名与代码中的 `feature.id` 一致


