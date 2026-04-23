# TUC Procurement Specs & Knowledge Base - User Manual

Welcome to the TUC Intelligent Procurement Specification System. This manual will guide you through the core functions to achieve efficient and standardized specification creation.

---

## 1. Gemini API Key Configuration (Crucial Step)
This system operates on a **BYOK (Bring Your Own Key)** model, ensuring efficient data processing and privacy.

### Why Use the Free Tier?
- **Zero Cost**: Apply via Google AI Studio for free, perfect for daily operations.
- **High Performance**: Powerful technical specification parsing and multi-language translation.
- **Importance**: Without an API Key, you cannot use AI Auto-Generation, Deep Parsing, or the "Instant Translation Export" feature.

### How to Set Up
1. Go to **[Google AI Studio](https://aistudio.google.com/app/apikey)**.
2. Log in and click **"Create API key"**, then copy it.
3. Click the **(Settings ⚙️)** icon in the top right, paste the key, and save.

---

## 2. File Operations & Uploads
In the **(File Options 📁)** area at the top of the interface, you can:

- **(Import 📂) Load Local JSON**: Import previously saved specification drafts.
- **(Export 💾) Export JSON**: Export completed specs as JSON for future editing.
- **(Upload 📤) Upload for Parsing**: Upload PDF/Word files to the cloud knowledge base. The system will automatically run "AI Deep Parsing" in the background to structure raw content into a searchable technical library.

---

## 3. Dashboard & Resource Monitoring
Click **(Dashboard 📊)** in the top left to enter the real-time monitoring interface:

- **Parsing Progress**: Real-time tracking of file status (Pending, Parsing, Completed, Failed).
- **Resource Levels**: Monitor total knowledge entries and cloud storage usage.
- **Auto-Sync**: Dashboard data updates automatically as parsing tasks finish.

---

## 4. Main Editor: AI Suggestion & Reference Tips
Utilize the **AI Assistant Panel** on the right while filling in specs:

- **Precision Matching**: Automatically matches historical records based on "Equipment Name" or technical regulations based on "Requirement Description."
- **Threshold Adjustment (Threshold ⚡)**: Increase for high-precision suggestions; decrease for a broader range of references.
- **One-Click Apply**: Click **(Apply ➕)** next to a suggestion to fill it directly into the field, saving typing time.

---

## 5. Preview & Multi-Language PDF Export
Click **(Show Preview 👁️)** to enter the official specification preview mode:

- **Language Selection**: Choose between "Traditional Chinese, English, Simplified Chinese, and Thai" next to the export button.
- **Instant Translation Export**: If you select a language different from your current editor language, the system triggers **AI Instant Translation** and generates a PDF in the target language.
- **Auto-Pagination**: Exported PDFs are automatically optimized for multi-page layouts and font formatting.

---

## 6. Cloud History & Maintenance
The **(Cloud History ☁️)** at the bottom is the core of the system's knowledge:

- **Force Reparse**: If the parsed content is insufficient, check the file and click **(Repeat 🔄)** to force AI to re-scan deeply.
- **Resource Cleanup**: Use **(Delete 🗑️)** for old files to free up database space and reduce storage costs.
- **Multi-Language Lookup**: The history viewer automatically translates filenames based on your UI language for global collaboration.

---
*Version: V18.8 | Update Date: 2026-04-23 | Tech Support: Dr. Barret Lin*
