# atypica.AI 主页文案编辑文档

> 本文档包含主页所有文案内容，可直接在此文档中修改，然后更新到对应的翻译文件中。

## 🎯 Hero Section (主页顶部)

### 品牌标语

**Technical Tagline (subtitle)**

```
> AI-powered market research that understands what really drives human decisions
```

### 统计数据标签

**Statistics Labels**

- **AI Personas Created**: `50K+`
- **Interviews Conducted**: `100K+`
- **Trust Statement**: `Trusted by individuals from leading organizations`

---

## 🎨 Features Section (功能特性)

### 区块标题

**Section Badge**

```
How It Works
```

**Section Title**

```
From question to insights in minutes
```

**Section Description**

```
Our AI system automatically builds personas, conducts interviews, and analyzes patterns to reveal the emotional and cognitive factors behind human choices.
```

### 四大功能特性

#### 1. AI 人格生成

**Title**: `AI Persona Generation`
**Description**:

```
Automatically create diverse AI personas based on real behavioral patterns and demographic insights
```

#### 2. 专家主导访谈

**Title**: `Expert-Led Interviews`
**Description**:

```
AI experts conduct natural conversations with personas to uncover deep motivations and decision drivers
```

#### 3. 行为分析

**Title**: `Behavioral Analysis`
**Description**:

```
Identify emotional triggers, cognitive biases, and cultural factors that influence real purchasing decisions
```

#### 4. 即时洞察

**Title**: `Instant Insights`
**Description**:

```
Get comprehensive studies in 10-20 minutes instead of weeks of traditional surveying
```

---

## 🎬 Demo Section (演示区域)

### 区块标题

**Section Badge**

```
Live Example
```

**Section Title**

```
Real research in action
```

**Section Description**

```
See how AI personas reveal authentic insights about sustainable packaging preferences
```

### Kahneman 引言

**Quote Text**

```
People don't choose between things, they choose between descriptions of things.
```

**Quote Author**

```
Daniel Kahneman
```

### 终端模拟

**Terminal Title**

```
Study Process
```

**Command**

```
$ atypica research "sustainable packaging preferences in European markets"
```

**Process Steps**

- **Scout**: `→ Analyzing social conversations and market discussions`
- **Builder**: `→ Building 8 distinct consumer personas with unique motivations`
- **Expert**: `→ Conducting in-depth interviews about purchasing decisions`
- **Analyst**: `→ Identifying key emotional and practical decision factors`
- **Complete**: `✓ Study complete: 12 minutes, 8 personas interviewed, 4 actionable insights`

### 访谈示例

**Interview Title**

```
Sample AI Interview
```

**Profile Section**

- **Label**: `PERSONA PROFILE`
- **Name**: `Sarah`
- **Details**: `Environmental Advocate | Age 34 | Working Mother`
- **Pattern**: `Values-driven with strong social influence factors`

**Conversation Flow**

- **Expert Role**: `Study Expert:`
- **Persona Role**: `Sarah (AI Persona):`

**Question 1**

```
What goes through your mind when choosing packaged products?
```

**Answer 1**

```
I always check for recycling symbols first, even before price. My daughter actually holds me accountable - she'll point out if something isn't eco-friendly. I'm willing to pay 15-20% more because it reflects our family values.
```

**Question 2**

```
How do you tell real sustainability from marketing hype?
```

**Answer 2**

```
I rely heavily on my mom network online. Word travels fast in our community when brands are caught greenwashing. Once trust is broken with a brand, it's really hard for them to win me back.
```

---

## 📚 Featured Studies (精选研究)

### 区块标题

**Section Title**

```
Featured Studies
```

**Section Description**

```
Explore our curated selection of AI studies
```

### 交互文本

- **View Study Button**: `View Study`
- **View More Button**: `View More Studies`
- **Empty State**: `No featured studies available`

---

## 🎯 Input Section (输入区域)

### 表单元素

**Command Label**

```
Start Your Study
```

**Placeholder Text**

```
Ask any business question about human behavior and decision-making. We'll model the subjective factors that drive real choices.
```

**Helper Text**

```
Ask about any consumer decision - we'll interview AI personas to uncover the real motivations
```

### 按钮文本

- **Send Button**: `Study`
- **Desktop Hint**: `Enter to start`
- **Mobile Hint**: `Tap to start`

---

## 🚀 CTA Section (行动召唤)

### 最终号召

**Section Title**

```
Ready to understand your customers better?
```

**Section Description**

```
Join thousands of researchers and marketers who use AI interviews to uncover authentic consumer insights
```

### 按钮文本

- **Primary Action**: `Start Study`
- **Secondary Action**: `View Examples`

---

## 📝 文案修改指南

