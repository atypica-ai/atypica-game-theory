# Will My Uploaded Interview Data Be Leaked? Will Atypica Use My Data for Anything?

## Question Type
User Manual Question

---

## Quick Answer

**No leaks, not used for AI model training or other purposes.**

**Core Commitments**:
- ✅ **Complete Isolation**: Your data only accessible by you
- ✅ **No Model Training**: Won't use your data to train AI
- ✅ **No Sharing**: Won't share with third parties
- ✅ **Encrypted Storage**: Transmission and storage both encrypted
- ✅ **Deletable**: Delete your data anytime

**Simply Put**:
- Your data = Your private property
- atypica only provides storage and analysis tools
- Like a bank keeps your money, but can't use it freely

---

## Detailed Explanation

### Data Privacy Protection

#### 1. Complete Isolation Storage

**Your data only accessible by you**:

```
User A's Data:
└─ Stored in independent database partition
└─ Only User A can access
└─ User B can't see
└─ atypica employees can't see (unless you explicitly authorize)

User B's Data:
└─ Stored in independent database partition
└─ Only User B can access
└─ User A can't see

Technical Safeguards:
✅ Database-level isolation
✅ Access permission control
✅ Identity verification for every query
```

**Analogy**:
```
Like bank safety deposit boxes:
- Each customer has their own box
- Only customer can open it themselves
- Other customers can't see
- Bank employees can't open freely
```

---

#### 2. Not Used for AI Model Training

**Clear Commitment: Your data won't be used to train AI models.**

**Why It Matters?**
```
If your data trains AI:
❌ Your confidential info might be "remembered" by AI
❌ Other users might indirectly obtain your info through AI
❌ Your competitive advantage might leak

atypica's Approach:
✅ Your data only used for your own research
✅ Won't be used to improve AI models
✅ Won't be seen by other users
```

**Technical Implementation**:
```
AI Processing Flow:
1. You upload data → Stored under your account
2. AI analyzes data → Real-time processing, not saved to model
3. Generate report → Only for you, not for others

vs Wrong Approach (atypica doesn't do this):
1. You upload data → Added to AI training set
2. AI training → "Learns" your data
3. Other users use AI → May obtain your information
```

---

#### 3. Not Shared with Third Parties

**Clear Commitment: Won't share your data with any third party.**

**Won't Share**:
```
Won't share:
❌ Interview records you uploaded
❌ AI personas you created
❌ Your research content
❌ Your conversation records
❌ Your Sage expert knowledge base
❌ Any personally identifiable information
```

**Exceptions** (require your explicit consent):
```
Only exceptions:
1. Legal requirements (court subpoenas, etc.)
2. Your explicit authorization (like team sharing)
3. Anonymized data for product optimization (see below)
```

---

#### 4. Anonymized Data for Product Optimization

**Limited Anonymized Data Use**:

**Data We May Collect (Completely Anonymous)**:
```
Collected data (completely anonymous):
✅ Feature usage statistics (e.g., Scout usage count)
✅ System performance metrics (e.g., report generation time)
✅ Error logs (e.g., system bug reports)

Not collected:
❌ Your research content
❌ Files you uploaded
❌ Your conversation records
❌ Any personally identifiable information
```

**Anonymization Processing**:
```
Raw data:
User ID: 12345
Research title: Healthy snacks user needs
Uploaded file: interview-data.pdf
Research time: 2026-01-30 14:30

After anonymization:
User ID: [hash encrypted]
Research title: [deleted]
Uploaded file: [deleted]
Research time: 2026-01-30 (date only)
Feature usage: Scout 1 time

Purpose:
- Analyze feature usage
- Optimize product performance
- Impossible to reverse identify you
```

---

### Data Encryption and Security

#### 1. Transmission Encryption (TLS/SSL)

**Your data encrypted during transmission**:

