# AI Persona System: Three-Tier Persona Framework

**One-sentence summary**: 300K+ AI persona library, from basic AI to human-level simulation, ensuring research quality.

---

## Why Do We Need an AI Persona System?

### Problem: Low-Quality Personas Lead to Meaningless Feedback

**Scenario A: Using Low-Quality Personas**

User: "Test this product concept and see if users like it"

AI responds with temporarily generated personas:
- Persona 1: "This product is good, I'll buy it"
- Persona 2: "Not bad, creative"
- Persona 3: "Pretty good"

**Problems**:
- Feedback too generic, lacking specific reasons
- Unable to follow up with "why do you like it"
- Feels like "AI hallucination", not authentic

---

**Scenario B: Using High-Quality Personas**

User: "Test this product concept and see if users like it"

AI responds with Tier 2 personas:
- Persona 1 (28-year-old female office worker, monthly income $2.5K): "The price is a bit high, my budget for this type of product is usually $50, but this costs $80"
- Persona 2 (32-year-old entrepreneur, efficiency-focused): "Nice features, but I'm more concerned about integration with my existing tools"
- Persona 3 (25-year-old Gen Z, appearance-conscious): "The packaging isn't attractive enough, I wouldn't share photos of it"

**Value**:
- Specific feedback with details
- Can follow up and dig deeper
- Close to real human insights

---

## Three-Tier Quality System

### Tier 0: Temporary Generation

**Characteristics**:
- Quantity: Unlimited (instant generation)
- Quality: Low
- Consistency: < 60% (far below human 81% baseline)
- Construction method: Temporary AI generation

**Use cases**:
- Quick idea validation
- Extremely limited budget
- No need for deep insights

**Limitations**:
- Shallow feedback, lacking details
- Poor consistency, different results on repeated tests
- Not suitable for critical decisions
- **Note**: Not publicly available due to insufficient quality that may mislead research conclusions

---

### Tier 1: Basic Personas

**Characteristics**:
- Quantity: ~300K
- Quality: Medium
- Consistency: 70-75% (approximately 90% of human 81% baseline)
- Construction method: Basic 7-dimension data

**7-Dimension Data**:
1. **Demographics**: Age, gender, income, occupation, education
2. **Geographic**: City, living environment
3. **Psychological**: Values, lifestyle, motivations, fears
4. **Behavioral**: Consumption habits, decision patterns, brand preferences
5. **Needs & Pain Points**: Concerns, unmet needs
6. **Tech Acceptance**: Openness to new products
7. **Social Relations**: Family structure, social circles, group belonging

**Use cases**:
- Regular business research
- Product concept testing
- Market positioning research
- Market trend exploration
- Creative inspiration (Discussion Chat)

**Value**:
- Much more authentic than Tier 0
- Covers diverse populations
- Cost-effective

**Data sources**:
- Deep social media observation (Scout Agent 15 tool calls)
- CDP (Customer Data Platform)
- Personality test results

---

### Tier 2: Human-Level Simulation

**Characteristics**:
- Quantity: ~10K
- Quality: High
- Consistency: 85% (exceeds human 81% baseline)
- Construction method: Deep data + social observation

**What is 85% Consistency?**

**Testing method**:
- Ask the same Tier 2 persona the same question 10 times
- 85% of the time, core viewpoint remains consistent

**Comparison**:
- Tier 2 persona: 85% consistency (exceeds human baseline at 105%)
- Human baseline: 81% consistency (100-point standard)
- Tier 1 persona: 70-75% consistency (90% human level)
- Tier 0 persona: < 60% consistency (< 77% human level)

**Example test**:

Question: "Would you buy this $80 healthy snack?"

**Tier 2 persona (Zhang Li, 28-year-old office worker) 10 responses**:
- 8 times: "Too expensive, my usual snack budget is $30-50"
- 1 time: "Maybe for special occasions"
- 1 time: "Depends on taste, if it's really good I might accept the price"

**Core viewpoint consistent**: Price exceeds budget, won't buy daily

**Human baseline (81%)**:
Humans aren't 100% consistent either, as mood, environment, and expression vary, but core viewpoints remain 81% consistent.

