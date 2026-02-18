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

## 3. 标准使用流程
1. 进入 `/panels`，选择已有 Panel，或先创建一个 Panel。
2. 进入 `/panel/{panelId}`，点击「新建项目」，输入研究问题。
3. 系统创建项目并启动 Agent，自动跳转到项目详情页。
4. 在 `/panel/project/{userChatToken}` 查看结果：
   - `Discussion`：群体讨论过程、总结、会议纪要
   - `Interviews`：每个 Persona 的访谈与结论
5. 需要干预研究方向时，点击「View Agent Chat」回到对话页继续指挥 Agent。

## 4. 页面怎么看
- 面板详情页（`/panel/{panelId}`）：
  - 上半部分是该 Panel 下的研究项目列表
  - 下半部分是 Persona 列表与属性
- 项目详情页（`/panel/project/{token}`）：
  - 顶部显示项目状态（运行中会显示 Agent Running）
  - 中部通过 Tab 切换 `Discussion` / `Interviews`

## 5. 实用建议
- 提问尽量具体：目标人群、场景、要比较的维度写清楚。
- 把 Panel 当作可复用模板：同一组 Persona 可多次用于不同研究问题。
- 先看 Discussion 总体观点，再看 Interviews 的个体差异。

## 6. 常见现象
- 刚创建项目时可能暂时没有结果：Agent 仍在执行。
- 运行中状态会自动刷新；完成后状态会消失。
