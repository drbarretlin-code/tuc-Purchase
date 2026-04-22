# TUC Purchase Specification & Knowledge Base - User Manual

Welcome to the TUC Intelligent Procurement System. This manual will guide you through the core features to achieve efficient and standardized specification building.

---

## 1. Gemini API Key Configuration (Priority Step)
This system uses the **BYOK (Bring Your Own Key)** model to ensure efficient data processing and privacy.

### Why use the Free Tier?
- **Zero Cost**: Apply via Google AI Studio for free, perfect for daily operations.
- **High Performance**: Powerful technical specification parsing and multi-lingual translation capabilities.
- **Importance**: Without a Key, AI generation, Extreme Mining, and dynamic translation features will be unavailable.

### How to apply and set up?
1. Go to **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
2. After logging in, click **"Create API key"** and copy it.
3. Click the **(Settings ⚙️)** icon at the top right of the system, paste the key into the field, and save.

---

## 2. File Operations & Uploads
In the **(File Options 📁)** area at the top of the main interface, you can perform the following:

- **(Upload ☁️) Upload New Spec**: Drag and drop PDF or Docx files. The system will automatically trigger the "Extreme Mining" engine for analysis.
- **(Import 📂) Load Local JSON**: Import previously saved specification drafts to continue editing.
- **(Export 💾) Export File**: Export completed specifications as JSON for archiving and exchange.

---

## 3. Main Editor: AI Extraction & Usage Tips
When filling out technical specifications, you can utilize the **AI Assistant Panel** on the right:

- **History Data Matching**: Based on the "Equipment Name" you enter, the system automatically retrieves maintenance records for similar equipment from the cloud.
- **Technical Standards Reference**: For specific components or engineering tasks, AI recommends relevant KCG standards or industry norms.
- **Usage Tips**:
    - Adjust the **(Threshold ⚡)**: Increase the percentage for more precise matches; decrease it for broader references.
    - Click the **(Apply ➕)** button next to suggested items to fill them directly into the corresponding fields, significantly reducing typing time.

---

## 4. Preview Area & Verification
Click **(Show Preview 👁️)** in the header to enter split-screen mode:

- **Real-time Rendering**: Edits on the left are immediately reflected in the formal specification format on the right.
- **Calibration Labels**: The system marks calibrated items with a **(Check ✅)** icon.
- **PDF Generation**: Once verified, you can download the official PDF acceptance specification directly from the preview area.

---

## 5. Cloud History Inspector (Operations)
The **(Cloud History ☁️)** located in the sidebar or bottom toolbar is the system's knowledge core:

- **Status Tracking**:
    - **(Pending 🔵)**: File is in queue waiting for AI analysis.
    - **(Completed 🟢)**: Parsing complete, technical index established.
    - **(Failed 🔴)**: Parsing failed, usually due to encryption or incomplete content.
- **Force Reparse**: For failed or sparse files, select them and click **(Repeat 🔄)** to force AI into a deep scan.
- **Multi-lingual Reference**: In non-Traditional Chinese modes, the inspector dynamically translates filenames. Click a file to translate its technical content into the current language and import it into the form.

---
*Version: V17.6 | Tech Support: Antigravity AI*