**Tier 2 persona (85%)**:
Already exceeds human baseline, suitable for critical business decisions.

---

**Use cases**:
- Critical product decisions
- Brand repositioning
- High-value project validation
- Research requiring deep insights
- Deep user insights (understanding "why")
- Emotional resonance testing
- Substitute for real human interviews

**Value**:
- Close to human performance
- High credibility
- Can guide major decisions
- Exceeds human baseline (85% vs 81%)
- No social pressure, more authentic responses
- Can be interviewed repeatedly, no "fatigue" or "changing answers"

**Data sources**:
- 1-hour deep interview (5000 words)
- 30+ deep social media observations

**Limitations**:
- Cannot replace innovative need discovery (based on existing data)
- Not suitable for extremely niche groups (may not exist in library)

---

### Tier 3: Private Personas

**Characteristics**:
- Quantity: User-defined
- Quality: Depends on data completeness
- Consistency: Depends on imported data quality
- Construction method: User manual creation or import

**Use cases**:
- Specific projects requiring specific personas
- Teams with existing user profile data
- Need to simulate specific real users
- Enterprise customer research
- Internal training
- Sensitive data research
- Continuous tracking

**Construction methods**:
1. **Manual creation**: Fine-tune each dimension
2. **Data import**: Import from CRM/user research
3. **Based on real people**: Simulate specific real users

**Value**:
- Fully meets project needs
- Can be continuously reused
- Team private, data secure

**Privacy protection**:
- Data stored in user-exclusive partition, completely invisible to other users
- Does not participate in public library search index
- Will not be used by AI for training or recommendation to other users
- Users can delete anytime, data immediately physically destroyed

**Consistency score**:
- Import deep interview records (5000 words) → can reach 85 points (equivalent to Tier 2)
- Import CRM purchase records → approximately 70-75 points (Tier 1 level)
- Import only basic information → approximately 55-60 points (Tier 0 level)

---

## Deep Dive: Consistency Science

### Human Baseline: The 81% Truth

**Experimental design**: Have real people answer 50 value/behavioral preference questions, then answer again two weeks later (without notification), calculate consistency.

**Result**: Human average consistency is **81%**, which we define as the **100-point standard**.

This means:
- **85-point AI Persona** is more stable than average humans (exceeds human baseline at 105%)
- **79-point AI Persona** approaches real human performance (98% human level)
- **70-75 point AI Persona** is approximately 90% of human stability
- **62-point AI Persona** is only 76% of human stability

### Data Sources and Consistency Scores

| Data Source | Atypica Consistency Score | Corresponding Tier | Human Baseline Comparison | Typical Data Volume |
|------------|--------------------------|-------------------|-------------------------|---------------------|
| Personal info | 55 points | Tier 0 | 68% | Name, age, city, occupation |
| Personality tests | 64 points | Tier 0-1 | 79% | 120-300 test questions |
| Consumer Data Platform (CDP) | **73 points** | Tier 1 | 90% | Purchase history, behavioral traces |
| Social media (broad observation) | 75 points | Tier 1 | 93% | 100-200 content views |
| Social media (targeted observation) | **79 points** | **Tier 1** | 98% | 15 tool calls, 3000-word observation |
| Deep interview | **85 points** | **Tier 2** | 105% | 5000-word interview record |
| Real human | 100 points (81% baseline) | - | 100% | - |

**Key findings**:
- **79 points is the threshold**: Scout Agent through 15 deep social media observations can reach 98% human baseline
- **85 points is the ceiling**: Deep interview-level data can exceed human average consistency
- **Data quantity ≠ quality**: Massive CDP data (73 points) is inferior to targeted social observation (79 points), the key is information density

### Why is 85 Points the Ceiling?

- Humans themselves have only 81% consistency (affected by emotions, environment, expression)
- If AI Persona exceeds 85%, it appears "too mechanical"
- 85% is the optimal balance point between "authenticity" and "consistency"

---

## Persona Quality Comparison

