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

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log('Environment variables:');
  console.log('AIRTABLE_API_KEY:', process.env.AIRTABLE_API_KEY ? 'Set' : 'Not set');
  console.log('AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID ? 'Set' : 'Not set');
});
