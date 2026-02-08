# Can generated interview reports show data visualization results? For example: gender ratio, age distribution, platform usage frequency distribution, etc.

## Question Type
User Manual Question

---

## Core Answer

**Currently mainly text reports, data visualization is on the roadmap.**

**Current Support**:
- ✅ Interview records and insights (text)
- ✅ Highlight conversation excerpts (quotes)
- ✅ Consensus and disagreements (text summary)
- ⏳ Data visualization (planned)

**If Visualization Needed**:
- Current reports focus on text insights
- Can request AI to generate data summaries in report dialogue
- Future will support basic visualization (2026 Q2-Q3)

---

## Current Report Content

### 1. Text-based Content (Supported)

#### User Profile Description
```
Linda (28, Product Manager, Shanghai)
- Income: 15-20K
- Consumption characteristics: Price-sensitive, value-conscious
- Lifestyle: Busy on weekdays, social on weekends
- Pain points: Time-constrained, limited budget
```

#### Interview Insights
```
Core Findings:
1. Price-sensitive users (40%): Focus on value, ¥18 near upper limit
2. Health-anxious users (40%): Concern about ingredients, worry about sweetener safety
3. Social early-adopters (20%): Focus on appearance, willing to pay for photo-worthy

Key Insights:
- Unwilling to risk new products in afternoon energy-boost scenario
- Zero-sugar concept attractive, but need to address sweetener concerns
- Packaging appearance affects social sharing willingness
```

---

### 2. Structured Data (Currently Presented as Text)

**Example**: Price Acceptance Analysis
```
Pricing Test Results:
- ¥15: "Acceptable" - 5/5 people
- ¥18: "Near upper limit" - 3/5 people, "Too expensive" - 2/5 people
- ¥20: "Too expensive" - 4/5 people, "Might buy" - 1/5 people

Recommended pricing: ¥15-16
```

**If Visualized, Would Be**:
- Bar chart: Acceptance at different prices
- Pie chart: User type distribution (Price-sensitive 40%, Health-anxious 40%, Social early-adopter 20%)

---

## Data Visualization Planning (Future)

### Planned Feature 1: User Profile Visualization

**Demographic Visualization**:
- Age distribution (pie chart)
- Gender ratio (pie chart)
- City distribution (map/bar chart)
- Income distribution (bar chart)

**Example**:
```
[Pie Chart] Age Distribution
- 25-30 years: 40%
- 30-35 years: 40%
- 35-40 years: 20%

[Bar Chart] Income Distribution
- 10-15K: 20%
- 15-20K: 40%
- 20-30K: 30%
- 30K+: 10%
```

---

### Planned Feature 2: Attitude Distribution Visualization

**Acceptance Visualization**:
- Product acceptance (radar chart)
- Pricing acceptance (bar chart)
- Feature need priorities (horizontal bar chart)

**Example**:
```
[Horizontal Bar Chart] Feature Need Priorities
Motion correction   ███████████████ 85%
Training plans     ████████████ 70%
Social check-in    ███████ 45%
Diet advice        █████ 30%
```

---

### Planned Feature 3: Opinion Comparison Visualization

**Consensus vs Disagreement**:
- Consensus points (green highlight)
- Disagreement points (red annotation)
- Opinion evolution (timeline)

**Example**:
```
[Opinion Comparison Chart]
        Price-sensitive  |  Quality-first
Pricing acceptance  ¥15  |   ¥20
Core appeal        Cheap |  Healthy
Purchase scenario  Daily |  Social trial
```

---

### Planned Feature 4: Behavior Pattern Visualization

**Usage Frequency**:
- Platform usage frequency (stacked bar chart)
- Consumption frequency (line chart)
- Decision pathway (flow chart)

**Example**:
```
[Stacked Bar Chart] Platform Usage Frequency
Xiaohongshu  Daily  ██████ 60%  | Weekly ████ 30% | Occasional █ 10%
Douyin       Daily  ████████ 80% | Weekly ██ 15%  | Occasional █ 5%
Weibo        Daily  ██ 20%       | Weekly ███ 30% | Occasional █████ 50%
```

---

## Current Workarounds

### Option 1: Use AI to Generate Visualization Suggestions

**In Report Dialogue**:
```
User: "Can you help me turn age distribution into a chart?"

AI: [Analyzes data]
"Age distribution is as follows:
25-30 years: 2 people (40%)
30-35 years: 2 people (40%)
35-40 years: 1 person (20%)

Recommend using pie chart for display.
I've organized the data, you can:
1. Copy data to Excel to generate chart
2. Or use this Python code to generate:
   [Provides code]"
```

---

### Option 2: Request Custom Report Format

**Contact Customer Service**:
- If you are enterprise user
- Need specific format visualization reports
- Can customize development