| Dimension | Tier 0 | Tier 1 | Tier 2 | Tier 3 | Real Human |
|-----------|--------|--------|--------|--------|------------|
| **Consistency** | < 60% | 70-75% | 85% | Depends on data | 81% |
| **vs Human** | < 77% | ~90% | 105% | Depends on data | 100% |
| **Feedback depth** | Shallow | Medium | Deep | Depends on data | Deepest |
| **Follow-up ability** | Poor | Medium | Good | Depends on data | Best |
| **Cost** | Free | Low | Medium | Low (self-built) | High ($200/person) |
| **Time** | Instant | Instant | Instant | Needs building | 2-4 weeks recruitment |
| **Quantity** | Unlimited | 300K+ | 10K+ | Custom | Limited by budget |

---

## Real Case Study

### Case: Testing "Bubble Coffee" Product Concept

**Using Tier 0 personas (temporary generation)**:

Interviewed 5 people, feedback:
- Persona 1: "This product is good"
- Persona 2: "I might buy it"
- Persona 3: "Quite creative"
- Persona 4: "Sounds good"
- Persona 5: "I like trying new products"

**Problems**:
- Feedback too generic, cannot guide decisions
- Follow-up "why" questions get vague answers
- Feels inauthentic

---

**Using Tier 2 personas (human-level simulation)**:

Interviewed 5 people, feedback:

**Persona 1 (Zhang Li, 28-year-old female office worker, monthly income $2.5K)**:
"Bubble coffee sounds refreshing. I usually buy coffee or milk tea at 3 PM, but milk tea is too sweet and regular coffee is too bitter. The refreshing sensation of bubble coffee should be nice. However, I worry the bubbles might be too strong and affect the coffee taste. For pricing, ¥25-30 ($3.5-4) is acceptable, but over ¥35 ($5) feels expensive. The packaging must look good for me to take photos and share on social media."

**Follow-up**: "When would you choose it over regular coffee?"
**Answer**: "Not for caffeine boost, but when I want something special to relax. Like Friday afternoon after completing a week's work, to reward myself. Or when shopping with friends, wanting to try something new."

**Persona 2 (Li Ming, 32-year-old entrepreneur, efficiency-focused)**:
"I'm not very interested in bubble coffee. I drink coffee mainly for work productivity, don't really care about taste innovation. Plus I worry the bubbles would make me burp, affecting my work state. If you want to target this market, I suggest focusing on young women, not workaholics like me."

**Persona 3 (Wang Yue, 25-year-old Gen Z, appearance-focused)**:
"Wow, bubble coffee sounds interesting! I'd definitely try it, especially if the packaging design is nice. I recently saw many people on social media posting bubble drinks, seems perfect for photos. Price around ¥30 ($4) is acceptable, after all it's a new product. But if it doesn't taste good I won't repurchase."

**Persona 4 (Chen Si, 30-year-old health-conscious)**:
"I'd pay attention to bubble coffee ingredients. If it's real coffee with natural bubbles, I'd consider buying. But if there are many additives and artificial flavors, I won't buy. For pricing, if ingredients are good, ¥35-40 ($5-5.5) is acceptable. The specialty coffee I buy now also costs around ¥30 ($4)."

**Persona 5 (Zhao Xin, 27-year-old office worker, budget-limited)**:
"Bubble coffee sounds good, but I'd worry about price. My usual coffee budget is ¥15-20 ($2-3), if bubble coffee costs ¥30+ ($4+), I probably won't buy often. Occasional trial is fine, but won't become a daily choice. Unless there are promotional deals, like second cup half price, then I'd consider buying regularly."

---

**Comparison results**:

| Dimension | Tier 0 | Tier 2 |
|-----------|--------|--------|
| **Feedback depth** | Surface, no details | Deep, with specific scenarios and reasons |
| **Follow-up ability** | Poor, vague after follow-up | Good, can follow up deeply |
| **Insight value** | Low, cannot guide decisions | High, clearly guides positioning and pricing |
| **Authenticity** | Like AI hallucination | Close to real human |

**Decisions based on Tier 2 feedback**:
- **Positioning**: Social beverage (not energy drink)
- **Target users**: 25-30 year-old female office workers and Gen Z
- **Pricing**: ¥25-30 ($3.5-4) (sweet spot)
- **Packaging**: Youth-oriented design, emphasizing bubble sensation and photo-worthy attributes
- **Marketing**: Social media seeding, emphasizing "novelty" and "social attributes"

