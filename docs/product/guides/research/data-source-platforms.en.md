# What Platforms Are the Data Sources for AI Research?

## Question Type
User Manual Question

---

## Quick Answer

**Social Media Scanning Supported Platforms**:
- 🇨🇳 **Domestic**: Xiaohongshu, Douyin
- 🌍 **Overseas**: Twitter, Instagram, TikTok

**AI Research (Interview/Discussion)**:
- Uses atypica's **300K+ AI persona library**, doesn't depend on social media data
- AI personas based on: Real interview transcripts + Real user profiles + Social media scanning generation

**Data Characteristics**:
- ✅ Only scans public content, no privacy concerns
- ✅ Real-time latest, not historical data
- ✅ Can specify platforms and regions

---

## Social Media Scanning Supported Platforms

### Domestic Platforms (2)

#### 1. Xiaohongshu

**Characteristics**:
- User Demographics: Primarily young women (70%+ female, 18-35 years old)
- Content Types: Consumer product reviews, lifestyle sharing, beauty & skincare
- Discussion Style: Real experience sharing, image and text

**Suitable for Scanning**:
- ✅ Consumer goods (beauty, skincare, food, apparel)
- ✅ Lifestyle (fitness, travel, home)
- ✅ Young women's consumer psychology
- ✅ Product reviews and genuine feedback

**Example**:
```
Scanning Target: "25-35 year old women's attitudes toward 0-sugar snacks"
Recommended Platform: Xiaohongshu (First choice)
Reason: Xiaohongshu users highly overlap, discussions about real experiences
```

---

#### 2. Douyin

**Characteristics**:
- User Demographics: Wide range (18-50 years old), good lower-tier market coverage
- Content Types: Short videos, live streaming e-commerce, life records
- Discussion Style: Fragmented, highly entertaining

**Suitable for Scanning**:
- ✅ FMCG and daily necessities
- ✅ Lower-tier market users
- ✅ Live streaming e-commerce related
- ✅ Short video content trends

**Example**:
```
Scanning Target: "Lower-tier market users' attitudes toward Pinduoduo"
Recommended Platform: Douyin
Reason: Lower-tier market users active
```

---

### Overseas Platforms (3)

#### 1. Twitter

**Characteristics**:
- User Demographics: Global users, tech and business circles
- Content Types: Real-time discussions, opinion sharing, news dissemination
- Discussion Style: Fast, concise, clear opinions

**Suitable for Scanning**:
- ✅ Overseas market user attitudes
- ✅ Tech product discussions
- ✅ Business trends
- ✅ Public opinion hotspots

**Example**:
```
Scanning Target: "Overseas users' attitudes toward AI tools"
Recommended Platform: Twitter
Reason: Tech circle gathering place, active discussions
```

---

#### 2. Instagram

**Characteristics**:
- User Demographics: Global users, primarily young people
- Content Types: Images, short videos, Stories
- Discussion Style: Visual, lifestyle showcase

**Suitable for Scanning**:
- ✅ Fashion and beauty
- ✅ Lifestyle brands
- ✅ Visual products
- ✅ Overseas young people consumption

**Example**:
```
Scanning Target: "Overseas young people's attitudes toward sustainable fashion"
Recommended Platform: Instagram
Reason: Fashion enthusiasts gathering place
```

---

#### 3. TikTok

**Characteristics**:
- User Demographics: Global young users (18-35 years old)
- Content Types: Short videos, creative content, life sharing
- Discussion Style: Highly entertaining, highly interactive

**Suitable for Scanning**:
- ✅ Young people consumption trends
- ✅ Product seeding and reviews
- ✅ Creative marketing content
- ✅ Global market insights

**Example**:
```
Scanning Target: "Overseas young people's attitudes toward certain beauty brand"
Recommended Platform: TikTok
Reason: Young users active, product reviews genuine
```

---

## Platform Selection Recommendations

### Choose by Demographics

**Young Women (18-35 years old)**:
- First Choice: Xiaohongshu
- Alternative: Douyin