---

## Why No Visualization Currently?

### Reason 1: Primarily Qualitative Research

**atypica's Core Value**:
- Deep dive into "why"
- Understand user motivations and attitudes
- Provide insights rather than statistics

**Qualitative vs Quantitative**:
- Qualitative: 5-10 in-depth interviews, extract insights
- Quantitative: 100+ survey, statistical distribution

**atypica is Qualitative-focused**:
- Sample size: 5-10 people (not suitable for statistical visualization)
- Output: Insights and recommendations (text more appropriate)

---

### Reason 2: Small Sample Size

**Statistical Significance**:
- 5-10 person data not suitable for percentage statistics
- "2/5 people like" more accurate than "40% like"
- Avoid misleading (small sample doesn't represent population)

**Exception**:
- If large-scale testing (50+ people)
- Future may consider visualization

---

### Reason 3: Insights > Numbers

**What Matters is Insights**:
```
❌ Numbers: 40% of users think it's expensive
✅ Insight: Price-sensitive users think it's expensive,
        but health-anxious users willing to pay more for zero-sugar,
        key is addressing sweetener concerns.
```

**Risk of Visualization**:
- Over-focus on numbers
- Ignore underlying "why"

---

## When Will Visualization Launch?

### Roadmap

**Phase 1** (Current):
- Focus on qualitative insights
- Text reports primary
- Support export HTML/PDF

**Phase 2** (Planned):
- Basic visualization
  - User profile distribution
  - Attitude acceptance charts
  - Consensus vs disagreement comparison

**Phase 3** (Future):
- Advanced visualization
  - Interactive charts
  - Dynamic data exploration
  - Custom report generation

**Expected Launch Time**:
- Phase 2: 2026 Q2-Q3
- Phase 3: 2026 Q4-2027 Q1

---

## Common Questions

### Q1: Why no charts like survey tools?

**Core Difference**:
- Survey tools: Quantitative research (100+ people), suitable for statistics
- atypica: Qualitative research (5-10 people), suitable for insights

**Analogy**:
- Survey: Physical exam report (blood pressure, blood sugar data)
- atypica: Doctor diagnosis (why is blood pressure high? How to treat?)

---

### Q2: Is chart with 5-10 person data meaningful?

**Limited Statistical Significance**:
- 2 out of 5 = 40% (sounds like a lot)
- But sample too small, can't represent population

**More Appropriate Expression**:
- "2 out of 5 people think it's expensive"
- Rather than "40% think it's expensive"

**Recommendation**:
- If need statistical analysis → Use survey tools (100+ people)
- If need insights digging → Use atypica (5-10 people)

---

### Q3: Can I create charts myself?

**Yes**. Steps:

**AI Can Help You**:
- Request AI to organize data in report dialogue
- AI will provide data in table format
- Can manually create charts or use other tools

---

### Q4: Does enterprise version have custom visualization?

**Can Be Customized**:
- Contact enterprise customer service
- Explain visualization needs
- Customize report format development

**Applicable Scenarios**:
- Need to report to board
- Specific industry report format
- Large-scale repeated research

---

## Best Practices

### Recommendation 1: Focus on Insights Rather Than Numbers

**Don't Ask**:
- "What percentage of users like it?"

**Ask**:
- "Why do users like/dislike it?"
- "What are differences between user segments?"
- "How to optimize product?"

---

### Recommendation 2: Use Surveys for Statistics

**Scenario Division**:
- atypica: Explore "why" (5-10 people depth)
- Survey tools: Validate "how many" (100+ people statistics)

**Combined Use**:
1. atypica explore insights
2. Survey large-scale validation
3. atypica dig deeper into anomalies

---

### Recommendation 3: Tell Story with Text

**Good Report**:
```
Not: "60% of users accept ¥18 pricing"

But: "3 out of 5 users accept ¥18, 2 think it's expensive.
      Those accepting are health-anxious types, believing zero-sugar worth extra money;
      Those finding it expensive are price-sensitive, usually buy ¥12 Americano.
      Recommend pricing ¥15-16, balancing both groups."
```

**Story > Numbers**

---

## Bottom Line

> "atypica focuses on insights rather than statistics, 5-10 in-depth interviews not suitable for charts.
> What matters isn't 'how many people', but 'why'."

**Remember**:
- ✅ Current: Text reports, focus on insights
- ✅ Future: Basic visualization (2026 Q2-Q3)
- ✅ Workaround: Request AI to organize data in report dialogue
- ✅ Qualitative ≠ Quantitative: atypica is not survey tool
- ✅ Insights > Numbers: Focus on "why"

---

**Related Feature**: Plan Mode, Report
**Doc Version**: v2.1
