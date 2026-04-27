import { t } from '../lib/i18n';

export interface AIHint {
  section: 'environmental' | 'regulations' | 'safety' | 'acceptance';
  title: string;
  content: string;
  link: string;
}

export const getAIHints = (equipmentName: string, category: string, language: string): AIHint[] => {
  // 這裡模擬 AI 即時檢索邏輯，初版根據關鍵字提供預設建議
  const hints: AIHint[] = [
    {
      section: 'environmental',
      title: t('hintEnvTitle', language as any),
      content: t('hintEnvDesc', language as any).replace('${equipmentName}', equipmentName),
      link: 'https://www.moeaea.gov.tw/ecw/populace/home/Home.aspx'
    },
    {
      section: 'regulations',
      title: t('hintRegTitle', language as any),
      content: t('hintRegDesc', language as any).replace('${category}', category),
      link: 'https://law.moj.gov.tw/LawClass/LawAll.aspx?PCode=N0060014'
    },
    {
      section: 'safety',
      title: t('hintSafetyTitle', language as any),
      content: t('hintSafetyDesc', language as any),
      link: 'https://www.osha.gov.tw/'
    },
    {
      section: 'acceptance',
      title: t('hintAcceptanceTitle', language as any),
      content: t('hintAcceptanceDesc', language as any),
      link: 'https://www.pcc.gov.tw/'
    }
  ];

  return hints;
};
