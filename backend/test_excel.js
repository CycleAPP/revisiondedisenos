import fetch from 'node-fetch';
import fs from 'fs';
import FormData from 'form-data';
import * as XLSX from 'xlsx';

const API = 'http://localhost:4000';

async function run() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch(`${API}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'leader@demo.com', password: 'leader123' })
        });
        const loginData = await loginRes.json();
        if (!loginData.ok) throw new Error('Login failed');
        const token = loginData.data.token;
        console.log('Logged in. Token obtained.');

        // 2. Create Dummy Excel
        console.log('Creating dummy Excel...');
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet([{ SKU: 'SKU-TEST', Description: 'Test Item' }]);
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        XLSX.writeFile(wb, 'test.xlsx');

        // 3. Upload
        console.log('Uploading Excel...');
        const form = new FormData();
        form.append('file', fs.createReadStream('test.xlsx'));
        form.append('modelKey', 'SKU-TEST');

        const uploadRes = await fetch(`${API}/api/files/upload-excel`, {
            method: 'POST',
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            },
            body: form
        });
        const uploadData = await uploadRes.json();

        console.log('Response:', JSON.stringify(uploadData, null, 2));

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
