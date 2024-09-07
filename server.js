const express = require('express');
const cors = require('cors');
const { fetchRecords } = require('./airtable/airtable'); 
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.get('/api/test', async (req, res) => {
  try {
    const records = await fetchRecords('tcr', '');
    res.json(records);
  } catch (error) {
    console.error('Airtable API error:', error);
    res.status(500).json({ error: 'Airtable API error', details: error.message });
  }
});

app.get('/api/tickets', async (req, res) => {
  const { pol, pod, type } = req.query;
  console.log('Received Query Parameters:', { pol, pod, type });

  if (!pol || !pod || !type) {
    return res.status(400).json({ error: '모든 쿼리 파라미터(pol, pod, type)가 필요합니다.' });
  }

  const filterFormula = `AND(LOWER({POL}) = LOWER("${pol}"), LOWER({POD}) = LOWER("${pod}"), {Type} = "${type}")`;

  try {
    const records = await fetchRecords('tcr', filterFormula);
    if (records.length === 0) {
      return res.status(404).json({ error: '해당 조건에 맞는 데이터가 없습니다.' });
    }
    res.json(records);
  } catch (error) {
    console.error('Airtable API error:', error);
    res.status(500).json({ error: 'Airtable API 요청 중 오류가 발생했습니다.', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