---

## Three Persona Construction Methods

### Method 1: Scout Agent Auto-Generation

**Process**:
1. Scout Agent observes social media 10-15 rounds
2. Extracts real user characteristics (7-dimension data)
3. Auto-generates Tier 1/Tier 2 high-quality personas

**Value**:
- Based on real users, not imagination
- Auto-generated, no manual work
- High quality, 79-85% consistency

**Use cases**:
- Before entering new market
- Don't understand target users
- Need to quickly build high-quality persona library

**Case**:
> Scout observes "Xiaohongshu users discussing bubble coffee" 10 rounds
> → Auto-generates 3 types of Tier 2 personas:
> - Type 1: 25-30 year-old female office workers, focus on appearance and social
> - Type 2: 28-35 year-old health-conscious, care about ingredients and calories
> - Type 3: 22-28 year-old Gen Z, pursuing novelty
>
> → Directly used for Discussion to test product positioning

**Note**:
- 15 tool calls typically generate Tier 1 (79 points)
- 30+ tool calls may reach Tier 2 (85 points)
- 99% of Scout observation results are Tier 1

---

### Method 2: Import Real Data

**Process**:
1. Team has existing user profile data (Excel/CSV/PDF)
2. Import to atypica.AI
3. System automatically converts to Tier 3 personas

**Data requirements**:
- Basic info: Age, gender, occupation, income
- Optional info: Consumption habits, values, pain points

**Value**:
- Leverage existing data assets
- No need to build from scratch
- Can be continuously reused

**Use cases**:
- Team has done user research
- Has CRM user data
- Need to simulate existing customers

**Case**:
> A brand has 500 user profiles (from past research)
> → Import to atypica.AI
> → Generate 500 Tier 3 personas
> → Used for testing new product concepts
> → Saves time rebuilding personas

**Quality tips**:
- System automatically analyzes data completeness
- Prompts "missing dimensions"
- Suggests initiating Follow-up Interview to supplement information

---

### Method 3: Manual Creation

**Process**:
1. Create new persona in system
2. Fill in 7-dimension information
3. Save as Tier 3 private persona

**Use cases**:
- Need to simulate specific real users
- Very precise data
- Long-term projects need stable personas

**Case**:
> A consulting project needs to simulate client's core users
> → Manually create 5 Tier 3 personas
> → Based on detailed user profiles provided by client
> → Use these 5 personas throughout project
> → Ensure research consistency

---

## Appendix: 7-Dimension Scoring Detailed

### Scoring System

Each dimension scored 0-1 point, total 0-7 points:

| Dimension | 0 Points | 1 Point | Example |
|-----------|----------|---------|---------|
| **Demographics** | No data | Complete (age/gender/occupation/income/education) | 28-year-old female, internet product manager, monthly income $2.5K, bachelor's |
| **Geographic** | No data | Complete (city/living environment) | Shanghai, renting in Xuhui District, 1-hour commute |
| **Psychological** | No data | Complete (values/lifestyle/motivations/fears) | Values quality of life, willing to pay for good products, likes trying new things, worries about wasting money |
| **Behavioral** | No data | Complete (consumption habits/decision patterns/brand preferences) | Mainly online shopping, likes reading reviews, compares multiple brands, trusts Xiaohongshu recommendations |
| **Needs & Pain Points** | No data | Complete (needs and concerns/unmet needs) | Busy with work no time to shop, worries about buying inferior products, hopes for quick decisions |
| **Tech Acceptance** | No data | Complete (openness to new products) | Early adopter, willing to try new apps, interested in AI products |
| **Social Relations** | No data | Complete (family/social circles/group belonging) | Single, friend circle mostly similar-age office workers, often shop and dine together |

### Total Score and Tier Relationship

- **0-3 points**: Tier 0 (temporary generation, low quality, not publicly available)
- **4-5 points**: Tier 1 (basic persona, medium quality, 70-75% consistency)
- **6-7 points**: Tier 2 (human-level simulation, high quality, 85% consistency)
- **Tier 3**: User-defined, depends on input data completeness

### Acquisition Difficulty by Dimension

