const express = require('express');
const cors = require('cors');
const { fetchRecords } = require('./airtable/airtable.js'); 
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// CORS 설정
app.use(cors());

// Airtable 설정
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// Airtable 데이터 테스트 엔드포인트
app.get('/api/test', async (req, res) => {
  try {
    // Airtable의 'tcr' 테이블에서 모든 데이터를 가져오는 테스트
    const records = await fetchRecords('tcr', '');
    res.json(records);  // 성공 시 데이터 반환
  } catch (error) {
    res.status(500).json({ error: 'Airtable API error' });
  }
});

// /api/tickets 엔드포인트 추가
app.get('/api/tickets', async (req, res) => {
  const { pol, pod, type } = req.query;

  // Airtable 필터 공식
  const filterFormula = `AND({POL} = '${pol}', {POD} = '${pod}', {Type} = '${type}')`;

  try {
    // fetchRecords를 사용하여 Airtable 데이터 조회
    const records = await fetchRecords('tcr', filterFormula);

    // 데이터가 없을 경우 처리
    if (records.length === 0) {
      return res.status(404).json({ error: '해당 조건에 맞는 데이터가 없습니다.' });
    }

    res.json(records);  // 조회된 데이터 반환
  } catch (error) {
    console.error('Airtable API error:', error.message);
    res.status(500).json({ error: 'Airtable API 요청 중 오류가 발생했습니다.', details: error.message });
  }
});

// 서버 시작
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
