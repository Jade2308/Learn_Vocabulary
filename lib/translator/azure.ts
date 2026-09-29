/**
 * Azure Translator API Client (Gói F0 - Free)
 * Dùng cho Giai đoạn 1 (Fast Lookup): dịch nhanh nghĩa tiếng Việt trong ~200-400ms.
 */

const AZURE_KEY = process.env.AZURE_TRANSLATOR_KEY || '';
const AZURE_REGION = process.env.AZURE_TRANSLATOR_REGION || '';
const AZURE_ENDPOINT = process.env.AZURE_TRANSLATOR_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';

export interface AzureTranslateResult {
  meaning_vi: string;
}

export async function translateWithAzure(text: string): Promise<string> {
  if (!AZURE_KEY) {
    throw new Error('AZURE_TRANSLATOR_KEY_MISSING');
  }

  const cleanText = text.trim();
  if (!cleanText) return '';

  const url = `${AZURE_ENDPOINT.replace(/\/$/, '')}/translate?api-version=3.0&from=en&to=vi`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Ocp-Apim-Subscription-Key': AZURE_KEY,
  };

  // Azure Cognitive Services yêu cầu Ocp-Apim-Subscription-Region nếu resource tạo theo vùng (không phải global)
  if (AZURE_REGION) {
    headers['Ocp-Apim-Subscription-Region'] = AZURE_REGION;
  }

  const body = JSON.stringify([{ Text: cleanText }]);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(4000), // Timeout 4 giây
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Azure Translator] HTTP ${response.status}:`, errText);
      throw new Error(`AZURE_TRANSLATOR_ERROR_${response.status}`);
    }

    const data = await response.json();
    if (Array.isArray(data) && data[0]?.translations?.[0]?.text) {
      return data[0].translations[0].text.trim().toLowerCase();
    }

    throw new Error('AZURE_TRANSLATOR_EMPTY_RESPONSE');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('abort') || msg.includes('timeout')) {
      throw new Error('AZURE_TRANSLATOR_TIMEOUT');
    }
    throw err;
  }
}
