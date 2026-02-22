# Panel 使用手册（简版）

## 1. Panel 是什么
Panel 用来做研究：
- 先准备一组 Persona（Panel）
- 再围绕研究问题发起项目（Project）
- Agent 自动执行讨论与访谈
- 你在项目页查看结构化结果

## 2. 入口页面
- 面板列表：`/panels`
- 面板详情：`/panel/{panelId}`
- 项目详情：`/panel/project/{userChatToken}`

## 3. 创建 Panel
1. 进入 `/panels`，点击「创建新 Panel」。
2. 在弹出的 Dialog 中输入需求描述（如"我需要对可持续时尚感兴趣的 Z 世代消费者"）。
3. 点击创建后，Dialog 内会依次展示进度：
   - **搜索中**：Agent 正在搜索匹配的 Persona
   - **选择人物**：搜索结果自动预填充到选择器中，你可以增删调整后确认
   - **创建中**：Agent 正在保存 Panel
   - **完成**：显示 Panel 名称和链接，可直接跳转查看
4. 全程无需离开 Dialog，创建完成后列表自动刷新。

## 4. 新建研究项目
1. 进入 `/panel/{panelId}`，点击「新建项目」。
2. 选择项目类型：
   - **用户访谈**：使用 `interviewChat` 对每个 Persona 进行 1-on-1 深度访谈，聚焦消费者动机和痛点
   - **专家访谈**：使用 `interviewChat` 对专家 Persona 进行 1-on-1 专业咨询，聚焦行业趋势和建议
   - **焦点小组**：使用 `discussionChat` 让所有 Persona 同时参与讨论，聚焦观点碰撞和共识
3. 输入研究问题，点击开始。
4. 系统创建项目并启动 Agent，自动跳转到项目详情页。

## 5. 查看研究结果
- 项目详情页（`/panel/project/{token}`）：
  - 顶部显示项目状态（运行中会显示 Agent Running）
  - 中部通过 Tab 切换 `Discussion` / `Interviews`
  - `Discussion`：群体讨论过程、总结、会议纪要
  - `Interviews`：每个 Persona 的访谈与结论
- 需要干预研究方向时，点击「View Agent Chat」回到对话页继续指挥 Agent。

## 6. 页面结构
- 面板详情页（`/panel/{panelId}`）：
  - 上半部分是该 Panel 下的研究项目列表
  - 下半部分是 Persona 列表与属性（点击可查看详情）

## 7. 实用建议
- 提问尽量具体：目标人群、场景、要比较的维度写清楚。
- 把 Panel 当作可复用模板：同一组 Persona 可多次用于不同研究问题。
- 先看 Discussion 总体观点，再看 Interviews 的个体差异。
- 用户访谈适合理解个体动机，焦点小组适合观察群体观点碰撞。

## 8. 常见现象
- 刚创建项目时可能暂时没有结果：Agent 仍在执行。
- 运行中状态会自动刷新；完成后状态会消失。
- 创建 Panel 时 Dialog 中的搜索结果会自动预填充，无需手动重新搜索。
