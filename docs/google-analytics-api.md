# Google Analytics 页面浏览量统计脚本

这个脚本可以帮你从 Google Analytics 4 (GA4) 中获取特定页面的浏览数据，特别是 `/study/*/share/` 路径的页面。

## 设置步骤

### 1. 创建 Google Cloud 项目和服务账号

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 Google Analytics Data API
4. 创建服务账号：
   - 导航到 "IAM & Admin" > "Service Accounts"
   - 点击 "Create Service Account"
   - 填写服务账号信息
   - 下载 JSON 密钥文件

### 2. 在 Google Analytics 中授权服务账号

1. 登录 [Google Analytics](https://analytics.google.com/)
2. 选择你的 GA4 属性
3. 转到 "Admin" > "Property Access Management"
4. 点击 "+" 添加用户
5. 输入服务账号的邮箱地址（在 JSON 文件中的 `client_email`）
6. 选择 "Viewer" 权限

### 3. 配置环境变量

在项目根目录的 `.env` 文件中添加以下配置：

```bash
# Google Analytics 4 Property ID (格式: 数字，例如 123456789)
GA4_PROPERTY_ID=你的GA4属性ID

# Google 服务账号认证 (二选一)
# 方式1: 服务账号密钥文件路径
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json

# 方式2: 直接设置服务账号 JSON 内容 (Base64 编码)
# GOOGLE_APPLICATION_CREDENTIALS_JSON=base64编码的JSON内容
```

### 4. 找到 GA4 Property ID

1. 在 Google Analytics 中，点击左下角的 "Admin" (管理)
2. 在 "Property" 列中，你会看到属性名称下方有一个以数字开头的 ID
3. 或者在 "Property Settings" 中查看 "Property ID"

## 使用方法

### 运行脚本

```bash
# 获取最近30天的数据
pnpm tsx scripts/analytics-report.ts

# 或使用 node
node -r ts-node/register scripts/analytics-report.ts
```

### 自定义时间范围

你可以修改脚本中的 `startDate` 和 `endDate` 参数：

```typescript
// 获取最近7天的数据
const reports = await reporter.getPageViews('/study/*/share/', '7daysAgo', 'today');

// 获取指定日期范围的数据
const reports = await reporter.getPageViews('/study/*/share/', '2024-01-01', '2024-01-31');
```

### 输出示例

```
🔍 正在获取 /study/*/share/ 页面的浏览数据...

📊 总体统计 (最近30天):
  总页面浏览量: 1,234
  总会话数: 987
  总用户数: 756

📄 /study/*/share/ 页面详细数据:
────────────────────────────────────────────────────────────────────────────────
页面路径                                          浏览量      会话数      用户数
────────────────────────────────────────────────────────────────────────────────
/study/abc123/share/                              45         38         32
/study/def456/share/                              23         20         18
/study/ghi789/share/                              12         11         10
────────────────────────────────────────────────────────────────────────────────
Share页面合计                                     80         69         60
────────────────────────────────────────────────────────────────────────────────

✅ 找到 3 个 /study/*/share/ 页面
📈 Share页面总浏览量: 80
```

## 故障排除

### 常见错误

1. **"请在环境变量中设置 GA4_PROPERTY_ID"**
   - 检查 `.env` 文件中的 `GA4_PROPERTY_ID` 是否正确设置

2. **"Authentication error"**
   - 检查 `GOOGLE_APPLICATION_CREDENTIALS` 路径是否正确
   - 确认服务账号 JSON 文件存在且可读
   - 验证服务账号是否在 GA4 中有访问权限

3. **"Property not found"**
   - 检查 GA4 Property ID 是否正确
   - 确认使用的是 GA4 (不是 Universal Analytics)

4. **"No data returned"**
   - 检查页面路径过滤条件
   - 确认指定时间范围内有数据
   - 验证页面是否真的存在访问记录

### 调试模式

可以在脚本中添加调试信息：

```typescript
// 在 main() 函数开头添加
console.log('Property ID:', process.env.GA4_PROPERTY_ID);
console.log('Credentials:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? '已设置' : '未设置');
```

## 扩展功能

你可以修改脚本来：

- 获取其他页面路径的数据
- 添加更多指标（跳出率、平均会话时长等）
- 导出数据到 CSV 或 JSON 文件
- 设置定时任务自动生成报告
- 添加数据可视化图表