```
Your device → atypica server:
✅ Uses TLS 1.3 encryption
✅ Same as banking level
✅ Prevents man-in-the-middle attacks

Analogy:
Like depositing money at bank:
- Money transported in sealed security box
- No one can open during transit
```

---

#### 2. Storage Encryption (AES-256)

**Your data encrypted on server storage**:

```
Storage method:
✅ Uses AES-256 encryption (military-grade)
✅ Database-level encryption
✅ Even if server breached, data unreadable

Analogy:
Like bank safety deposit box:
- Box has password lock
- Even if thief enters bank, can't open box
```

---

#### 3. Access Control

**Strict access permission management**:

```
Who can access your data:
✅ You: Full access rights
✅ Team members you authorize: Based on permissions (team version)
❌ Other users: Completely no access
❌ atypica employees: Default no access (unless you request tech support)

Technical safeguards:
- Identity verification for every access
- Record all access logs
- Automatic alerts for abnormal access
```

---

#### 4. Regular Security Audits

**Regular security checks**:

```
Security measures:
✅ Regular security audits (quarterly)
✅ Third-party security testing
✅ Vulnerability scanning and fixes
✅ Complies with GDPR, SOC2, etc. standards
```

---

### Data Deletion and Export

#### 1. Delete Data Anytime

**You can delete your data anytime**:

**Deletion Scope**:
```
Can delete:
✅ Single research project
✅ Single AI persona
✅ Single Sage expert
✅ Uploaded files
✅ Entire account (delete all data)

After deletion:
✅ Data immediately removed from system
✅ Completely deleted from backups after 30 days
✅ Cannot be recovered
```

**Deletion Operations**:
```
Delete single project:
Step 1: Go to "My Research"
Step 2: Select research to delete
Step 3: Click "Delete" button
Step 4: Confirm deletion

Delete account (delete all data):
Step 1: Go to "Account Settings"
Step 2: Click "Delete Account"
Step 3: Confirm deletion (irrecoverable)
Step 4: All data completely deleted after 30 days
```

---

#### 2. Export Your Data

**You can export all your data anytime**:

**Export Content**:
```
Can export:
✅ All research reports (Markdown, PDF, Word)
✅ All conversation records (JSON format)
✅ All AI personas (JSON format)
✅ All Sage expert knowledge base (Markdown)
✅ Original uploaded files

Purpose:
- Back up your data
- Migrate to other platforms
- Save offline
```

**Export Operations**:
```
Step 1: Go to "Account Settings"
Step 2: Click "Export Data"
Step 3: Select content to export
- All data
- Specific projects
Step 4: Download archive
Step 5: Extract and view
```

---

### Data Usage Transparency

#### 1. Clear Privacy Policy

**Clearly inform data usage methods**:

**Privacy Policy Key Points**:
```
We collect data:
✅ Account information (email, username)
✅ Usage data (feature usage statistics)
✅ Content you upload (research data, files)

We don't collect data:
❌ Browsing history on other websites
❌ Personal information unrelated to atypica
❌ Third-party app data

Data usage:
✅ Provide services (AI research, report generation)
✅ Product optimization (anonymized statistics)
✅ Billing management (subscription and payment)

Not used for:
❌ Training AI models
❌ Selling to third parties
❌ Marketing promotion (unless you consent)
```

**View Privacy Policy**:
- Official website: https://atypica.ai/privacy
- In product: Account Settings → Privacy Policy

---

#### 2. Data Access Logs

**You can see who accessed your data**:

**Access Logs**:
```
Can view:
✅ Login records (time, IP, device)
✅ Data access records (who accessed which data)
✅ Permission change records (team member permission changes)

Abnormal alerts:
⚠️ Remote login: Automatic reminder
⚠️ Abnormal access: Automatic alert
⚠️ Suspicious operations: Immediate notification
```

**View Method**:
```
Step 1: Go to "Account Settings"
Step 2: Click "Security Center"
Step 3: View access logs
```

---

### Team Data Management

#### Team Version Data Sharing

**How does team version manage data sharing?**

