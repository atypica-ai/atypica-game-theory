# Can I Upload Multiple Users' Interview Data to Create Multiple AI Personas?

## Question Type
User Manual Question

---

## Core Answer

**Yes. Supports batch import to create multiple AI personas at once.**

---

## Batch Creation Methods

### Method 1: ZIP Archive (Multiple Interview Transcripts)

**Use Case**: Have multiple interview transcript files

**Steps**:
1. Prepare interview transcript files (TXT/PDF/Word)
   ```
   Interview Transcripts/
   ├── ZhangLi_Interview.pdf
   ├── LiMing_Interview.docx
   ├── WangYue_Interview.txt
   └── ...
   ```

2. Compress into ZIP file

3. Upload to atypica:
   - Go to Persona management
   - Click "Batch Import"
   - Upload ZIP file

4. System automatically processes:
   - Creates one custom persona per file
   - Shows processing progress
   - Displays quality tips when complete

5. Review and confirm:
   - Check information completeness of each persona
   - Delete or supplement incomplete personas
   - Save to "My Persona Library"

**Limits**:
- Maximum 500 files at once
- Each file not exceeding 10MB
- ZIP total size not exceeding 100MB

---

### Method 2: Excel Batch Import (Structured Data)

**Use Case**: CRM export, survey results

**Excel Template**:
```
| ID | Name | Age | Gender | Occupation | City | Income | Values | Consumption Habits | Pain Points |
|----|------|-----|--------|------------|------|--------|--------|--------------------|-------------|
| 001| Zhang Li | 28 | Female | PM | Shanghai | 15K | Value for money | Online shopping, read reviews | Time-pressed |
| 002| Li Ming | 32 | Male | Entrepreneur | Beijing | 30K | Efficiency | Buy expensive directly | Decision paralysis |
| ... |
```

**Steps**:
1. Download Excel template
2. Fill in user data (supports 50-500 rows)
3. Upload Excel
4. System batch generates custom personas
5. Review and confirm

**Quality Recommendations**:
- Complete 7-dimension information → High-quality persona (recommended)
- Only basic information → Average quality (recommend supplementing)

---

## Processing Time

| Quantity | Method 1 (Interview Transcripts) | Method 2 (Excel) |
|----------|----------------------------------|------------------|
| 10 personas | About 5-10 minutes | About 2-3 minutes |
| 50 personas | About 20-30 minutes | About 5-10 minutes |
| 100 personas | About 40-60 minutes | About 10-15 minutes |

**Note**:
- Can leave during processing, system sends email notification when complete
- Can view processing progress

---

## Quality Management

### Information Completeness Check

System automatically checks information completeness of each persona:
- **Complete Information**: Contains complete 7-dimension information, stable quality
- **Partially Complete Information**: Missing some dimensions, recommend supplementing
- **Incomplete Information**: Only basic information, recommend supplementing or deleting

### Batch Operations

**Filter by Completeness**:
```
Filter: Complete Information
Result: Shows all personas with complete information

Operations:
- Batch save
- Batch supplement information
- Batch delete incomplete personas
```

---

## Real-World Cases

### Case 1: Restaurant Brand Member Research

**Need**: Test new dishes

**Steps**:
1. Export 500 member data from CRM (Excel)
2. Contains: Name, age, gender, consumption frequency, cuisine preferences
3. Batch upload
4. Generate 500 custom personas
5. Filter 300 personas with complete information
6. Use for new dish concept testing

**Results**:
- Feedback aligns with real customers
- Discovered need differences between high-frequency vs low-frequency customers

---

### Case 2: Consulting Company Project

**Need**: Simulate client's core users

**Steps**:
1. Client provides 20 interview transcripts (PDF)
2. Compress to ZIP and upload
3. Generate 20 custom personas
4. Good information completeness
5. Use throughout project cycle

**Advantages**:
- High research consistency
- Can repeat interviews
- Saves cost of interviewing real customers

---

## Frequently Asked Questions

### Q1: Can batch imported personas be grouped for management?

**Yes**:
- Create "folders" or "tags"
- Examples: "2024Q1 Members", "VIP Customers", "Churned Users"
- Convenient for future search and use

### Q2: Can batch imported personas be modified?

**Yes**:
- Individual modification: Go to persona detail page to edit
- Batch modification: Export to Excel, modify, then re-upload

### Q3: What if batch import fails?

**Common Causes**:
- Unsupported file format → Convert to supported format
- Corrupted file → Re-export
- File too large → Upload in batches

**System Will Display**:
- Successful: XX personas
- Failed: XX personas (with failure reasons)

---

**Related Feature**: AI Persona Three-Tier System
**Document Version**: v2.1
**Updated**: 2026-02-02
**Update Notes**: Updated terminology and platform information
