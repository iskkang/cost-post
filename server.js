const express = require('express');
const { fetchRecords } = require('./airtable/airtable'); // Airtable 모듈 가져오기
const cors = require('cors');
const Airtable = require('airtable');
const app = express();
const dotenv = require('dotenv');
dotenv.config();

const port = process.env.PORT || 3000;

app.use(cors());

// Airtable 설정
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// /api/tickets 엔드포인트 추가
app.get('/api/tickets', async (req, res) => {
  const { pol, pod, type } = req.query;

  // Airtable 필터 공식 (출발지, 도착지, 타입에 따른 필터)
  const filterFormula = `AND({POL} = '${pol}', {POD} = '${pod}', {Type} = '${type}')`;

  try {
    // Airtable에서 레코드 가져오기
    const records = await base('tcr').select({
      filterByFormula,
      view: "Grid view"
    }).firstPage();

    // 데이터가 없을 경우 처리
    if (records.length === 0) {
      return res.status(404).json({ error: '해당 조건에 맞는 데이터가 없습니다.' });
    }

    const tickets = records.map(record => ({
      pol: record.get('POL'),
      pod: record.get('POD'),
      type: record.get('Type'),
      cost: record.get('Cost'),
      time: record.get('T/time'),
      route: record.get('Route'),
    }));

    res.json(tickets);  // 티켓 데이터 반환
  } catch (error) {
    console.error('Airtable API error:', error.message);
    console.error('Airtable API stack:', error.stack);
    res.status(500).json({ error: '서버 요청 중 오류가 발생했습니다.' });
  }
});


// 루트 경로: 접속 성공 메시지 반환
app.get('/', (req, res) => {
  res.send('접속 성공');
});

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

// 서버 실행
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