**Gen Z (18-25 years old)**:
- First Choice: Douyin
- Alternative: Xiaohongshu

**Lower-Tier Market**:
- First Choice: Douyin

**Overseas Market**:
- First Choice: Twitter, Instagram
- Alternative: TikTok

---

### Choose by Product Type

**Consumer Goods (Beauty, Food, Apparel)**:
- Xiaohongshu, Douyin, Instagram

**Lifestyle (Fitness, Travel, Home)**:
- Xiaohongshu, Instagram

**FMCG and Daily Necessities**:
- Douyin, TikTok

---

### Multi-Platform Cross-Validation

**Recommended Combinations**:

**Combination 1**: Young women consumer goods
```
Xiaohongshu + Douyin
- Xiaohongshu: Deep experience sharing
- Douyin: Quick seeding and e-commerce
```

**Combination 2**: Overseas market
```
Twitter + Instagram + TikTok
- Twitter: Real-time discussions
- Instagram: Visual content
- TikTok: Short video reviews
```

**Value**:
- Cross-validate findings
- Avoid platform bias
- More comprehensive user insights

---

## AI Research Data Sources (Non-Social Media)

### Core Source: 300K+ AI Persona Library

**AI personas are not real-time scraped from social media, but pre-built**:

**Persona Sources**:
1. **Real Interview Transcripts**:
   - Real users' interview content
   - Genuine attitudes, opinions, decision processes
   - Converted into structured AI personas

2. **Real User Profiles**:
   - Demographic information
   - Psychological characteristics
   - Behavioral patterns

3. **Social Media Scanning Generation**:
   - Scout → Generate custom personas
   - Built based on real user content

**AI Persona Quality**:
- Custom Personas: Consistency reaches 85 points (exceeds real human baseline 81 points, built from social media scanning/interview transcripts)
- Public Persona Library: Consistency reaches 80 points (close to real human baseline 81 points, built from general profiles)
- Temporary Generation: For quick validation

---

### Interview/Discussion Doesn't Depend on Social Media

**Difference**:

```
Social Media Scanning:
- Real-time scan social media
- Extract real user content
- Generate demographic profile and AI personas

AI Interview/Discussion:
- Use existing AI persona library
- AI personas simulate real user feedback
- Don't depend on social media real-time data
```

**Example**:

```
Scenario: Test sparkling coffee new product

Step 1: Social Media Scanning (Uses social media)
- Scan Xiaohongshu/Douyin discussing sparkling coffee
- Generate demographic profile + 3 custom AI personas

Step 2: AI Interview (Doesn't use social media)
- Use 3 AI personas for deep conversations
- AI personas answer based on own persona background
- Won't check social media real-time data
```

---

## Data Privacy and Security

### Only Scan Public Content

**Social Media Scanning**:
- ✅ Only scan publicly available social media content
- ❌ Don't access any private information
- ❌ Don't access account private messages or private content

**Public Content Definition**:
- Xiaohongshu public posts
- Douyin public content
- Other social platform public content
- Other platforms' publicly posted content

---

### Don't Store Original Personal Information

**Processing Flow**:
```
Step 1: Scan public content
- Extract content: User-posted text, images (no personal identity info)

Step 2: AI analysis
- Extract opinions, attitudes, behavioral patterns
- Don't record specific user IDs or accounts

Step 3: Generate insights
- Output: Demographic profile, behavioral patterns
- Don't output: Specific user identity information
```

**Example**:

```
❌ Won't Record:
- "@Zhang San says: I like coffee"
- "Xiaohongshu user ID: 123456"

✅ Will Extract:
- "Young women users discussing coffee frequently mention 'appearance' and 'photo-worthy'"
- "Price acceptance: ¥25-28 optimal"
```

---

### Complies with Platform Policies

**Compliance**:
- ✅ Follow each platform's crawler policies
- ✅ Only access public APIs or public pages
- ✅ Don't violate any platform's user agreements

---

## Real-Time and Data Freshness

### Real-Time Scanning