**Data Sharing Scope**:
```
Shared within team:
✅ Team persona library (all members can see)
✅ Team research projects (based on permissions)
✅ Team Sage experts (all members can use)

Isolated from other teams:
❌ Other teams can't see
❌ Personal accounts can't see (unless you're also team member)
```

**Permission Management**:
```
Admin permissions:
✅ Invite/remove members
✅ Set member permissions
✅ View all data
✅ Delete team data

Member permissions (configurable):
✅ View permission: Can view but not edit
✅ Edit permission: Can create and edit
✅ Delete permission: Can delete data

Personal data protection:
✅ Can set some research as "Private"
✅ Private research only visible to creator
✅ Even team admin can't see
```

---

#### Member Departure Handling

**Data handling after member leaves**:

**Operation Process**:
```
Member leaves:
Step 1: Admin removes member
Step 2: Member loses access to team data
Step 3: Member's personal data can be:
- Retained in team (transferred to others)
- Deleted (completely removed)

Data protection:
✅ Departed employee can't access team data
✅ Team data won't be taken away
✅ Meets enterprise data security requirements
```

---

### Compliance and Certification

#### Compliant Standards

**Data protection standards atypica complies with**:

**GDPR (EU General Data Protection Regulation)**:
```
Compliance points:
✅ Clearly inform data usage methods
✅ Users can export data
✅ Users can delete data
✅ Data breach notification mechanism
```

**SOC 2 Type II (Service Organization Control)**:
```
Compliance points:
✅ Security (encryption, access control)
✅ Availability (system stability)
✅ Confidentiality (data isolation)
✅ Regular audits
```

**ISO 27001 (Information Security Management)**:
```
Compliance points:
✅ Information security management system
✅ Risk assessment and control
✅ Regular security audits
```

---

### Data Breach Response

#### If Data Breach Occurs

**Although we make best efforts to protect data, but if breach occurs**:

**Response Measures**:
```
After breach discovered:
✅ Immediately notify affected users (within 72 hours)
✅ Detail breach scope and impact
✅ Provide response recommendations
✅ Take remedial measures
✅ Investigate causes and fix vulnerabilities

Notification methods:
✅ Email notification
✅ In-platform notification
✅ Official website announcement (if affects many users)
```

**Historical Record**:
- As of 2026-01-30, atypica has no data breach incidents

---

## Common Questions

### Q1: Can atypica employees see my data?

**Default no, unless you explicitly authorize.**

**Normal Situation**:
```
atypica employees:
❌ Can't freely view user data
❌ System has strict access control
❌ All access logged
```

**Exceptions (require your authorization)**:
```
Only accessible in these situations:
✅ You request tech support, explicitly authorize
✅ Legal requirements (court subpoena)
✅ System troubleshooting (need your consent)

Even in these cases:
- Only necessary engineers can access
- Access has time limits
- All operations logged
- Permission revoked immediately after problem solved
```

---

### Q2: Will files I upload be "remembered" by AI?

**No. AI only uses in your current research, won't "remember".**

**Technical Principle**:
```
You upload file → AI analyzes:
1. File loaded into temporary memory
2. AI analyzes content in real-time
3. Generate report
4. Temporary memory cleared

Won't:
❌ Add file content to AI training set
❌ "Remember" file content for other users
❌ Automatically call in other research
```

**Analogy**:
```
Like asking doctor questions:
- Doctor reads your medical records (temporary reading)
- Gives diagnostic advice
- Won't memorize your records
- Won't tell other patients
```

---

### Q3: Will using third-party AI models (like Claude, GPT) leak data?

**No, we have special privacy agreements.**

**Technical Safeguards**:
```
atypica uses third-party AI models:
✅ Uses enterprise API (with privacy protection agreement)
✅ Explicitly prohibit AI providers from using data to train models
✅ Data won't be saved or shared by AI providers
✅ Complies with GDPR and SOC2 standards

vs You directly use ChatGPT:
⚠️ Free version: Data may be used for training
⚠️ Plus version: 30-day retention period
⚠️ Enterprise version: Has privacy protection (but need enterprise account)
```

