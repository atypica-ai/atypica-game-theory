# Legacy Scripts

历史的迁移或者升级脚本

## 按时间分类

### 2025-03 月 (5 个脚本)

#### 1. import-personas.js
- **日期**: 2025-03-13
- **目的**: 从 YAML 文件批量导入 Persona 数据
- **功能**: 读取 `public/personas/` 目录下的 YAML 文件并创建数据库记录
- **状态**: ✅ 已完成历史任务，可归档

#### 2. test-cipher.mjs
- **日期**: 2025-03-26
- **目的**: 测试加密/解密功能
- **功能**: 测试 AES-256-CBC 加密算法，用于 Analyst ID 的 token 编码
- **关联**: 为报告 token 功能开发的测试工具
- **状态**: ✅ 测试工具，可归档

#### 3. generate-cover-svg.js
- **日期**: 2025-03-29
- **目的**: 为历史报告生成 SVG 封面图
- **功能**: 使用 AI 为每个 Analyst 报告生成矢量封面图 (600x300px)
- **状态**: ✅ 历史数据处理，可归档

#### 4. migrate-analyst-report.js
- **日期**: 2025-03-28
- **目的**: 重构报告存储结构
- **功能**: 将 Analyst 表中的 `report` 字段迁移到独立的 `AnalystReport` 表
- **数据库变更**: 创建 AnalystReport 表，添加 token、coverSvg 等字段
- **状态**: ✅ 数据迁移已完成，可归档

#### 5. legacy-seed.js
- **日期**: 2025-04-02
- **目的**: 创建支付产品数据
- **功能**: 初始化 Ping++ 和 Stripe 的产品定义（TOKENS1M, PRO1MONTH 等）
- **状态**: ✅ 初始化脚本，可归档

### 2025-04 月 (7 个脚本)

#### 6. set-userchat-token.js
- **日期**: 2025-04-05
- **目的**: 为 UserChat 添加 token 字段
- **功能**: 为所有缺少 token 的 UserChat 记录生成唯一标识符
- **背景**: 从 ID-based URL 迁移到 token-based URL
- **状态**: ✅ 数据迁移已完成，可归档

#### 7. migrate-report-args.js
- **日期**: 2025-04-05
- **目的**: 更新 generateReport 工具调用参数
- **功能**: 将工具调用中的 `reportId` 迁移为 `reportToken`
- **影响**: Study chat 中的所有 generateReport 工具调用记录
- **状态**: ✅ 数据迁移已完成，可归档

#### 8. migrate-chat-messages.js
- **日期**: 2025-04-10
- **目的**: 重构消息存储结构
- **功能**: 将 Interview 的 messages 从嵌入字段迁移到独立的 ChatMessage 表
- **数据库变更**: 创建 UserChat 和 ChatMessage 表
- **状态**: ✅ 重大架构迁移已完成，可归档

#### 9. migrate-social-data.js
- **日期**: 2025-04-18
- **目的**: 修复社交媒体数据格式
- **功能**: 更新 Scout 工具调用结果中的用户图片数据结构 (`images` → `avatar`)
- **影响**: Scout chat 中的所有社交媒体搜索结果
- **状态**: ✅ 数据格式修正完成，可归档

#### 10. migrate-tokens.js
- **日期**: 2025-04-19
- **目的**: 从积分系统迁移到 Token 系统
- **功能**: 重新计算历史 Token 记录的值（将 points 转换为 tokens）
- **转换规则**:
  - 注册赠送: 200W tokens
  - 充值: 100W tokens
  - 消耗: -50W tokens
  - 礼物: 每点 = 50W tokens
- **状态**: ✅ 计费系统迁移完成，可归档

#### 11. fix-duplicated-request-interaction.js
- **日期**: 2025-04-20
- **目的**: 修复历史消息中的重复交互问题
- **功能**: 清理重复的 request/tool-call 交互记录
- **问题**: #40 issue - 消息历史中存在重复的工具调用记录
- **状态**: ✅ Bug 修复完成，可归档

#### 12. find-report-with-missing-img.js
- **日期**: 2025-06-03
- **目的**: 检测缺失图片的报告
- **功能**: 查找 HTML 报告中包含失效图片链接的记录
- **用途**: 数据质量检查和修复
- **状态**: ⚠️ 诊断工具，可能仍有用

### 2025-05-06 月 (4 个脚本)

#### 13. create-persona-embeddings.js
- **日期**: 2025-05-14
- **目的**: 为 Persona 生成向量嵌入
- **功能**: 批量为所有 Persona 创建 768 维向量嵌入（用于相似度搜索）
- **技术**: pgvector + OpenAI embeddings
- **状态**: ✅ 历史数据处理完成，可归档

#### 14. migrate-analyst.js
- **日期**: 2025-05-18
- **目的**: Analyst 表结构调整
- **功能**: 迁移 `userId` 和 `brief` 字段
- **状态**: ✅ Schema 迁移完成，可归档

