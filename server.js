const express = require('express');
const cors = require('cors');
const { fetchRecords } = require('./airtable/airtable'); 
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.get('/api/test', async (req, res) => {
  console.log('Test endpoint hit');
  try {
    const records = await fetchRecords('tcr', '');
    console.log('Test records fetched:', records.length);
    res.json(records);
  } catch (error) {
    console.error('Airtable API error in test endpoint:', error);
    res.status(500).json({ error: 'Airtable API error', details: error.message });
  }
});

app.get('/api/tickets', async (req, res) => {
  const { pol, pod, type } = req.query;
  console.log('Received Query Parameters:', { pol, pod, type });

  if (!pol || !pod || !type) {
    console.log('Missing query parameters');
    return res.status(400).json({ error: '모든 쿼리 파라미터(pol, pod, type)가 필요합니다.' });
  }

  const filterFormula = `AND(
    FIND(LOWER("${pol}"), LOWER({POL})) > 0,
    FIND(LOWER("${pod}"), LOWER({POD})) > 0,
    OR({Type} = "${type}", {Type} = ${type})
  )`;
  console.log('Filter formula:', filterFormula);

  try {
    console.log('Fetching records from Airtable...');
    const records = await fetchRecords('tcr', filterFormula);
    console.log('Records fetched:', records.length);
    if (records.length === 0) {
      console.log('No matching records found');
      return res.status(404).json({ error: '해당 조건에 맞는 데이터가 없습니다.' });
    }
    res.json(records);
  } catch (error) {
    console.error('Airtable API error in tickets endpoint:', error);
    res.status(500).json({ error: 'Airtable API 요청 중 오류가 발생했습니다.', details: error.message });
  }
});

app.get('/api/autocomplete', async (req, res) => {
  const { query, field } = req.query;
  
  if (!query || !field) {
    return res.status(400).json({ error: '쿼리와 필드 파라미터가 필요합니다.' });
  }

  try {
    let filterFormula = `SEARCH(LOWER("${query}"), LOWER({${field}})) > 0`;
    const records = await fetchRecords('tcr', filterFormula);
    
    // 중복 제거 및 최대 5개 결과 반환
    const suggestions = [...new Set(records.map(record => record.fields[field]))].slice(0, 5);
    
    res.json(suggestions);
  } catch (error) {
    console.error('Autocomplete API error:', error);
    res.status(500).json({ error: '자동완성 데이터 조회 중 오류가 발생했습니다.' });
  }
});

app.get('/api/tracing', async (req, res) => {
  const { BL } = req.query;
  
  if (!BL) {
    return res.status(400).json({ error: 'BL 번호가 필요합니다.' });
  }

 app.get('/api/tracing', async (req, res) => {
  try {
    // tracing 테이블의 모든 데이터를 가져옴 (필터 없이)
    const records = await fetchRecords('tracing', ''); // 필터 없이 모든 데이터를 가져옴

    if (records.length === 0) {
      return res.status(404).json({ error: 'Tracing 테이블에 데이터가 없습니다.' });
    }

    // tracing 테이블의 데이터를 그대로 응답
    res.json(records);
  } catch (error) {
    console.error('Tracing API error:', error);
    res.status(500).json({ error: 'Tracing 데이터 조회 중 오류가 발생했습니다.' });
  }
});

// tcr 테이블에서 특정 데이터를 가져오는 예시
app.get('/api/tcr', async (req, res) => {
  const { queryParameter } = req.query;

  try {
    // tcr 테이블에서 필터 적용하여 레코드 검색
    const filterFormula = `SEARCH("${queryParameter}", {SomeField}) > 0`; // 적절한 필터 공식 사용
    const records = await fetchRecords('tcr', filterFormula); // tcr 테이블에서 검색

    if (records.length === 0) {
      return res.status(404).json({ error: '해당 조건에 맞는 레코드를 찾을 수 없습니다.' });
    }

    res.json(records);
  } catch (error) {
    console.error('TCR API error:', error);
    res.status(500).json({ error: 'TCR 데이터 조회 중 오류가 발생했습니다.' });
  }
});

function calculateDistance(coord1, coord2) {
  // 간단한 거리 계산 함수 (Haversine 공식 사용)
  const R = 6371; // 지구의 반경 (km)
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance);
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment variables:');
  console.log('AIRTABLE_API_KEY:', process.env.AIRTABLE_API_KEY ? 'Set' : 'Not set');
  console.log('AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID ? 'Set' : 'Not set');
});