| Dimension | Social Media Accessible | CDP Accessible | Needs Deep Interview |
|-----------|------------------------|----------------|---------------------|
| Demographics | ✅ | ✅ | ✅ |
| Geographic | ✅ | ✅ | ✅ |
| Psychological | ⚠️ | ❌ | ✅ |
| Behavioral | ✅ | ✅ | ✅ |
| Needs & Pain Points | ⚠️ | ❌ | ✅ |
| Tech Acceptance | ⚠️ | ⚠️ | ✅ |
| Social Relations | ⚠️ | ❌ | ✅ |

**Legend**:
- ✅ Full coverage
- ⚠️ Partial coverage (may lack details)
- ❌ Mostly missing

**Key findings**:
- Tier 1 (4-5 points) can be built through social media + CDP
- Tier 2 (6-7 points) needs deep interviews to supplement psychological/pain points/social dimensions

---

## FAQ

### Q1: How to Choose the Right Tier?

**Decision tree**:

```
How important is your research project?
├─ Very important (critical product decisions) → Tier 2
├─ Important (regular business research) → Tier 1
└─ Not very important (quick idea validation) → Tier 1 (not recommended Tier 0)

What's your budget?
├─ Sufficient → Tier 2
├─ Medium → Tier 1
└─ Limited → Tier 1

How deep insights do you need?
├─ Deep insights (understand "why") → Tier 2
├─ Medium depth (understand "what") → Tier 1
└─ Shallow validation → Tier 1
```

**Recommendations**:
- Use **Tier 1** in most cases (best cost-performance)
- Use **Tier 2** for critical decisions (quality assurance)
- **Not recommended to use Tier 0** (insufficient quality)

---

### Q2: Why Are There Only 10K+ Tier 2 Personas?

**Reasons**:
- Tier 2 needs deep data construction (5000-word interviews or 30+ observations)
- Mainly generated through atypica team deep interviews
- Takes time to accumulate

**But sufficient for use**:
- Covers major population types
- Can quickly generate new Tier 2 personas through Scout (30+ calls)
- Users can create Tier 3 to supplement

---

### Q3: Can Tier 1 Be Upgraded to Tier 2?

**Cannot directly upgrade**, but can:
1. Use Scout Agent to continue observation (needs 30+ tool calls)
2. System automatically re-scores
3. Or import deep interview data to create new Tier 3

**Note**:
- Users cannot directly operate public library Personas
- For customization, use Tier 3 to import your own data

---

### Q4: Can Tier 3 Personas Be Shared with Team?

**Yes (in roadmap)**:
- Currently Tier 3 Personas only visible to creator
- Future plans support team-level Tier 3 (Team Personas)
- Fine-grained permission control (only admins can edit)

---

### Q5: Do Personas Become Outdated?

**Yes**:
- User psychology and behavior change over time
- Market trends change

**Recommendations**:
- **Tier 1**: For rapidly changing fields, prioritize Personas built within 6 months
- **Tier 2**: For stable fields, can use Personas from past 2 years
- **Tier 3**: Manually update based on real user changes

---

### Q6: How to Verify Persona Quality?

**Method 1: Consistency test**
- Ask same question 10 times
- Check if core viewpoint remains consistent
- Tier 2 should be ≥ 85%

**Method 2: Compare with real people**
- Ask same questions to real people and AI personas
- Compare feedback depth and authenticity

**Method 3: Actual usage effect**
- Make decisions based on AI persona feedback
- Verify if decisions were correct afterwards

---

### Q7: Can Different Tiers Be Mixed?

**Yes**:
- Can use different Tiers in same research
- Example: Use Tier 1 for quick screening, Tier 2 for deep verification

**Recommendations**:
- Don't mix in same Interview/Discussion
- Will cause inconsistent feedback quality

---

### Q8: Is the Consistency Score Gap Between Tier 1 and Tier 2 Significant?

**Significant difference**:
- **Tier 1 (70-75 points)**: Equivalent to 90% of human baseline, suitable for "attitude exploration"
- **Tier 2 (85 points)**: Exceeds human baseline (105%), suitable for "motivation understanding"

