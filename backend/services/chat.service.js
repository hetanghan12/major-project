/**
 * Chat Service
 * ============
 * Handles Firestore operations for AI chat history.
 * 
 * Structure:
 * - users/{userId}/chats/{chatId}
 *   - fields: title, createdAt, updatedAt
 *   - subcollection: messages
 *     - fields: role, content, createdAt
 * 
 * @author College Project
 */

const { getFirestore } = require('../config/firebase.config');

/**
 * Create a new chat session for a user
 * @param {string} userId - User ID
 * @param {string} title - Chat title
 */
async function createChat(userId, title) {
    const db = getFirestore();
    const chatRef = db.collection('users').doc(userId).collection('chats').doc();
    
    const now = new Date().toISOString();
    const chatData = {
        chatId: chatRef.id,
        title: title || 'New Chat',
        createdAt: now,
        updatedAt: now,
        lastMessage: '' // Initialize lastMessage for new chats
    };

    await chatRef.set(chatData);
    return chatData;
}

/**
 * Add a message to a chat session
 * @param {string} userId - User ID
 * @param {string} chatId - Chat ID
 * @param {Object} message - { role: 'user' | 'assistant', content: string }
 */
async function addMessage(userId, chatId, message) {
    const db = getFirestore();
    const chatRef = db.collection('users').doc(userId).collection('chats').doc(chatId);
    const messagesRef = chatRef.collection('messages');
    
    const now = new Date().toISOString();
    const messageData = {
        role: message.role,
        content: message.content,
        createdAt: now
    };

    // Use a batch or multiple writes to update the chat's updatedAt timestamp too
    const batch = db.batch();
    
    // 1. Add the message
    const newMessageRef = messagesRef.doc();
    batch.set(newMessageRef, messageData);
    
    // 2. Update chat timestamp AND save last message preview
    batch.update(chatRef, { 
        updatedAt: now,
        lastMessage: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : '')
    });

    await batch.commit();
    return { id: newMessageRef.id, ...messageData };
}

/**
 * Get chats for a user with pagination
 * @param {string} userId - User ID
 * @param {number} limit - Number of chats to load
 * @param {string} lastChatId - ID of the last loaded chat for pagination
 */
async function getUserChats(userId, limit = 20, lastChatId = null) {
    const db = getFirestore();
    let query = db.collection('users').doc(userId)
        .collection('chats')
        .orderBy('updatedAt', 'desc')
        .limit(limit);

    if (lastChatId) {
        const lastDoc = await db.collection('users').doc(userId)
            .collection('chats').doc(lastChatId).get();
        if (lastDoc.exists) {
            query = query.startAfter(lastDoc);
        }
    }

    const snapshot = await query.get();

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

/**
 * Get messages from a specific chat
 * @param {string} userId - User ID
 * @param {string} chatId - Chat ID
 * @param {number} limit - Optional count of messages to return (latest messages)
 */
async function getChatMessages(userId, chatId, limit = 50) {
    const db = getFirestore();
    let query = db.collection('users').doc(userId)
        .collection('chats').doc(chatId)
        .collection('messages')
        .orderBy('createdAt', 'desc');

    if (limit) {
        query = query.limit(limit);
    }

    const snapshot = await query.get();

    // Map and reverse to get chronological order (asc)
    const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    })).reverse();

    return messages;
}

/**
 * Delete a chat session and all its messages
 * @param {string} userId - User ID
 * @param {string} chatId - Chat ID
 */
async function deleteChat(userId, chatId) {
    const db = getFirestore();
    const chatRef = db.collection('users').doc(userId).collection('chats').doc(chatId);
    
    // Note: In a production environment with many messages, 
    // you should use a recursive delete or a cloud function.
    // For small/medium chats, we can delete the subcollection messages manually.
    const messagesSnapshot = await chatRef.collection('messages').get();
    const batch = db.batch();
    
    messagesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });
    
    batch.delete(chatRef);
    
    await batch.commit();
}

module.exports = {
    createChat,
    addMessage,
    getUserChats,
    getChatMessages,
    deleteChat
};
