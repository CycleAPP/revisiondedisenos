import fetch from 'node-fetch';

const API_URL = 'http://127.0.0.1:4040/api';

async function main() {
    // 1. Login
    console.log("Logging in...");
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@demo.com', password: 'admin' })
    });
    const loginData = await loginRes.json();
    if (!loginData.ok) {
        console.error("Login failed:", loginData);
        return;
    }
    const token = loginData.data.token;
    console.log("Logged in. Token obtained.");

    // 2. Find an assignment to approve
    // We'll list reviews and pick one, or just list assignments
    const reviewsRes = await fetch(`${API_URL}/review`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const reviewsData = await reviewsRes.json();
    if (!reviewsData.ok) {
        console.error("Failed to list reviews:", reviewsData);
        return;
    }

    const reviews = reviewsData.data || [];
    console.log(`Found ${reviews.length} reviews.`);

    // Find one that is NOT approved yet
    const target = reviews.find(r => r.leaderStatus !== 'APPROVED');

    if (!target) {
        console.log("No pending reviews found to approve. Creating a dummy one or picking an existing approved one to re-approve.");
        // If none, just pick the first one if exists
        if (reviews.length > 0) {
            console.log(`Picking review ${reviews[0].id} (Status: ${reviews[0].leaderStatus}) to re-approve.`);
            await approve(reviews[0].id, token);
        } else {
            console.log("No reviews available at all.");
        }
    } else {
        console.log(`Approving review ${target.id} (Current Status: ${target.leaderStatus})...`);
        await approve(target.id, token);
    }
}

async function approve(id, token) {
    const res = await fetch(`${API_URL}/review/${id}/leader-approve`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: "Approved via test script" })
    });

    const data = await res.json();
    console.log("Approve response:", res.status, data);
}

main();