### 1. 直接修改流程

1. 在本文档中直接修改相应的文案内容
2. 将修改后的内容更新到 `messages/en-US.json` 文件的对应键值
3. 刷新页面查看效果

### 2. 翻译键值对照表

| 文档位置                     | 翻译键值                                                            |
| ---------------------------- | ------------------------------------------------------------------- |
| Hero Section subtitle        | `HomePage.HeroSection.subtitle`                                     |
| Hero Section stats           | `HomePage.HeroSection.stats.*`                                      |
| Features Section badge       | `HomePage.FeaturesSection.badge`                                    |
| Features Section title       | `HomePage.FeaturesSection.title`                                    |
| Features Section description | `HomePage.FeaturesSection.description`                              |
| Feature 1 title              | `HomePage.FeaturesSection.features.personaConstruction.title`       |
| Feature 1 description        | `HomePage.FeaturesSection.features.personaConstruction.description` |
| Feature 2 title              | `HomePage.FeaturesSection.features.agentInterviews.title`           |
| Feature 2 description        | `HomePage.FeaturesSection.features.agentInterviews.description`     |
| Feature 3 title              | `HomePage.FeaturesSection.features.cognitiveModeling.title`         |
| Feature 3 description        | `HomePage.FeaturesSection.features.cognitiveModeling.description`   |
| Feature 4 title              | `HomePage.FeaturesSection.features.rapidStudies.title`              |
| Feature 4 description        | `HomePage.FeaturesSection.features.rapidStudies.description`        |
| Demo Section badge           | `HomePage.DemoSection.badge`                                        |
| Demo Section title           | `HomePage.DemoSection.title`                                        |
| Demo Section description     | `HomePage.DemoSection.description`                                  |
| Demo quote text              | `HomePage.DemoSection.quote.text`                                   |
| Demo quote author            | `HomePage.DemoSection.quote.author`                                 |
| Terminal title               | `HomePage.DemoSection.terminal.title`                               |
| Terminal command             | `HomePage.DemoSection.terminal.command`                             |
| Terminal steps               | `HomePage.DemoSection.terminal.steps.*`                             |
| Interview title              | `HomePage.DemoSection.interview.title`                              |
| Interview profile            | `HomePage.DemoSection.interview.profile.*`                          |
| Interview conversation       | `HomePage.DemoSection.interview.conversation.*`                     |
| Input Section label          | `HomePage.InputSection.label`                                       |
| Input Section placeholder    | `HomePage.InputSection.placeholder`                                 |
| Input Section hint           | `HomePage.InputSection.hint`                                        |
| Input Section send label     | `HomePage.InputSection.sendLabel`                                   |
| Input Section hints          | `HomePage.InputSection.enterToSend` / `tapToSend`                   |
| Featured Studies title       | `HomePage.FeaturedStudies.title`                                    |
| Featured Studies description | `HomePage.FeaturedStudies.description`                              |
| Featured Studies buttons     | `HomePage.FeaturedStudies.viewStudy` / `viewMore`                   |
| CTA Section title            | `HomePage.CTASection.title`                                         |
| CTA Section description      | `HomePage.CTASection.description`                                   |
| CTA Section buttons          | `HomePage.CTASection.startButton` / `examplesButton`                |

### 3. 用词一致性说明

为保持产品概念统一，主页已统一使用以下术语：

**英文版本：**

- ✅ **Study** (名词) - 用户进行的研究活动
- ✅ **Start Study** - 开始研究的动作
- ✅ **Featured Studies** - 精选研究案例
- ✅ **Study Expert** - 进行访谈的专家角色
- ✅ **Study Process** - 研究流程

保留 "research" 的场景：

- 命令行中的动词：`atypica research "query"`
- 描述性文本中的动词形式

**中文版本：**

- ✅ **研究** - 统一使用"研究"这个词
- ✅ **开始研究** - 开始按钮文本
- ✅ **精选研究** - 研究案例集合
- ✅ **研究专家** - 访谈角色
- ✅ **研究过程** - 工作流程

中文语境说明：

- "研究" 比 "研习" 更适合商业/市场调研语境
- 保持与产品核心价值的一致性
- 符合中文用户的使用习惯

### 4. 双语版本文件

**英文版本：** `messages/en-US.json`
**中文版本：** `messages/zh-CN.json`

### 5. 注意事项

- 保持按钮文本简洁（2-4个单词）
- 确保移动端显示效果良好
- 保持技术描述的准确性
- 维持整体语调的一致性
- 测试不同屏幕尺寸下的可读性
- 确保所有组件都使用统一的术语体系
- 英文和中文版本保持概念一致性
- 考虑不同语言的文化背景和使用习惯
