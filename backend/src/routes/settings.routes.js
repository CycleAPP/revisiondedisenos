import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { getStrictness, setStrictness } from '../services/settings.service.js';

const router = Router();

// GET /api/settings/ai-strictness
router.get('/ai-strictness', auth, (req, res) => {
    const level = getStrictness();
    res.json({ ok: true, strictness: level });
});

// POST /api/settings/ai-strictness (Leader/Admin only)
router.post('/ai-strictness', auth, (req, res) => {
    const { role } = req.user;
    if (role !== 'LEADER' && role !== 'ADMIN') {
        return res.status(403).json({ ok: false, message: 'Unauthorized' });
    }

    const { strictness } = req.body;
    if (!strictness) {
        return res.status(400).json({ ok: false, message: 'Missing strictness value' });
    }

    try {
        const newLevel = setStrictness(strictness);
        res.json({ ok: true, strictness: newLevel });
    } catch (e) {
        res.status(500).json({ ok: false, message: 'Failed to save settings' });
    }
});

export default router;