**Analogy**:
- Tier 1 like "friend known for 3 months": Know what they like, but not why
- Tier 2 like "close friend known for 3 years": Understand their values, fears, contradictions

---

### Q9: Why Is Tier 0 Not Available to Users?

**Quality over quantity**:
- Low-quality Personas lead to misleading conclusions
- Waste time
- Damage trust
- Rather have smaller inventory than compromise on reliability of each Persona

---

### Q10: Can Scout Agent Build Tier 2 Personas?

**Theoretically yes, practically difficult**:
- Needs 30+ tool calls
- Cover all 7 dimensions
- 500+ tokens deep text
- 99% of Scout observation results are Tier 1

For key user groups (like "EV owners", "medical aesthetics users"), atypica team proactively conducts 1-hour real human interviews, converts to Tier 2 Personas and adds to public library.

---

## Appendix: Competitor Comparison

### vs. Traditional Persona Tools (e.g., HubSpot, Xtensio)

| Dimension | Traditional Tools | atypica.AI |
|-----------|------------------|------------|
| **Construction method** | Manual form filling | AI auto-observes social media or imports data |
| **Quality standards** | No standards (based on experience) | 7-dimension auto-scoring, quantifiable consistency |
| **Tiering system** | ❌ No tiers | ✅ 4-level tiers (Tier 0-3) |
| **Interactivity** | ❌ Static documents | ✅ Deep interviews (7-round conversations) |
| **Scale** | Usually 5-10 | 300K+ public library + user private library |

**Conclusion**: Traditional tools are "static documents", atypica is "interactive digital humans".

---

### vs. Synthetic Data Platforms (e.g., Gretel, Mostly AI)

| Dimension | Synthetic Data Platforms | atypica.AI |
|-----------|-------------------------|------------|
| **Application** | Privacy-protected dataset generation | User insights and research |
| **Quality assessment** | Statistical distribution similarity | **Consistency score** (benchmarked to human baseline) |
| **Explainability** | ❌ Black box | ✅ 7-dimension transparent scoring |
| **Usage** | Export dataset (CSV/JSON) | Direct interviews (Interview Chat) |

**Conclusion**: Synthetic data platforms focus on "data compliance", atypica focuses on "insight quality".

---

### vs. AI Chatbots (e.g., Character.AI, Replika)

| Dimension | AI Chatbots | atypica.AI |
|-----------|------------|------------|
| **Goal** | Entertainment, companionship | Business research |
| **Quality standards** | Fun, empathy | **Consistency, authenticity** |
| **Data source** | User-defined personality | Real social media or interview data |
| **Verification mechanism** | ❌ No verification | ✅ Human baseline benchmarking |

**Conclusion**: AI chatbots are "virtual friends", atypica is "research subjects".

---

### atypica.AI's Core Differentiation

1. **Scientific quality metrics**
   - Not "feels like real human", but "quantified consistency 79-85 points"
   - Benchmarked to human baseline (81%), verifiable

2. **Transparent tiering system**
   - Not "one-size-fits-all", but "choose Tier as needed"
   - Users clearly know capability boundaries of each Persona

3. **Public-private hybrid architecture**
   - Public library (300K+) + private library (user-defined)
   - Flexible combination

---

## Best Practices

### 1. Beginner Recommendation: Start with Tier 1, Use Tier 2 for Critical Moments

**Reasons**:
- Tier 1 cost-effective
- Quality sufficient for regular research
- Budget-saving

**When to upgrade to Tier 2**:
- Need to report to boss/client
- Final validation before product launch
- Brand repositioning

---

### 2. Use Scout to Generate High-Quality Personas

**Best practice**:
1. Use Scout to observe 10-15 rounds before research
2. Auto-generate Tier 1/2 personas
3. Directly use for Interview/Discussion
4. Ensure research quality

---

### 3. Build Team Tier 3 Persona Library

**Long-term value**:
- Shared across all projects
- Continuous accumulation and optimization
- Improve research consistency

**Recommendations**:
- Save key personas after each project
- Regularly update persona data
- Team sharing and reuse

---

### 4. Don't Over-Rely on Tier 0

**Common mistakes**:
- Use all Tier 0 to save money
- Results in poor feedback quality
- Make wrong decisions based on low-quality feedback