#### 15. migrate-interview-instruction.js
- **日期**: 2025-05-18
- **目的**: Interview 指令字段迁移
- **功能**: 更新访谈项目的 instruction 字段结构
- **状态**: ✅ 数据迁移完成，可归档

#### 16. fill-analyst-kind.js
- **日期**: 2025-06-09
- **目的**: 填充 Analyst kind 字段
- **功能**: 为历史 Analyst 记录添加 kind 分类（personal, insight, pro）
- **背景**: 新增 Analyst 类型分类功能
- **状态**: ✅ 数据补充完成，可归档

### 2025-07-08 月 (4 个脚本)

#### 17. migrate-analyst-attachments.js
- **日期**: 2025-07-23
- **目的**: 迁移 Analyst 附件数据
- **功能**: 将 Analyst 的附件从嵌入字段迁移到独立表
- **状态**: ✅ 数据迁移完成，可归档

#### 18. migrate-interview-projects.js
- **日期**: 2025-07-27
- **目的**: 迁移旧版访谈项目数据
- **功能**: 将 legacy interview 数据迁移到新的 InterviewProject 结构
- **状态**: ✅ 数据迁移完成，可归档

#### 19. link-usertokens-to-subscription.js
- **日期**: 2025-08-06
- **目的**: 关联 Token 账户和订阅
- **功能**: 为团队添加唯一约束，关联 userTokens/teamTokens 到订阅记录
- **状态**: ✅ 数据关系修正完成，可归档

#### 20. link-customer-to-stripe.js
- **日期**: 2025-08-07
- **目的**: 关联用户到 Stripe 客户
- **功能**: 建立本地用户和 Stripe Customer ID 的映射关系
- **状态**: ✅ Stripe 集成迁移完成，可归档

### 2025-10-12 月 (11 个脚本)

#### 21. generate-persona-tokens.ts
- **日期**: 2025-10-19
- **目的**: 为 Persona 生成唯一 token
- **功能**: 批量为所有 Persona 添加唯一标识符
- **背景**: Persona 从 ID-based 迁移到 token-based URL
- **状态**: ✅ 数据迁移完成，可归档

#### 22. upsert-user-profiles.ts
- **日期**: 2025-10-20
- **目的**: 重构用户资料存储
- **功能**: 将 User.extra 中的数据迁移到独立的 UserProfile 表
- **数据库变更**: 创建 UserProfile 表
- **状态**: ✅ Schema 重构完成，可归档

#### 23. generate-podcast-titles.ts
- **日期**: 2025-11-09
- **目的**: 批量生成播客标题
- **功能**: 使用 AI 为历史播客生成吸引人的标题
- **状态**: ✅ 历史数据处理完成，可归档

#### 24. generate-podcast-shownotes.ts
- **日期**: 2025-11-09
- **目的**: 批量生成播客 Show Notes
- **功能**: 为播客生成详细的节目说明
- **状态**: ✅ 历史数据处理完成，可归档

#### 25. migrate-questions-to-array.ts
- **日期**: 2025-11-09
- **目的**: 访谈问题结构重构
- **功能**: 将 `optimizedQuestions` 替换为直接的 `questions` 数组管理
- **影响**: InterviewProject 表结构
- **状态**: ✅ Schema 重构完成，可归档

#### 26. fix-podcast-metadata.ts
- **日期**: 2025-11-13
- **目的**: 修复播客元数据
- **功能**: 更新 podcast metadata 和 show notes 生成逻辑
- **状态**: ✅ 数据修正完成，可归档

#### 27. process-attachment-files.ts
- **日期**: 2025-11-16
- **目的**: 处理上传的附件文件
- **功能**: 自动压缩附件中的文本内容，优化存储
- **状态**: ⚠️ 可能仍需用于批量处理历史附件

#### 28. clean-study-message-attachments.ts
- **日期**: 2025-11-17
- **目的**: 清理 Study chat 的附件
- **功能**: 在 study chat 开始前自动处理附件
- **状态**: ✅ 功能已集成到主流程，脚本可归档

#### 29. migrate-selectquestion-tool.ts
- **日期**: 2025-11-20
- **目的**: 迁移 selectQuestion 工具调用
- **功能**: 更新访谈中的 selectQuestion 工具调用格式
- **状态**: ✅ 数据迁移完成，可归档

#### 30. migrate-apikey-to-table.ts
- **日期**: 2025-12-05
- **目的**: API Key 存储重构
- **功能**: 将 TeamConfig 中的 API Key 迁移到独立的 ApiKey 表
- **数据库变更**: 创建 ApiKey 表
- **状态**: ⚠️ 最近的迁移，可能需要保留观察

## 按功能分类

### 1. 数据库 Schema 迁移 (11 个)