**Partner AI Providers' Commitments**:
- Anthropic (Claude): Enterprise API data not used for training
- OpenAI (GPT): Enterprise API data not used for training
- Google (Gemini): Enterprise API data not used for training

---

### Q4: I have a competitor also using atypica, will they see my data?

**No, completely isolated.**

**Data Isolation Mechanism**:
```
Your account:
└─ Your data (only you can access)

Competitor's account:
└─ Their data (only they can access)

Technical safeguards:
✅ Database-level isolation
✅ Strict access permission control
✅ Identity verification for every query
✅ Impossible to cross-access
```

**Analogy**:
```
Like two people both using Gmail:
- Your inbox only you can access
- Competitor's inbox only they can access
- Even both using Gmail, can't see each other's emails

Same with atypica
```

---

### Q5: After team member leaves, will data leak?

**No, we have comprehensive departure process.**

**Data Protection Measures**:
```
Member leaves:
Step 1: Admin removes member
Step 2: Member immediately loses access rights
Step 3: System clears member's login credentials
Step 4: Member can't access any team data

Additional protection:
✅ Login credentials immediately invalidated
✅ Ongoing sessions immediately terminated
✅ Mobile app automatically logs out
✅ Departed employee can't export team data (if permission settings)
```

---

### Q6: After deleting data, will it be completely deleted?

**Yes, completely deleted after 30 days.**

**Deletion Process**:
```
You delete data:
Day 0: Data marked as "deleted", you can't access
Day 1-29: Data retained in backups (in case need recovery from accidental deletion)
Day 30: Data completely deleted from all backups

After complete deletion:
✅ Cannot be recovered
✅ We also can't recover
✅ Complies with GDPR "right to be forgotten"
```

**Recovery Period**:
```
If accidentally deleted:
✅ Can request recovery within 30 days
⚠️ Cannot recover after 30 days
```

---

### Q7: Will atypica sell my data?

**Absolutely not. This is our core commitment.**

**Clear Commitment**:
```
We won't:
❌ Sell your data to any third party
❌ Sell your data to advertisers
❌ Sell your data to data brokers
❌ Commercialize your data in any form

Our business model:
✅ Subscription fees (you pay to use services)
❌ Not data monetization
```

**Why Won't Sell**:
1. **Business Model**: We profit from subscriptions, not selling data
2. **User Trust**: Selling data would lose user trust
3. **Legal Compliance**: Selling data violates GDPR and other regulations
4. **Core Values**: Protecting user privacy is our core value

---

### Q8: If atypica company shuts down, what about my data?

**We have contingency plans.**

**Contingency Measures**:
```
If atypica stops operating:
✅ Notify all users 90 days in advance
✅ Provide data export service
✅ Help users migrate to other platforms
✅ Data won't be sold or transferred to third parties

Users should:
✅ Regularly export important data
✅ Don't completely rely on single platform
✅ Keep local backups
```

**Current Status**:
- atypica operating well, with stable funding and growth
- This is just contingency planning, not imminent

---

## Last Word

> "Your data completely isolated storage, won't leak, won't be used to train AI, won't be shared with third parties.
> Transmission and storage both encrypted (banking level), can delete anytime, can export anytime.
> Complies with GDPR, SOC2, etc. standards, protects your data privacy and security."

**Remember**:
- ✅ Complete isolation: Only you can access your data
- ✅ No training AI: Won't use your data to train models
- ✅ No sharing: Won't share with third parties or sell
- ✅ Encrypted storage: Transmission and storage both encrypted (TLS + AES-256)
- ✅ Deletable: Delete anytime, completely cleared after 30 days
- ✅ Exportable: Export all your data anytime
- ✅ Compliant standards: GDPR, SOC2, ISO 27001

---

**Related Feature**: All platforms
**Document Version**: v2.1
