import fs from 'fs';

const mockAIResponseTokens = `
<thinking>
1. 發現了關於防火等級的文件
2. 需要擷取相關規格。
</thinking>
<result>
\`\`\`json
{
  "docType": "Specific",
  "detectedEquipment": "防火門",
  "specEntries": [
    {"category": "安全規範", "content": "防火時效應達 120 分鐘以上"}
  ],
  "fullJsonData": {"summary": "防火設計說明", "keywords": ["防火"]}
}
\`\`\`
</result>
`;

      const resultMatch = mockAIResponseTokens.match(/<result>([\s\S]*?)<\/result>/);
      let cleanJson = resultMatch ? resultMatch[1] : mockAIResponseTokens;
      cleanJson = cleanJson.replace(/```json|```/g, '').trim();
      
      let parsed: any;
      try {
        parsed = JSON.parse(cleanJson);
        console.log("Parsed JSON successfully:", parsed);
      } catch (err) {
        console.error("Failed to parse JSON", err);
      }