#### 重大架构变更
- **migrate-chat-messages.js** - 消息存储独立化
- **migrate-analyst-report.js** - 报告存储独立化
- **upsert-user-profiles.ts** - 用户资料独立化
- **migrate-apikey-to-table.ts** - API Key 独立化

#### URL Token 化迁移
- **set-userchat-token.js** - UserChat token
- **generate-persona-tokens.ts** - Persona token

#### 字段和关系调整
- **migrate-analyst.js** - Analyst 字段迁移
- **migrate-analyst-attachments.js** - 附件独立化
- **migrate-interview-instruction.js** - Interview 指令
- **migrate-interview-projects.js** - 访谈项目结构
- **link-usertokens-to-subscription.js** - Token 订阅关联

### 2. 数据格式修正 (6 个)

#### 工具调用格式
- **migrate-report-args.js** - generateReport 参数
- **migrate-selectquestion-tool.ts** - selectQuestion 格式
- **migrate-questions-to-array.ts** - 问题数组结构

#### 数据内容格式
- **migrate-social-data.js** - 社交媒体数据
- **migrate-tokens.js** - Token 值重算
- **fix-duplicated-request-interaction.js** - 重复记录清理

### 3. 内容生成和处理 (7 个)

#### AI 生成内容
- **generate-cover-svg.js** - 报告封面图
- **generate-podcast-titles.ts** - 播客标题
- **generate-podcast-shownotes.ts** - 播客说明

#### 向量和嵌入
- **create-persona-embeddings.js** - Persona 向量化

#### 附件处理
- **process-attachment-files.ts** - 附件压缩
- **clean-study-message-attachments.ts** - Study 附件清理

#### 元数据修正
- **fix-podcast-metadata.ts** - 播客元数据

### 4. 数据导入和初始化 (3 个)

- **import-personas.js** - 批量导入 Persona
- **legacy-seed.js** - 支付产品初始化
- **link-customer-to-stripe.js** - Stripe 客户关联

### 5. 数据补全 (1 个)

- **fill-analyst-kind.js** - 补充 Analyst 分类

### 6. 诊断和测试工具 (2 个)

- **test-cipher.mjs** - 加密测试
- **find-report-with-missing-img.js** - 图片检测

## 建议

### ✅ 可以安全删除 (26 个)

以下脚本已完成历史任务，不再需要：

**Schema 迁移 (已完成)**:
1. migrate-chat-messages.js
2. migrate-analyst-report.js
3. upsert-user-profiles.ts
4. set-userchat-token.js
5. generate-persona-tokens.ts
6. migrate-analyst.js
7. migrate-analyst-attachments.js
8. migrate-interview-instruction.js
9. migrate-interview-projects.js
10. link-usertokens-to-subscription.js

**数据格式修正 (已完成)**:
11. migrate-report-args.js
12. migrate-selectquestion-tool.ts
13. migrate-questions-to-array.ts
14. migrate-social-data.js
15. migrate-tokens.js
16. fix-duplicated-request-interaction.js

**一次性内容生成 (已完成)**:
17. generate-cover-svg.js
18. generate-podcast-titles.ts
19. generate-podcast-shownotes.ts
20. create-persona-embeddings.js
21. clean-study-message-attachments.ts
22. fix-podcast-metadata.ts

**初始化脚本 (已完成)**:
23. import-personas.js
24. legacy-seed.js
25. link-customer-to-stripe.js
26. fill-analyst-kind.js

### ⚠️ 建议保留观察 (3 个)

以下脚本可能仍有用途，建议保留一段时间：

1. **migrate-apikey-to-table.ts**
   - 最近的迁移 (2025-12-05)
   - 建议观察 1-2 个月确认无问题后再删除

2. **process-attachment-files.ts**
   - 可能需要用于批量处理历史附件
   - 如果有新的历史数据需要处理，可能会用到

3. **find-report-with-missing-img.js**
   - 数据质量检查工具
   - 可移到 utils/ 目录作为常用诊断工具

### 🗑️ 可以立即删除 (1 个)

- **test-cipher.mjs** - 测试工具，无生产用途

## 迁移历史总结

### 重大架构演进

1. **2025-03**: 报告系统重构 (report → AnalystReport)
2. **2025-04**: 消息系统重构 (embedded → ChatMessage 表)
3. **2025-04**: URL Token 化 (ID → token)
4. **2025-04**: 计费系统演进 (points → tokens)
5. **2025-10**: 用户系统重构 (User.extra → UserProfile)
6. **2025-12**: API Key 系统重构 (TeamConfig → ApiKey 表)

### 数据处理模式

大部分脚本遵循相似的模式：
1. 查询需要迁移的数据
2. 转换数据格式
3. 批量更新数据库
4. 验证迁移结果

### 经验教训

- 所有重大 schema 变更都有对应的迁移脚本
- URL 从 ID-based 逐步迁移到 token-based
- 数据结构从嵌入式逐步独立化为独立表
- AI 生成内容的批量处理需求

---

最后更新：2025-12
