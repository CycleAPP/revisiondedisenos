import fetch from 'node-fetch';

async function run() {
    // 1. Login
    const loginRes = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@demo.com', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    if (!loginData.ok) {
        console.error('Login failed:', loginData);
        return;
    }
    const token = loginData.data.token;
    console.log('Login successful, token obtained.');

    // 2. Validate X03
    // The backend looks for files matching the modelKey in uploads folder if not found in DB.
    // We copied X03_Sodio2025_OL_TEST.pdf which contains "X03".
    const validateRes = await fetch('http://localhost:4000/api/validate/X03', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    const validateData = await validateRes.json();
    console.log('Validation Response:', JSON.stringify(validateData, null, 2));
}

run().catch(console.error);
