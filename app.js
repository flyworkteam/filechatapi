require('dotenv').config();

const express = require('express');
const app = express();
const userRoutes = require('./routes/userRoutes');
const documentRoutes = require('./routes/documentRoutes');
const chatRoutes = require('./routes/chatRoutes');

app.use(express.json()); // Body-parser

// Route'ları bağla
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chats', chatRoutes);

const PORT = process.env.PORT || 3025;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});