**Social Media Scanning**:
- Scan latest social media content
- Not historical database
- Reflects current user attitudes

**Example**:

```
January 2026 Scanning:
- Discovered "emotional value" becoming new selling point for healthy snacks
- This is latest trend, industry reports may not cover yet

vs Traditional Industry Reports:
- Usually lag 3-6 months
- May miss latest trends
```

---

### Regular Update Recommendations

**Market is Changing**:
- Recommend re-scan every 3-6 months
- Discover trend changes
- Adjust strategy promptly

**Example**:

```
October 2025 Scanning:
- Healthy snack users focus on "low sugar low fat"

January 2026 Re-Scan:
- Users start focusing on "emotional value" and "healing feeling"
- Trend shift: Functional health → Emotional health

Recommendation:
- Adjust product positioning and marketing strategy
```

---

## FAQ

### Q1: Will All Platforms Be Scanned Simultaneously?

**No**, select based on task:

**Default**: AI recommends 2-3 platforms based on demographic characteristics
**Manual Specification**: Can specify specific platforms

**Example**:

```
Scanning Target: "25-35 year old women's attitudes toward healthy snacks"

AI Recommends:
- Xiaohongshu (Primary): Young women gathering place
- Douyin (Secondary): Quick seeding
- Douyin (Optional): FMCG seeding

Reason:
- Xiaohongshu users best match
- Douyin broader coverage, good seeding effect
- Douyin can supplement lower-tier market perspective
```

---

### Q2: Can Scan Only Specific Regional Users?

**Yes**:

**Setting Method**:
```
Scanning Target: "Users in Chengdu region discussing coffee consumption"

Scout will:
- Focus on users in Chengdu region
- Analyze regional characteristics
- Output Chengdu user profile
```

**Supported Regional Filtering**:
- First-tier cities (Beijing, Shanghai, Guangzhou, Shenzhen)
- New first-tier cities (Chengdu, Hangzhou, Wuhan, etc.)
- Provinces (Sichuan, Zhejiang, etc.)
- Overseas regions (USA, Europe, etc.)

---

### Q3: Will Social Media Scanning Content Expire?

**Yes**:

**Reason**:
- Social media content changes in real-time
- User attitudes evolve over time
- Market trends constantly update

**Recommendation**:
- Re-Scout after 3-6 months
- Or re-scan at key points (before product launch, after major market changes)

---

### Q4: Can Scan Historical Data?

**Currently Not Supported**:
- Scan latest real-time content
- Don't support specifying historical time periods

**Alternative Solution**:
- If need historical trend analysis → Use traditional social listening tools
- Scout focuses: Current user attitudes and latest trends

---

### Q5: Will AI Interview/Discussion Check Social Media in Real-Time?

**No**:

**AI Persona Answers Based On**:
- Persona's own background and characteristics
- Won't check social media in real-time

**Example**:

```
Ask AI persona in Interview: "Would you buy ¥18 sparkling coffee?"

AI Persona (Linda, price sensitive):
- Answers based on persona background: "Probably not, bit expensive. I usually buy ¥12 Americano"
- Won't check what others say on social media

Difference:
- Scout: Scan real users on social media
- Interview: AI persona answers based on own characteristics
```

---

## Final Takeaway

> "Social media scanning supports 10 social media platforms (Domestic 6 + Overseas 4), scans public content.
> AI Interview/Discussion uses 300K+ AI persona library, doesn't depend on social media real-time data."

**Remember**:
- ✅ Scout supported platforms: Xiaohongshu, Douyin, Twitter, Instagram, TikTok
- ✅ Choose platforms by demographics and product type
- ✅ Recommend 2-3 platforms for cross-validation
- ✅ Only scan public content, no privacy concerns
- ✅ AI Interview/Discussion doesn't depend on social media, uses AI persona library
- ✅ Regularly re-scan (every 3-6 months)

---

**Related Feature**: Social Media Scanning
**Document Version**: v2.1
**Update Date**: 2026-02-02
**Update Notes**: Updated terminology and platform information
