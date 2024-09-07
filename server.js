const express = require('express');
const cors = require('cors');
const Airtable = require('airtable');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// CORS 설정
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
      filterByFormula: filterFormula,  // 필터 공식을 직접 사용
      view: "Grid view"
    }).firstPage();

    // 데이터가 없을 경우 처리
    if (records.length === 0) {
      return res.status(404).json({ error: '해당 조건에 맞는 데이터가 없습니다.' });
    }

    // 레코드를 매핑하여 필요한 데이터 반환
    const tickets = records.map(record => ({
      pol: record.get('POL'),
      pod: record.get('POD'),
      type: record.get('Type'),
      cost: record.get('Cost'),
      time: record.get('T/Time'),  // 필드 이름 수정
      route: record.get('Route'),
    }));

    res.json(tickets);  // 필터된 데이터 반환
  } catch (error) {
    // 오류 메시지 출력
    console.error('Airtable API error:', error.message);
    console.error('Airtable API stack:', error.stack);
    res.status(500).json({ error: 'Airtable API 요청 중 오류가 발생했습니다.', details: error.message });
  }
});

// 서버 시작
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
