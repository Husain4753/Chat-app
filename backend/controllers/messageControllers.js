import asyncHandler from 'express-async-handler'
import Message from '../models/messageModel.js'
import User from '../models/userModel.js';
import Chat from '../models/chatModel.js';

const sendMessage = asyncHandler(async (req, res) => {
    const { content, chatId } = req.body;
    if (!content || !chatId) {
        return res.status(400).send("Invalid data parsed into the request")
    }
    let newMessage = {
        sender: req.user._id,
        content: content,
        chat: chatId
    }
    try {
        let message = await Message.create(newMessage)
        message = await message.populate('sender', "name pic")
        message = await message.populate('chat')
        message = await User.populate(message, {
            path: 'chat.users',
            select: 'name pic email'
        })
        await Chat.findByIdAndUpdate(req.body.chatId, {
            latestMessage: message
        });
        res.json(message)
    } catch (error) {
        res.status(400)
        throw new Error(error.message)
    }
})

const allMessages = asyncHandler(async (req, res) => {
    try {
        const messages = await Message.find({chat:req.params.chatId})
            .populate("sender", "name pic email")
            .populate("chat");
        res.status(200).json(messages)
    } catch (error) {
        res.status(400)
        throw new Error(error.message)
    }
})

export { sendMessage, allMessages }