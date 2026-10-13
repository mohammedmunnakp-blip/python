const express = require('express');
const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// REPLACE with your actual numeric Telegram User ID
const ADMIN_TELEGRAM_IDS = [123456789]; 

// Get random challenge
app.get('/api/get-challenge', async (req, res) => {
    const lang = req.query.lang || 'python';
    try {
        const snapshot = await db.collection('questions')
            .where('language', '==', lang)
            .get();
        
        if (snapshot.empty) {
            return res.status(404).json({ error: "No challenges available yet." });
        }
        
        const questions = snapshot.docs.map(doc => doc.data());
        const randomQ = questions[Math.floor(Math.random() * questions.length)];
        res.json(randomQ);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

// Admin endpoint to add questions
app.post('/api/add-question', async (req, res) => {
    const { question, language, options, correctAnswer, explanation, adminId } = req.body;

    if (!ADMIN_TELEGRAM_IDS.includes(Number(adminId))) {
        return res.status(403).json({ error: "Unauthorized admin access." });
    }

    try {
        await db.collection('questions').add({
            question,
            language,
            options,
            correctAnswer,
            explanation,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to save question." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
