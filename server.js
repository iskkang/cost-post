const express = require('express');
const cors = require('cors');
const { fetchRecords } = require('./airtable/airtable'); 
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

// Test endpoint
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

// Tickets search endpoint
app.get('/api/tickets', async (req, res) => {
  const { pol, pod, type } = req.query;
  console.log('Received Query Parameters:', { pol, pod, type });

  if (!pol || !pod || !type) {
    return res.status(400).json({ error: '모든 쿼리 파라미터(pol, pod, type)가 필요합니다.' });
  }

  const filterFormula = `AND(
    FIND(LOWER("${pol}"), LOWER({POL})) > 0,
    FIND(LOWER("${pod}"), LOWER({POD})) > 0,
    OR({Type} = "${type}", {Type} = ${type})
  )`;
  console.log('Filter formula:', filterFormula);

  try {
    const records = await fetchRecords('tcr', filterFormula);
    if (records.length === 0) {
      return res.status(404).json({ error: '해당 조건에 맞는 데이터가 없습니다.' });
    }
    res.json(records);
  } catch (error) {
    console.error('Airtable API error in tickets endpoint:', error);
    res.status(500).json({ error: 'Airtable API 요청 중 오류가 발생했습니다.', details: error.message });
  }
});

// Autocomplete endpoint
app.get('/api/autocomplete', async (req, res) => {
  const { query, field } = req.query;
  
  if (!query || !field) {
    return res.status(400).json({ error: '쿼리와 필드 파라미터가 필요합니다.' });
  }

  try {
    const filterFormula = `SEARCH(LOWER("${query}"), LOWER({${field}})) > 0`;
    const records = await fetchRecords('tcr', filterFormula);
    
    const suggestions = [...new Set(records.map(record => record.fields[field]))].slice(0, 5);
    res.json(suggestions);
  } catch (error) {
    console.error('Autocomplete API error:', error);
    res.status(500).json({ error: '자동완성 데이터 조회 중 오류가 발생했습니다.' });
  }
});

// Tracing by BL (Specific BL search)
app.get('/api/tracing', async (req, res) => {
  const { BL } = req.query;
  
  if (!BL) {
    return res.status(400).json({ error: 'BL 번호가 필요합니다.' });
  }

  try {
    console.log(`BL 번호로 레코드 검색: ${BL}`);

    // tracing 테이블에서 BL 번호로 레코드 검색
    const filterFormula = `{BL} = '${BL}'`;
    console.log(`Filter formula: ${filterFormula}`);
    
    const records = await fetchRecords('tracing', filterFormula);
    console.log(`Records fetched: ${records.length}`);

    if (records.length === 0) {
      return res.status(404).json({ error: '해당 BL 번호에 대한 정보를 찾을 수 없습니다.' });
    }

    const tracingData = records[0].fields;
    const currentCity = tracingData['Current'];
    const podCity = tracingData['POD'];

    console.log(`Current City: ${currentCity}, POD: ${podCity}`);

    // 도시 좌표 가져오기
    const currentCityCoords = await getCityCoordinates(currentCity);
    if (!currentCityCoords) {
      console.log('Current city 좌표를 찾을 수 없음');
      throw new Error('Failed to get coordinates for Current city');
    }

    const podCityCoords = await getCityCoordinates(podCity);
    if (!podCityCoords) {
      console.log('POD city 좌표를 찾을 수 없음');
      throw new Error('Failed to get coordinates for POD city');
    }

    // 거리 계산
    const distance = calculateDistance(currentCityCoords, podCityCoords);
    console.log(`Distance to POD: ${distance} km`);

    res.json({
      schedule: {
        BL: tracingData['BL'],
        Client: tracingData['Client'],
        POL: tracingData['POL'],
        POD: tracingData['POD'],
        ETD: tracingData['ETD'],
        ETA: tracingData['ETA']
      },
      currentInfo: {
        Current: currentCity,
        Status: tracingData['Status'],
        coordinates: currentCityCoords,
        distanceToPOD: distance
      }
    });
  } catch (error) {
    console.error('Tracing API error:', error);
    res.status(500).json({ error: 'Tracing 데이터 조회 중 오류가 발생했습니다.', details: error.message });
  }
});

// Tracing All (Fetch all records from tracing table)
app.get('/api/tracing_all', async (req, res) => {
  try {
    const records = await fetchRecords('tracing', ''); // 필터 없이 모든 데이터를 가져오기

    if (records.length === 0) {
      return res.status(404).json({ error: 'tracing 테이블에 데이터가 없습니다.' });
    }

    res.json(records);
  } catch (error) {
    console.error('Tracing All API error:', error);
    res.status(500).json({ error: 'Tracing 데이터를 가져오는 중 오류가 발생했습니다.' });
  }
});

// TCR 테이블에서 특정 데이터를 가져오는 예시
app.get('/api/tcr', async (req, res) => {
  const { queryParameter } = req.query;

  try {
    const filterFormula = `SEARCH("${queryParameter}", {SomeField}) > 0`; // 적절한 필터 공식 사용
    const records = await fetchRecords('tcr', filterFormula);

    if (records.length === 0) {
      return res.status(404).json({ error: '해당 조건에 맞는 레코드를 찾을 수 없습니다.' });
    }

    res.json(records);
  } catch (error) {
    console.error('TCR API error:', error);
    res.status(500).json({ error: 'TCR 데이터 조회 중 오류가 발생했습니다.' });
  }
});

// 거리 계산 함수 (Haversine 공식 사용)
function calculateDistance(coord1, coord2) {
  const R = 6371; // 지구의 반경 (km)
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c); // 거리 계산 후 반환
}

// 서버 실행
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment variables:');
  console.log('AIRTABLE_API_KEY:', process.env.AIRTABLE_API_KEY ? 'Set' : 'Not set');
  console.log('AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID ? 'Set' : 'Not set');
});
