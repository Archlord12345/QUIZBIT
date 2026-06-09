import { API_BASE_URL, apiPost } from './src/utils/api';

async function testApi() {
  console.log('Testing API base URL:', API_BASE_URL);
  try {
    const response = await apiPost<{ ok: boolean }>('/api/test-gemini', {});
    console.log('API Response:', response);
  } catch (err) {
    console.error('API Error:', err);
  }
}

testApi();
