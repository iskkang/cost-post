const express = require('express');
const cors = require('cors');
const { fetchRecords } = require('./airtable/airtable'); 
const axios = require('axios');  // Axios 추가
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

//도시좌표가져오기
async function getCoordinates(cityName) {
  try {
    const cleanCityName = encodeURIComponent(cityName.trim()); // 도시 이름 정제 및 인코딩
    const response = await axios.get(`https://nominatim.openstreetmap.org/search?q=${cleanCityName}&format=json&limit=1`);

    if (response.data && response.data.length > 0) {
      const { lat, lon } = response.data[0];
      return { latitude: parseFloat(lat), longitude: parseFloat(lon) };
    }

    console.log(`도시 좌표를 찾지 못함: ${cityName}`);
    return null; // 좌표를 찾지 못한 경우
  } catch (error) {
    console.error('Nominatim API error:', error);
    return null;
  }
}

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
    const records = await fetchRecords('tracing', filterFormula);

    if (records.length === 0) {
      return res.status(404).json({ error: '해당 BL 번호에 대한 정보를 찾을 수 없습니다.' });
    }

    const tracingData = records[0].fields;
    const currentCity = tracingData['Current'];

    if (!currentCity || currentCity.trim() === "") {
      return res.status(400).json({ error: 'Current 값이 없습니다.' });
    }

    console.log(`도시 이름: ${currentCity}`);

    // Nominatim API를 사용해 좌표를 가져옴
    const coordinates = await getCoordinates(currentCity);

    if (!coordinates) {
      console.log(`Nominatim API에서 좌표를 찾지 못했습니다: ${currentCity}`);
      return res.status(404).json({ error: '도시 좌표를 찾을 수 없습니다.' });
    }

    console.log(`좌표 찾음: ${coordinates.latitude}, ${coordinates.longitude}`);

    // BL 정보와 좌표 정보를 함께 반환
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
        Current: tracingData['Current'],
        Status: tracingData['Status'],
        coordinates: coordinates
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


// 서버 실행
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment variables:');
  console.log('AIRTABLE_API_KEY:', process.env.AIRTABLE_API_KEY ? 'Set' : 'Not set');
  console.log('AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID ? 'Set' : 'Not set');
});