**Correct approach**:
- Tier 0 not publicly available (system blocked)
- Use Tier 1/2 for formal research

---

### 5. Quality Checklist

#### Tier 1 Quality Check
- [ ] Does it cover target group diversity? (at least 3-5 different profiles)
- [ ] Are answers consistent? (no contradictions in multiple questions)
- [ ] Do viewpoints have specific details? (not generic)
- [ ] If answers too shallow, consider upgrading to Tier 2

#### Tier 2 Quality Check
- [ ] Does it uncover deep motivations? (not just surface reasons)
- [ ] Are there emotional details? (specific worries, expectations, contradictions)
- [ ] Can it explain behavioral logic? (why make such choices)
- [ ] If still insufficient, consider real human interview validation

---

### 6. Common Mistakes and How to Avoid Them

#### Mistake 1: Using Tier 1 as Tier 2
**Symptom**: Using social media-observed Personas for deep motivation interviews, finding shallow answers.

**Solution**:
- Use Tier 1 for hypothesis generation (what are possible reasons)
- Use Tier 2 for motivation verification (which reason is the real driver)

#### Mistake 2: Blindly Pursuing Persona Quantity
**Symptom**: Search 50 Personas, interview all, result is redundant information.

**Solution**:
- **Initial screening**: First search 30-50, sort by similarity
- **Clustering**: Manually summarize 3-5 typical profiles
- **Deep interviews**: Only conduct deep interviews on typical profiles

#### Mistake 3: Ignoring Persona Timeliness
**Symptom**: Using Personas built in 2022 to research 2024 market.

**Solution**:
- For rapidly changing fields (like tech products), prioritize Personas built within 6 months
- For stable fields (like basic needs), can use Personas from past 2 years

#### Mistake 4: Treating AI Persona as "Truth"
**Symptom**: AI Persona says "users don't like XX", directly cut the feature.

**Solution**:
- **Small sample validation**: Test AI Persona conclusions with 5-10 real people
- **A/B testing**: Validate hypothesis with real data after launch

---

## Quick Reference

### Tier Selection Quick Guide

| Research Question | Recommended Tier | Tool Combination | Time |
|------------------|-----------------|------------------|------|
| What do these people like? | Tier 1 | searchPersonas + discussionChat | 1 hour |
| Why like/dislike? | Tier 2 | searchPersonas + interviewChat | 3-5 hours |
| VIP customer needs analysis | Tier 3 | Persona Import + Follow-up | 1-2 days |
| Quick concept validation | Tier 1 | Batch discussionChat | 2-4 hours |
| Product positioning decisions | Tier 2 | Deep interviewChat + real human validation | 3-5 days |

### Consistency Score Quick Guide

| Score | Tier | Human Comparison | Use Case |
|-------|------|-----------------|----------|
| 85 | Tier 2 | Exceeds human (105%) | Critical decisions, deep motivations |
| 79 | Tier 1 | Close to human (98%) | Trend exploration, attitude research |
| 73 | Boundary | Below human (90%) | Reference only |
| <60 | Tier 0 | Far below human (<77%) | Not recommended |

---

## Summary

**AI Persona System Core Value**:
1. **Quality tiering**: From Tier 0 to Tier 3, meeting different needs
2. **Human-level simulation**: Tier 2 consistency 85%, exceeds human 81%
3. **Flexible construction**: Scout generation, data import, manual creation
4. **Scientific metrics**: Benchmarked to human baseline (81%), verifiable

**Selection recommendations**:
- **Regular research**: Tier 1 (cost-effective)
- **Critical decisions**: Tier 2 (quality assurance)
- **Not recommended**: Tier 0 (insufficient quality)
- **Specific projects**: Tier 3 (fully customized)

**Best practices**:
- Use Scout to generate high-quality personas
- Build team Tier 3 persona library
- Use Tier 2 for critical research
- Don't over-rely on Tier 0
- Use Tier 1 for hypothesis generation, Tier 2 for motivation verification
- Small sample real human validation for key conclusions

---

**Document version**: v3.0 | 2026-01-17 | Merged version: New structure + Old technical details
