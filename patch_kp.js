const fs = require('fs');
const file = 'src/lib/knowledgeParser.ts';
let code = fs.readFileSync(file, 'utf8');

// Update function signature
code = code.replace(
  /export const processFileToKnowledge = async \(file: File, apiKey\?: string, equipmentName\?: string, overrideDocId\?: string\) => \{/,
  'export const processFileToKnowledge = async (file: File, apiKey?: string, equipmentName?: string, overrideDocId?: string, forceRebuild?: boolean) => {'
);

// Add deletion logic before inserting
const insertionPoint = `    if (!supabase) return { added: 0, skipped: 0, detectedEquipment: detectedEq };`;
const deletionLogic = `    if (!supabase) return { added: 0, skipped: 0, detectedEquipment: detectedEq };

    if (forceRebuild) {
      console.log(\`[AI Parser] 執行強制重建，刪除舊有紀錄: \${file.name}\`);
      await supabase.from('tuc_history_knowledge').delete().eq('source_file_name', file.name);
    }`;

code = code.replace(insertionPoint, deletionLogic);

fs.writeFileSync(file, code);
